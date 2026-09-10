import type { Mat } from '@techstark/opencv-js';
import { RAID_CLASS_ICON_TEMPLATES, type RaidClassIconTemplate } from '../../data/raidClassIcons';
import { validateRecognitionFrame } from '../screen-recognition/frame';
import { getOpenCv, type OpenCv } from '../screen-recognition/openCvLoader';
import { OcrWorkerPool, type OcrWorker } from '../screen-recognition/ocrWorkerPool';
import { matchMultiScaleTemplate } from '../screen-recognition/templateMatching';
import type { FrameRecognizer } from '../screen-recognition/types';
import {
  mapMatchesToSlots,
  normalizeRaidNickname,
  RAID_RECOGNITION_REFERENCE,
  RAID_SLOT_ICON_BOXES,
  RAID_SLOT_NICKNAME_BOXES,
  type ClassIconMatch,
  type NicknameObservation,
  type NormalizedBox,
  type RaidFrameObservation,
} from './recognition';

const TEMPLATE_CANVAS_SIZE = 100;
const TEMPLATE_SIZES_AT_REFERENCE = [34, 35, 36, 37];
const MATCH_THRESHOLD = 0.52;
const COARSE_THRESHOLD = 0.36;
const NICKNAME_CONFIDENCE_THRESHOLD = 55;
const LOSTARK_NICKNAME_CONFIDENCE_THRESHOLD = 45;
const LOSTARK_OCR_CORE_PATH = '/tesseract-core/tesseract-core-simd-lstm.wasm.js';
const NICKNAME_STABLE_FRAME_COUNT = 2;
const NICKNAME_CANVAS_SCALE = 4;
const NICKNAME_PRIMARY_THRESHOLD = 90;
const NICKNAME_FALLBACK_THRESHOLD = 150;
const NICKNAME_SHIFTED_THRESHOLD = 120;
const NICKNAME_SHIFTED_Y = 0.003;
const NICKNAME_MAX_COLOR_SPREAD = 40;
const NICKNAME_NATIVE_PADDING = 2;
const NICKNAME_SHORT_WORD_VARIANT = {
  threshold: 170,
  scale: 4,
  trim: true,
  pixelOffsetX: -3,
  pixelOffsetY: -3,
} as const;
const NICKNAME_PRIMARY_NATIVE_VARIANTS = [
  { threshold: 110, scale: 4, trim: false, pixelOffsetX: -2, pixelOffsetY: -2 },
  { threshold: 110, scale: 6, trim: false, pixelOffsetX: 0, pixelOffsetY: 0 },
  { threshold: 140, scale: 6, trim: false, pixelOffsetX: 0, pixelOffsetY: 0 },
] as const;
const NICKNAME_FALLBACK_NATIVE_VARIANTS = [
  { threshold: 150, scale: 4, trim: false, pixelOffsetX: 0, pixelOffsetY: 0 },
  { threshold: 70, scale: 6, trim: false, pixelOffsetX: 0, pixelOffsetY: 0 },
  { threshold: 140, scale: 6, trim: true, pixelOffsetX: 0, pixelOffsetY: 0 },
] as const;

const templateCanvasCache = new Map<string, Promise<HTMLCanvasElement>>();

export const normalizeClassIconPixels = (imageData: ImageData): ImageData => {
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] <= 16) {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
    } else {
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = 255;
    }
  }
  return imageData;
};

const loadTemplateCanvas = async (template: RaidClassIconTemplate): Promise<HTMLCanvasElement> => {
  const cached = templateCanvasCache.get(template.url);
  if (cached) return cached;

  const loading = (async () => {
    const response = await fetch(template.url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`${template.className} 직업 아이콘을 불러오지 못했습니다.`);
    const objectUrl = URL.createObjectURL(await response.blob());
    const image = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`${template.className} 직업 아이콘을 해석하지 못했습니다.`));
        image.src = objectUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = TEMPLATE_CANVAS_SIZE;
      canvas.height = TEMPLATE_CANVAS_SIZE;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('직업 아이콘 템플릿을 준비할 수 없습니다.');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      context.putImageData(normalizeClassIconPixels(pixels), 0, 0);
      return canvas;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  })();
  templateCanvasCache.set(template.url, loading);
  try {
    return await loading;
  } catch (error) {
    templateCanvasCache.delete(template.url);
    throw error;
  }
};

