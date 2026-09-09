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
const TEMPLATE_SIZES_AT_REFERENCE = [34, 37];
const MATCH_THRESHOLD = 0.52;
const COARSE_THRESHOLD = 0.36;
const NICKNAME_CONFIDENCE_THRESHOLD = 55;
const NICKNAME_STABLE_FRAME_COUNT = 2;
const NICKNAME_CANVAS_SCALE = 4;
const NICKNAME_PRIMARY_THRESHOLD = 90;
const NICKNAME_FALLBACK_THRESHOLD = 150;
const NICKNAME_SHIFTED_THRESHOLD = 120;
const NICKNAME_SHIFTED_Y = 0.003;
const NICKNAME_MAX_COLOR_SPREAD = 40;

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
  context.putImageData(pixels, 0, 0);
  return canvas;
};

export const expandRaidOcrCandidates = (text: string): readonly string[] => {
  const candidates = [text];
  const koreanCorrection = text
    .replace(/[대데테]/g, '레')
    .replace(/^한웅/, '환웅')
    .replace(/^내콤/, '새콤');
  if (koreanCorrection !== text) candidates.push(koreanCorrection);

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
  return candidates.filter((candidate) => normalizeRaidNickname(candidate) != null);
};

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
    const observations: NicknameObservation[] = [];
    for (const occupied of occupiedSlots) {
      if (!occupied.className) continue;
      const results = await Promise.all([
        worker.recognize(createNicknameCanvas(frame, occupied.slot)),
        worker.recognize(createNicknameCanvas(frame, occupied.slot, NICKNAME_FALLBACK_THRESHOLD)),
      ]);
      let candidateScores = results
        .map((result) => ({
          text: result.data.confidence >= NICKNAME_CONFIDENCE_THRESHOLD
            ? normalizeRaidNickname(result.data.text)
            : null,
          confidence: result.data.confidence,
        }))
        .filter((candidate): candidate is { text: string; confidence: number } => candidate.text != null);
      if (candidateScores.length === 0) {
        const shiftedResult = await worker.recognize(createNicknameCanvas(
          frame,
          occupied.slot,
          NICKNAME_SHIFTED_THRESHOLD,
          NICKNAME_SHIFTED_Y,
        ));
        const shiftedText = shiftedResult.data.confidence >= NICKNAME_CONFIDENCE_THRESHOLD
          ? normalizeRaidNickname(shiftedResult.data.text)
          : null;
        if (shiftedText) {
          candidateScores = [{ text: shiftedText, confidence: shiftedResult.data.confidence }];
        }
      }
      candidateScores.sort((left, right) => right.confidence - left.confidence);
      const candidates = Array.from(new Set(candidateScores.flatMap(({ text }) => {
        const withoutLeaderMark = text.replace(/(?:[Ww]+|We|뽀|쁘)$/i, '');
        const baseCandidates = normalizeRaidNickname(withoutLeaderMark) && withoutLeaderMark !== text
          ? [text, withoutLeaderMark]
          : [text];
        return baseCandidates.flatMap(expandRaidOcrCandidates);
      })));
      if (candidates.length === 0) {
        this.stableNicknames.delete(occupied.slot);
        continue;
      }
      const signature = candidates.join('|');
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