const pixelBox = (box: NormalizedBox, width: number, height: number) => {
  const x = Math.max(0, Math.floor(box.x * width));
  const y = Math.max(0, Math.floor(box.y * height));
  const right = Math.min(width, Math.ceil((box.x + box.width) * width));
  const bottom = Math.min(height, Math.ceil((box.y + box.height) * height));
  return { x, y, width: right - x, height: bottom - y };
};

interface PackedIconCell {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly normalizedCenterX: number;
  readonly normalizedCenterY: number;
}

interface IconPanel {
  readonly canvas: HTMLCanvasElement;
  readonly cells: readonly PackedIconCell[];
}

/**
 * 8개 직업 아이콘 ROI만 4x2 atlas로 모은다. 원본 화면의 두 열 사이 여백과
 * 파티 사이 여백을 제거해 템플릿 매칭할 픽셀 수를 줄이고 텍스트 오탐을 막는다.
 */
export const createRaidIconPanel = (frame: HTMLCanvasElement): IconPanel => {
  const boxes = RAID_SLOT_ICON_BOXES.map((box) => pixelBox(box, frame.width, frame.height));
  const padding = Math.max(4, Math.round(frame.width / RAID_RECOGNITION_REFERENCE.width * 4));
  const cellWidth = Math.max(...boxes.map((box) => box.width)) + padding * 2;
  const cellHeight = Math.max(...boxes.map((box) => box.height)) + padding * 2;
  const canvas = document.createElement('canvas');
  canvas.width = cellWidth * 4;
  canvas.height = cellHeight * 2;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('공격대 슬롯을 분석할 수 없습니다.');
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const cells = boxes.map((box, slot) => {
    const x = (slot % 4) * cellWidth + padding;
    const y = Math.floor(slot / 4) * cellHeight + padding;
    context.drawImage(frame, box.x, box.y, box.width, box.height, x, y, box.width, box.height);
    const normalizedBox = RAID_SLOT_ICON_BOXES[slot];
    return {
      x,
      y,
      width: box.width,
      height: box.height,
      normalizedCenterX: normalizedBox.x + normalizedBox.width / 2,
      normalizedCenterY: normalizedBox.y + normalizedBox.height / 2,
    };
  });
  return { canvas, cells };
};

const scaledTemplateSizes = (frameWidth: number): number[] => {
  const scale = frameWidth / RAID_RECOGNITION_REFERENCE.width;
  return Array.from(new Set(TEMPLATE_SIZES_AT_REFERENCE.map((size) => Math.max(12, Math.round(size * scale)))));
};

const getNicknameOcrWorker = (pool: OcrWorkerPool): Promise<OcrWorker> => import('tesseract.js').then(({ PSM }) => (
  pool.get({
    languages: 'kor+eng',
    parameters: {
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      preserve_interword_spaces: '0',
    },
  })
));

const getShortNicknameOcrWorker = (pool: OcrWorkerPool): Promise<OcrWorker> => import('tesseract.js').then(({ PSM }) => (
  pool.get({
    languages: 'kor+eng',
    parameters: {
      tessedit_pageseg_mode: PSM.SINGLE_WORD,
      preserve_interword_spaces: '0',
    },
  })
));

const getLostArkNicknameOcrWorker = (pool: OcrWorkerPool): Promise<OcrWorker> => import('tesseract.js').then(({ PSM }) => (
  pool.get({
    languages: 'lostark_kor',
    options: {
      langPath: '/tessdata',
      // Fine-tuned integer models require the SIMD core instead of the relaxed-SIMD build.
      corePath: LOSTARK_OCR_CORE_PATH,
    },
    parameters: {
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      preserve_interword_spaces: '0',
    },
  })
));

const binarizeNicknamePixels = (pixels: ImageData, threshold: number): void => {
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    const brightness = Math.max(red, green, blue);
    const colorSpread = brightness - Math.min(red, green, blue);
    // 닉네임은 무채색이고 공대장 왕관은 노랑/보라색이므로 색상 픽셀을 문자에서 제외한다.
    const value = brightness >= threshold && colorSpread <= NICKNAME_MAX_COLOR_SPREAD ? 255 : 0;
    pixels.data[index] = value;
    pixels.data[index + 1] = value;
    pixels.data[index + 2] = value;
    pixels.data[index + 3] = 255;
  }
};

export const createNicknameCanvas = (
  frame: HTMLCanvasElement,
  slot: number,
  threshold = NICKNAME_PRIMARY_THRESHOLD,
  normalizedYOffset = 0,
): HTMLCanvasElement => {
  const normalizedBox = RAID_SLOT_NICKNAME_BOXES[slot];
  const box = pixelBox({
    ...normalizedBox,
    y: normalizedBox.y + normalizedYOffset,
    height: normalizedBox.height - normalizedYOffset,
  }, frame.width, frame.height);
  const canvas = document.createElement('canvas');
  canvas.width = box.width * NICKNAME_CANVAS_SCALE;
  canvas.height = box.height * NICKNAME_CANVAS_SCALE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('닉네임 영역을 분석할 수 없습니다.');
  context.drawImage(frame, box.x, box.y, box.width, box.height, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  binarizeNicknamePixels(pixels, threshold);
  context.putImageData(pixels, 0, 0);
  return canvas;
};

const createNativeThresholdNicknameCanvas = (
  frame: HTMLCanvasElement,
  slot: number,
  threshold: number,
  scale: number,
  trim: boolean,
  pixelOffsetX: number,
  pixelOffsetY: number,
): HTMLCanvasElement => {
  const baseBox = pixelBox(RAID_SLOT_NICKNAME_BOXES[slot], frame.width, frame.height);
  const box = {
    ...baseBox,
    x: baseBox.x + pixelOffsetX,
    y: baseBox.y + pixelOffsetY,
  };
  const source = document.createElement('canvas');
  source.width = box.width;
  source.height = box.height;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('닉네임 영역을 분석할 수 없습니다.');
  sourceContext.drawImage(frame, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
  const pixels = sourceContext.getImageData(0, 0, source.width, source.height);
  binarizeNicknamePixels(pixels, threshold);
  sourceContext.putImageData(pixels, 0, 0);

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = source.width;
  let sourceHeight = source.height;
  if (trim) {
    let left = source.width;
    let top = source.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < source.height; y += 1) {
      for (let x = 0; x < source.width; x += 1) {
        if (pixels.data[(y * source.width + x) * 4] === 0) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    if (right >= left && bottom >= top) {
      sourceX = left;
      sourceY = top;
      sourceWidth = right - left + 1;
      sourceHeight = bottom - top + 1;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = (sourceWidth + NICKNAME_NATIVE_PADDING * 2) * scale;
  canvas.height = (sourceHeight + NICKNAME_NATIVE_PADDING * 2) * scale;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('닉네임 영역을 확대할 수 없습니다.');
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    NICKNAME_NATIVE_PADDING * scale,
    NICKNAME_NATIVE_PADDING * scale,
    sourceWidth * scale,
    sourceHeight * scale,
  );
  return canvas;
};

const NICKNAME_MAX_EXPANDED_CANDIDATES = 256;
const NICKNAME_MAX_RANKED_CANDIDATES = 128;

/** 작은 Lost Ark UI 글꼴에서 형태가 겹치는 음절군이다. 특정 닉네임이 아닌 글자 단위 후보만 만든다. */
const NICKNAME_SYLLABLE_CONFUSION_GROUPS: readonly (readonly string[])[] = [
  ['이', '미'],
  ['회', '희'],
  ['낭', '냥', '금'],
  ['샘', '생'],
  ['걷', '건', '펀', '껀', '껄', '면'],
  ['형', '혔', '혓'],
  ['퓨', '뉴', '듀', '류', '뜌'],
  ['기', '귀', '긔'],
  ['애', '예', '에', '매', '메', '배'],
  ['일', '실'],
  ['세', '계'],
  ['것', '깃', '짓', '낮', '낫', '닛', '났', '지'],
  ['양', '함', '람'],
  ['며', '여'],
  ['때', '패'],
  ['책', '섹', '첵'],
  ['슈', '츄'],
  ['응', '웅', '옹'],
  ['몸', '음'],
  ['한', '환'],
  ['내', '새'],
  ['대', '데', '테', '레'],
  ['도', '토', '트', '로'],
  ['는', '픈'],
];

const NICKNAME_SYLLABLE_ALTERNATIVES = new Map<string, readonly string[]>(
  NICKNAME_SYLLABLE_CONFUSION_GROUPS.flatMap((group) => (
    group.map((syllable) => [syllable, group.filter((candidate) => candidate !== syllable)] as const)
  )),
);

export const expandRaidOcrCandidates = (text: string): readonly string[] => {
  let expanded = [{ text: '', substitutions: 0 }];
  Array.from(text).forEach((character) => {
    const alternatives = NICKNAME_SYLLABLE_ALTERNATIVES.get(character) ?? [];
    const choices = [character, ...alternatives];
    expanded = expanded
      .flatMap((prefix) => choices.map((choice) => ({
        text: `${prefix.text}${choice}`,
        substitutions: prefix.substitutions + Number(choice !== character),
      })))
      .sort((left, right) => left.substitutions - right.substitutions)
      .slice(0, NICKNAME_MAX_EXPANDED_CANDIDATES);
  });
  const candidates = expanded.map((candidate) => candidate.text);

  if (/^[0-9OUDS]+$/i.test(text)) {
    const alternatives: Readonly<Record<string, readonly string[]>> = {
      '3': ['3', '8'],
      '5': ['5', '8'],
      O: ['O', '0'],
      U: ['U', '0'],
      D: ['D', '0'],
      S: ['S', '5', '8'],
    };
    let numericCandidates = [''];
    Array.from(text.toUpperCase()).forEach((character) => {
      numericCandidates = numericCandidates.flatMap((prefix) => (
        (alternatives[character] ?? [character]).map((alternative) => `${prefix}${alternative}`)
      ));
    });
    candidates.push(...numericCandidates.filter((candidate) => /^\d+$/.test(candidate)));
  }
  return Array.from(new Set(candidates.filter((candidate) => normalizeRaidNickname(candidate) != null)));
};

interface NicknameCandidateScore {
  readonly text: string;
  readonly confidence: number;
}

interface CharacterBeamCandidate {
  readonly text: string;
  readonly score: number;
}

const buildCharacterConsensusCandidates = (
  observations: readonly NicknameCandidateScore[],
): readonly CharacterBeamCandidate[] => {
  const koreanByLength = new Map<number, NicknameCandidateScore[]>();
  observations.forEach((observation) => {
    if (!/^[가-힣]+$/.test(observation.text)) return;
    const length = Array.from(observation.text).length;
    koreanByLength.set(length, [...(koreanByLength.get(length) ?? []), observation]);
  });

  return Array.from(koreanByLength.values()).flatMap((group) => {
    if (group.length < 2) return [];
    const length = Array.from(group[0].text).length;
    let beam: CharacterBeamCandidate[] = [{ text: '', score: 0 }];
    for (let index = 0; index < length; index += 1) {
      const characterScores = new Map<string, number>();
      group.forEach(({ text, confidence }) => {
        const character = Array.from(text)[index];
        characterScores.set(character, (characterScores.get(character) ?? 0) + confidence);
        (NICKNAME_SYLLABLE_ALTERNATIVES.get(character) ?? []).forEach((alternative) => {
          characterScores.set(alternative, (characterScores.get(alternative) ?? 0) + confidence * 0.42);
        });
      });
      const choices = Array.from(characterScores.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 10);
      beam = beam
        .flatMap((prefix) => choices.map(([character, score]) => ({
          text: `${prefix.text}${character}`,
          score: prefix.score + Math.log1p(score),
        })))
        .sort((left, right) => right.score - left.score)
        .slice(0, NICKNAME_MAX_EXPANDED_CANDIDATES);
    }
    return beam;
  });
};

export const rankRaidOcrCandidates = (
  observations: readonly NicknameCandidateScore[],
): readonly string[] => {
  const scores = new Map<string, number>();
  observations.forEach(({ text, confidence }) => {
    const sourceCharacters = Array.from(text);
    expandRaidOcrCandidates(text).forEach((candidate) => {
      const candidateCharacters = Array.from(candidate);
      const substitutions = candidateCharacters.reduce((count, character, index) => (
        count + Number(character !== sourceCharacters[index])
      ), 0);
      const weightedConfidence = confidence * (0.8 ** substitutions);
      scores.set(candidate, (scores.get(candidate) ?? 0) + weightedConfidence);
    });
  });
  buildCharacterConsensusCandidates(observations).forEach(({ text, score }) => {
    scores.set(text, (scores.get(text) ?? 0) + score * 24);
  });
  return Array.from(scores.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, NICKNAME_MAX_RANKED_CANDIDATES)
    .map(([candidate]) => candidate);
};

export const prioritizeSpecializedRaidOcrCandidate = (
  observations: readonly NicknameCandidateScore[],
): string | null => {
  if (observations.length === 0) return null;
  const byText = new Map<string, { count: number; confidence: number }>();
  observations.forEach(({ text, confidence }) => {
    const current = byText.get(text) ?? { count: 0, confidence: 0 };
    byText.set(text, { count: current.count + 1, confidence: current.confidence + confidence });
  });
  const repeated = Array.from(byText.entries())
    .filter(([, value]) => value.count >= 2)
    .sort((left, right) => right[1].confidence - left[1].confidence)[0];
  if (repeated) return repeated[0];

  const ranked = [...observations].sort((left, right) => right.confidence - left.confidence);
  return ranked.length === 1 || ranked[0].confidence - ranked[1].confidence >= 5
    ? ranked[0].text
    : null;
};

export const getRaidOcrStableSignature = (candidates: readonly string[]): string => candidates[0] ?? '';

const recognizeClasses = async (
  cv: OpenCv,
  source: Mat,
  frame: HTMLCanvasElement,
  panel: IconPanel,
): Promise<ClassIconMatch[]> => {
  const sizes = scaledTemplateSizes(frame.width);
  const matches: ClassIconMatch[] = [];

  for (const template of RAID_CLASS_ICON_TEMPLATES) {
    const templateCanvas = await loadTemplateCanvas(template);
    const classMatches = matchMultiScaleTemplate(cv, source, templateCanvas, {
      sizes,
      threshold: MATCH_THRESHOLD,
      coarseThreshold: COARSE_THRESHOLD,
      coarseScale: 0.5,
      maxMatchesPerScale: 8,
    });
    classMatches.forEach((match) => {
      const centerX = match.x + match.size / 2;
      const centerY = match.y + match.size / 2;
      const cell = panel.cells.find((candidate) => (
        centerX >= candidate.x
        && centerX <= candidate.x + candidate.width
        && centerY >= candidate.y
        && centerY <= candidate.y + candidate.height
      ));
      if (!cell) return;
      matches.push({
        className: template.className,
        x: cell.normalizedCenterX,
        y: cell.normalizedCenterY,
        confidence: match.confidence,
      });
    });
  }
  return matches;
};

export class RaidPartyFrameRecognizer implements FrameRecognizer<RaidFrameObservation> {
  private readonly ocrWorkers = new OcrWorkerPool();

  private readonly stableNicknames = new Map<number, {
    className: string;
    signature: string;
    candidates: readonly string[];
    count: number;
  }>();

  private async recognizeNicknames(
    frame: HTMLCanvasElement,
    occupiedSlots: readonly { slot: number; className: string | null }[],
  ): Promise<readonly NicknameObservation[]> {
    if (occupiedSlots.length === 0) return [];
    const worker = await getNicknameOcrWorker(this.ocrWorkers);
    const lostArkWorker = await getLostArkNicknameOcrWorker(this.ocrWorkers).catch(() => null);
    const observations: NicknameObservation[] = [];
    for (const occupied of occupiedSlots) {
      if (!occupied.className) continue;
      const [results, lostArkResults] = await Promise.all([
        Promise.all([
          worker.recognize(createNicknameCanvas(frame, occupied.slot)),
          worker.recognize(createNicknameCanvas(frame, occupied.slot, NICKNAME_FALLBACK_THRESHOLD)),
          ...NICKNAME_PRIMARY_NATIVE_VARIANTS.map(({
            threshold, scale, trim, pixelOffsetX, pixelOffsetY,
          }) => worker.recognize(createNativeThresholdNicknameCanvas(
            frame,
            occupied.slot,
            threshold,
            scale,
            trim,
            pixelOffsetX,
            pixelOffsetY,
          ))),
        ]),
        lostArkWorker
          ? Promise.all([
            lostArkWorker.recognize(createNicknameCanvas(frame, occupied.slot, 90)),
            lostArkWorker.recognize(createNicknameCanvas(frame, occupied.slot, 110)),
            lostArkWorker.recognize(createNicknameCanvas(frame, occupied.slot, 150)),
            lostArkWorker.recognize(createNicknameCanvas(frame, occupied.slot, 170)),
          ]).catch(() => [])
          : Promise.resolve([]),
      ]);
      const specializedCandidateScores = lostArkResults.map((result) => ({
        text: result.data.confidence >= LOSTARK_NICKNAME_CONFIDENCE_THRESHOLD
          ? normalizeRaidNickname(result.data.text)
          : null,
        confidence: result.data.confidence,
      })).filter((candidate): candidate is { text: string; confidence: number } => candidate.text != null);
      const specializedPriority = prioritizeSpecializedRaidOcrCandidate(specializedCandidateScores);
      let candidateScores = [
        ...results.map((result) => ({
          text: result.data.confidence >= NICKNAME_CONFIDENCE_THRESHOLD
            ? normalizeRaidNickname(result.data.text)
            : null,
          confidence: result.data.confidence,
        })),
        ...specializedCandidateScores.map((candidate) => ({
          ...candidate,
          // The fine-tuned worker is trained on the same low-resolution UI rendering used here.
          confidence: candidate.confidence * 1.5,
        })),
      ].filter((candidate): candidate is { text: string; confidence: number } => candidate.text != null);
      const shouldTryNativeFallback = candidateScores.length === 0
        || candidateScores.every(({ text }) => /^[A-Za-z]+$/.test(text));
      if (shouldTryNativeFallback) {
        const initialCandidateScores = candidateScores;
        const [shiftedResult, ...nativeResults] = await Promise.all([
          worker.recognize(createNicknameCanvas(
            frame,
            occupied.slot,
            NICKNAME_SHIFTED_THRESHOLD,
            NICKNAME_SHIFTED_Y,
          )),
          ...NICKNAME_FALLBACK_NATIVE_VARIANTS.map(({
            threshold, scale, trim, pixelOffsetX, pixelOffsetY,
          }) => worker.recognize(createNativeThresholdNicknameCanvas(
            frame,
            occupied.slot,
            threshold,
            scale,
            trim,
            pixelOffsetX,
            pixelOffsetY,
          ))),
        ]);
        const fallbackCandidateScores = [shiftedResult, ...nativeResults]
          .map((result) => ({
            text: result.data.confidence >= NICKNAME_CONFIDENCE_THRESHOLD
              ? normalizeRaidNickname(result.data.text)
              : null,
            confidence: result.data.confidence,
          }))
          .filter((candidate): candidate is { text: string; confidence: number } => candidate.text != null);
        const hasKoreanFallback = fallbackCandidateScores.some(({ text }) => /[가-힣]/.test(text));
        candidateScores = initialCandidateScores.length === 0 || hasKoreanFallback
          ? fallbackCandidateScores
          : initialCandidateScores;
      }
      const shouldTryShortWord = candidateScores.length === 0
        || candidateScores.every(({ text }) => Array.from(text).length <= 3);
      if (shouldTryShortWord) {
        const shortWorker = await getShortNicknameOcrWorker(this.ocrWorkers);
        const {
          threshold, scale, trim, pixelOffsetX, pixelOffsetY,
        } = NICKNAME_SHORT_WORD_VARIANT;
        const shortResult = await shortWorker.recognize(createNativeThresholdNicknameCanvas(
          frame,
          occupied.slot,
          threshold,
          scale,
          trim,
          pixelOffsetX,
          pixelOffsetY,
        ));
        const shortText = shortResult.data.confidence >= NICKNAME_CONFIDENCE_THRESHOLD
          ? normalizeRaidNickname(shortResult.data.text)
          : null;
        if (shortText) {
          candidateScores = [...candidateScores, { text: shortText, confidence: shortResult.data.confidence }];
        }
      }
      candidateScores.sort((left, right) => right.confidence - left.confidence);
      const rankedCandidates = rankRaidOcrCandidates(candidateScores.flatMap(({ text, confidence }) => {
        const withoutLeaderMark = text.replace(/(?:[Ww]+|We|뽀|쁘)$/i, '');
        return normalizeRaidNickname(withoutLeaderMark) && withoutLeaderMark !== text
          ? [{ text, confidence }, { text: withoutLeaderMark, confidence }]
          : [{ text, confidence }];
      }));
      const candidates = specializedPriority
        ? [specializedPriority, ...rankedCandidates.filter((candidate) => candidate !== specializedPriority)]
        : rankedCandidates;
      if (candidates.length === 0) {
        // 한 프레임의 OCR 실패 때문에 직전의 안정화 진행 상태를 초기화하지 않는다.
        continue;
      }
      const signature = getRaidOcrStableSignature(candidates);
      const previous = this.stableNicknames.get(occupied.slot);
      const count = previous?.className === occupied.className && previous.signature === signature
        ? previous.count + 1
        : 1;
      this.stableNicknames.set(occupied.slot, { className: occupied.className, signature, candidates, count });
      if (count >= NICKNAME_STABLE_FRAME_COUNT) {
        observations.push({
          slot: occupied.slot,
          text: candidates[0],
          candidates,
          confidence: (candidateScores[0]?.confidence ?? 0) / 100,
        });
      }
    }
    return observations;
  }

  async recognize(frame: HTMLCanvasElement): Promise<RaidFrameObservation> {
    validateRecognitionFrame(frame);
    const cv = await getOpenCv();
    const panel = createRaidIconPanel(frame);
    const sourceRgba = cv.imread(panel.canvas);
    let sourceRgb!: Mat;
    try {
      sourceRgb = new cv.Mat();
      cv.cvtColor(sourceRgba, sourceRgb, cv.COLOR_RGBA2RGB);
      const matches = await recognizeClasses(cv, sourceRgb, frame, panel);
      const classObservations = mapMatchesToSlots(matches);
      let nicknames: readonly NicknameObservation[] = [];
      try {
        nicknames = await this.recognizeNicknames(frame, classObservations);
      } catch {
        // OCR은 보조 기능이다. 언어 데이터 로드나 판독 실패가 직업·파티 인식을 막지 않는다.
      }
      return {
        observations: mapMatchesToSlots(matches, nicknames),
        scannedAt: Date.now(),
      };
    } finally {
      sourceRgba.delete();
      sourceRgb?.delete();
    }
  }

  async dispose(): Promise<void> {
    this.stableNicknames.clear();
    await this.ocrWorkers.dispose();
  }
}
