import type { Mat } from '@techstark/opencv-js';
import type { MaterialType } from '../../../data/enhancement';
import type {
  MaterialIconMap,
  MaterialObservation,
  RecognitionFrame,
  RecognitionMetrics,
} from './types';

const TEMPLATE_SIZES = [38, 42, 46, 50, 64, 80, 96, 112, 128];
const MATCH_THRESHOLD = 0.72;
const COARSE_MATCH_THRESHOLD = 0.5;
const COARSE_SCALE = 0.25;
const MAX_MATCHES_PER_SCALE = 4;
const MAX_OWNED_QUANTITY = 999_999_999;

type OpenCv = typeof import('@techstark/opencv-js') & {
  onRuntimeInitialized?: () => void;
};
type OpenCvMat = Mat;
type OcrWorker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>;

let openCvPromise: Promise<OpenCv> | null = null;
let numericOcrWorkerPromise: Promise<OcrWorker> | null = null;
let tooltipOcrWorkerPromise: Promise<OcrWorker> | null = null;
const templateCanvasCache = new Map<string, HTMLCanvasElement>();

const getOpenCv = (): Promise<OpenCv> => {
  if (openCvPromise) return openCvPromise;
  openCvPromise = import('./opencvModule').then(async ({ default: importedModule }) => {
    const candidate: unknown = importedModule;
    const cv = (candidate instanceof Promise ? await candidate : candidate) as OpenCv;
    if (cv.Mat) return cv;
    await new Promise<void>((resolve) => {
      cv.onRuntimeInitialized = resolve;
    });
    return cv;
  });
  return openCvPromise;
};

const getNumericOcrWorker = (): Promise<OcrWorker> => {
  if (numericOcrWorkerPromise) return numericOcrWorkerPromise;
  numericOcrWorkerPromise = import('tesseract.js').then(async ({ createWorker, PSM }) => {
    const worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789,/Xx[] ',
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      preserve_interword_spaces: '0',
    });
    return worker;
  });
  return numericOcrWorkerPromise;
};

const getTooltipOcrWorker = (): Promise<OcrWorker> => {
  if (tooltipOcrWorkerPromise) return tooltipOcrWorkerPromise;
  tooltipOcrWorkerPromise = import('tesseract.js').then(async ({ createWorker, PSM }) => {
    const worker = await createWorker('kor+eng');
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    return worker;
  });
  return tooltipOcrWorkerPromise;
};

export const materialIconRequestUrl = (url: string): string => {
  const parsed = new URL(url, window.location.origin);
  if (parsed.origin !== 'https://cdn-lostark.game.onstove.com') return url;
  return `/api/material-icon${parsed.pathname}${parsed.search}`;
};

export const fetchMaterialIcon = (url: string): Promise<Response> => (
  fetch(materialIconRequestUrl(url), { credentials: 'same-origin' })
);

const loadTemplateCanvas = async (url: string): Promise<HTMLCanvasElement> => {
  const cached = templateCanvasCache.get(url);
  if (cached) return cached;

  const response = await fetchMaterialIcon(url);
  if (!response.ok) throw new Error('재료 아이콘을 불러오지 못했습니다.');
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  try {
    if (!context) throw new Error('이미지 분석을 시작할 수 없습니다.');
    context.drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close();
  }
  templateCanvasCache.set(url, canvas);
  return canvas;
};

interface Match {
  x: number;
  y: number;
  slotSize: number;
  score: number;
}

interface TemplateMatchTiming {
  coarseMs: number;
  refineMs: number;
}

interface TemplateCropRatios {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_TEMPLATE_CROP: TemplateCropRatios = {
  x: 0.05,
  y: 0.2,
  width: 0.68,
  height: 0.68,
};

const CENTER_TEMPLATE_CROPS: TemplateCropRatios[] = [
  { x: 0.2, y: 0.15, width: 0.6, height: 0.7 },
  { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
];

export const getTemplateCropRatios = (
  rgba: ArrayLike<number>,
  width: number,
  height: number,
): TemplateCropRatios => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] <= 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return DEFAULT_TEMPLATE_CROP;
  const opaqueWidth = maxX - minX + 1;
  const opaqueHeight = maxY - minY + 1;
  if (opaqueWidth / width >= 0.75 && opaqueHeight / height >= 0.75) {
    return DEFAULT_TEMPLATE_CROP;
  }

  return {
    x: minX / width,
    y: minY / height,
    width: opaqueWidth / width,
    height: opaqueHeight / height,
  };
};

export const getTemplateCropCandidates = (
  rgba: ArrayLike<number>,
  width: number,
  height: number,
): TemplateCropRatios[] => {
  const detectedCrop = getTemplateCropRatios(rgba, width, height);
  return detectedCrop === DEFAULT_TEMPLATE_CROP
    ? [detectedCrop, ...CENTER_TEMPLATE_CROPS]
    : [detectedCrop, DEFAULT_TEMPLATE_CROP];
};

const findTemplateMatches = (
  cv: OpenCv,
  source: OpenCvMat,
  templateCanvas: HTMLCanvasElement,
  templateSizes = TEMPLATE_SIZES,
  timing?: TemplateMatchTiming,
): Match[] => {
  const templateSource = cv.imread(templateCanvas);
  const templateRgb = new cv.Mat();
  const coarseSource = new cv.Mat();
  const mask = new cv.Mat();
  const cropCandidates = getTemplateCropCandidates(
    templateSource.data,
    templateSource.cols,
    templateSource.rows,
  );
  cv.cvtColor(templateSource, templateRgb, cv.COLOR_RGBA2RGB);
  cv.resize(
    source,
    coarseSource,
    new cv.Size(Math.round(source.cols * COARSE_SCALE), Math.round(source.rows * COARSE_SCALE)),
    0,
    0,
    cv.INTER_AREA,
  );
  const matches: Match[] = [];

  const findMatchesForCrop = (cropRatios: TemplateCropRatios): boolean => {
    const previousMatchCount = matches.length;
    for (const slotSize of templateSizes) {
      const resized = new cv.Mat();
      const coarseTemplate = new cv.Mat();
      const coarseResult = new cv.Mat();
      const cropX = Math.round(slotSize * cropRatios.x);
      const cropY = Math.round(slotSize * cropRatios.y);
      const cropWidth = Math.max(1, Math.round(slotSize * cropRatios.width));
      const cropHeight = Math.max(1, Math.round(slotSize * cropRatios.height));
      const coarseSlotSize = Math.max(10, Math.round(slotSize * COARSE_SCALE));
      const coarseCropX = Math.round(coarseSlotSize * cropRatios.x);
      const coarseCropY = Math.round(coarseSlotSize * cropRatios.y);
      const coarseCropWidth = Math.max(1, Math.round(coarseSlotSize * cropRatios.width));
      const coarseCropHeight = Math.max(1, Math.round(coarseSlotSize * cropRatios.height));
      let templateCrop: OpenCvMat | null = null;
      let coarseTemplateCrop: OpenCvMat | null = null;

      try {
        cv.resize(templateRgb, resized, new cv.Size(slotSize, slotSize), 0, 0, cv.INTER_AREA);
        templateCrop = resized.roi(new cv.Rect(cropX, cropY, cropWidth, cropHeight));
        cv.resize(
          templateRgb,
          coarseTemplate,
          new cv.Size(coarseSlotSize, coarseSlotSize),
          0,
          0,
          cv.INTER_AREA,
        );
        coarseTemplateCrop = coarseTemplate.roi(new cv.Rect(
          coarseCropX,
          coarseCropY,
          coarseCropWidth,
          coarseCropHeight,
        ));
        const coarseStarted = performance.now();
        cv.matchTemplate(coarseSource, coarseTemplateCrop, coarseResult, cv.TM_CCOEFF_NORMED);
        if (timing) timing.coarseMs += performance.now() - coarseStarted;

        for (let count = 0; count < MAX_MATCHES_PER_SCALE; count += 1) {
          const { maxVal: coarseScore, maxLoc: coarseLoc } = cv.minMaxLoc(coarseResult, mask);
          if (coarseScore < COARSE_MATCH_THRESHOLD) break;

          const expectedCropX = Math.round(coarseLoc.x / COARSE_SCALE);
          const expectedCropY = Math.round(coarseLoc.y / COARSE_SCALE);
          const margin = Math.round(slotSize * 0.4);
          const left = Math.max(0, expectedCropX - margin);
          const top = Math.max(0, expectedCropY - margin);
          const right = Math.min(source.cols, expectedCropX + cropWidth + margin);
          const bottom = Math.min(source.rows, expectedCropY + cropHeight + margin);
          const sourceRoi = source.roi(new cv.Rect(left, top, right - left, bottom - top));
          const refinedResult = new cv.Mat();

          try {
            const refineStarted = performance.now();
            cv.matchTemplate(sourceRoi, templateCrop, refinedResult, cv.TM_CCOEFF_NORMED);
            const { maxVal, maxLoc } = cv.minMaxLoc(refinedResult, mask);
            if (timing) timing.refineMs += performance.now() - refineStarted;
            if (maxVal >= MATCH_THRESHOLD) {
              const x = left + maxLoc.x - cropX;
              const y = top + maxLoc.y - cropY;
              const duplicateIndex = matches.findIndex((match) => (
                Math.hypot(match.x - x, match.y - y) < Math.min(match.slotSize, slotSize) * 0.55
              ));
              const candidate = { x, y, slotSize, score: maxVal };
              if (duplicateIndex < 0) matches.push(candidate);
              else if (maxVal > matches[duplicateIndex].score) matches[duplicateIndex] = candidate;
            }
          } finally {
            sourceRoi.delete();
            refinedResult.delete();
          }

          const suppressLeft = Math.max(0, coarseLoc.x - coarseSlotSize);
          const suppressTop = Math.max(0, coarseLoc.y - coarseSlotSize);
          const suppressWidth = Math.min(coarseResult.cols - suppressLeft, coarseSlotSize * 2);
          const suppressHeight = Math.min(coarseResult.rows - suppressTop, coarseSlotSize * 2);
          const suppressed = coarseResult.roi(new cv.Rect(
            suppressLeft,
            suppressTop,
            suppressWidth,
            suppressHeight,
          ));
          suppressed.setTo(new cv.Scalar(-1));
          suppressed.delete();
        }
      } finally {
        templateCrop?.delete();
        coarseTemplateCrop?.delete();
        resized.delete();
        coarseTemplate.delete();
        coarseResult.delete();
      }
    }
    return matches.length > previousMatchCount;
  };

  try {
    for (const cropRatios of cropCandidates) {
      if (findMatchesForCrop(cropRatios)) break;
    }
  } finally {
    templateSource.delete();
    templateRgb.delete();
    coarseSource.delete();
    mask.delete();
  }

  return matches;
};

interface OcrRegion {
  canvas: HTMLCanvasElement;
  hasTextPixels: boolean;
}

const createOcrRegion = (
  frame: HTMLCanvasElement,
  sourceX: number,
  sourceY: number,
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
  threshold: boolean,
  includeColoredText = false,
  smooth = false,
): OcrRegion => {
  const x = Math.max(0, Math.round(sourceX));
  const y = Math.max(0, Math.round(sourceY));
  const width = Math.max(0, Math.min(frame.width - x, Math.round(sourceWidth)));
  const height = Math.max(0, Math.min(frame.height - y, Math.round(sourceHeight)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width * scale);
  canvas.height = Math.max(1, height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || width === 0 || height === 0) return { canvas, hasTextPixels: false };

  context.imageSmoothingEnabled = smooth;
  context.drawImage(frame, x, y, width, height, 0, 0, canvas.width, canvas.height);
  if (!threshold) return { canvas, hasTextPixels: true };

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  let textPixels = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    const red = image.data[index];
    const green = image.data[index + 1];
    const blue = image.data[index + 2];
    const brightness = (red + green + blue) / 3;
    const neutral = Math.max(red, green, blue) - Math.min(red, green, blue) < 65;
    const coloredQuantity = green > red * 1.2 || red > green * 1.2;
    const isText = (neutral && brightness > 145)
      || (includeColoredText && coloredQuantity && Math.max(red, green, blue) > 120);
    const value = isText ? 0 : 255;
    if (isText) textPixels += 1;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return { canvas, hasTextPixels: textPixels > scale * scale * 4 };
};

export const parseTooltipTitleQuantity = (text: string): number | null => {
  const normalized = text.replace(/\s/g, '');
  const bracketMatch = normalized.match(/[\[(][Xx]?([\d,]+)(?:\]|\))/);
  const xMatch = normalized.match(/[Xx]([\d,]+)/);
  const rawQuantity = bracketMatch?.[1] ?? xMatch?.[1];
  if (!rawQuantity) return null;
  const quantity = Number(rawQuantity.replace(/,/g, ''));
  return Number.isSafeInteger(quantity) ? quantity : null;
};

export const parseTooltipQuantity = (text: string, fallback: number | null): number | null => {
  const totalMatch = text.match(
    /전체\s*보유\s*수량[ \t]*[:：]?[ \t]*(\d{1,3}(?:[,.]\d{3})+|\d+)/,
  );
  if (totalMatch) {
    const quantity = Number(totalMatch[1].replace(/[^\d]/g, ''));
    return Number.isSafeInteger(quantity) ? Math.min(quantity, MAX_OWNED_QUANTITY) : fallback;
  }

  const ownedQuantities = Array.from(text.matchAll(
    /(?:거래\s*가능|캐릭터\s*귀속|원정대\s*귀속)\s*보유\s*수량[ \t]*[:：]?[ \t]*(\d{1,3}(?:[,.]\d{3})+|\d+)/g,
  )).map((match) => Number(match[1].replace(/[^\d]/g, '')));
  if (ownedQuantities.length > 0 && ownedQuantities.every(Number.isSafeInteger)) {
    return Math.min(
      ownedQuantities.reduce((sum, quantity) => sum + quantity, 0),
      MAX_OWNED_QUANTITY,
    );
  }

  return fallback;
};

export const parseHoningFateShardQuantity = (text: string): number | null => {
  const ownedAmount = text.match(/소지\s*금액[ \t]*(\d{1,3}(?:[,.]\d{3})+)/)?.[1];
  const amountLines = text.split(/\r?\n/).filter((line) => /\d{1,3}(?:[,.]\d{3})+/.test(line));
  const firstGroupedOnLastLine = amountLines.at(-1)?.match(/\d{1,3}(?:[,.]\d{3})+/)?.[0];
  const rawQuantity = ownedAmount ?? firstGroupedOnLastLine;
  if (!rawQuantity) return null;
  const quantity = Number(rawQuantity.replace(/[^\d]/g, ''));
  return Number.isSafeInteger(quantity) ? Math.min(quantity, MAX_OWNED_QUANTITY) : null;
};

export const parseTopBarFateShardQuantity = (text: string): number | null => {
  const groupedNumbers = Array.from(text.matchAll(/\d{1,3}(?:,\d{3})+/g));
  const rawQuantity = groupedNumbers.at(-1)?.[0];
  if (!rawQuantity) return null;
  const quantity = Number(rawQuantity.replace(/,/g, ''));
  return Number.isSafeInteger(quantity) ? Math.min(quantity, MAX_OWNED_QUANTITY) : null;
};

export const parseNarrowFateShardQuantity = (text: string): number | null => {
  const rawQuantity = text.match(/\d{1,3}(?:[,.]\d{3})+|\d{4,9}/)?.[0];
  if (!rawQuantity) return null;
  const quantity = Number(rawQuantity.replace(/[^\d]/g, ''));
  return Number.isSafeInteger(quantity) ? Math.min(quantity, MAX_OWNED_QUANTITY) : null;
};

export interface HoningOwnedQuantity {
  quantity: number;
  needsTooltip: boolean;
}

interface HoningQuantityParts extends HoningOwnedQuantity {
  ownedDigits: string;
  requiredDigits: string | null;
}

const parseHoningQuantityParts = (text: string): HoningQuantityParts | null => {
  const divided = text.match(/([\d, ]+)\s*[/|]\s*([\d, ]+)/);
  const separated = text.trim().match(/^([\d,]{2,})\s+([\d,]+)/);
  const rawOwned = divided?.[1] ?? separated?.[1];
  if (!rawOwned) return null;
  const ownedDigits = rawOwned.replace(/[^\d]/g, '');
  const requiredDigits = (divided?.[2] ?? separated?.[2])?.replace(/[^\d]/g, '') ?? null;
  const quantity = Number(ownedDigits);
  if (!ownedDigits || !Number.isSafeInteger(quantity)) return null;
  return { quantity, needsTooltip: quantity === 9999, ownedDigits, requiredDigits };
};

export const parseHoningOwnedQuantity = (text: string): HoningOwnedQuantity | null => {
  const reading = parseHoningQuantityParts(text);
  return reading && { quantity: reading.quantity, needsTooltip: reading.needsTooltip };
};

interface HoningOcrAttempt {
  text: string;
  confidence: number;
}

interface SelectedHoningReading {
  reading: HoningOwnedQuantity;
  confidence: number;
}

export const selectHoningOcrReading = (
  attempts: HoningOcrAttempt[],
): SelectedHoningReading | null => {
  const parsed = attempts.flatMap((attempt) => {
    const reading = parseHoningQuantityParts(attempt.text);
    return reading ? [{ ...attempt, reading }] : [];
  });
  if (parsed.length === 0) return null;

  for (let left = 0; left < parsed.length; left += 1) {
    for (let right = left + 1; right < parsed.length; right += 1) {
      const first = parsed[left].reading;
      const second = parsed[right].reading;
      const sameRequired = first.requiredDigits !== null
        && first.requiredDigits === second.requiredDigits;
      const firstRepeated = /^(.)\1+$/.test(first.ownedDigits);
      const secondRepeated = /^(.)\1+$/.test(second.ownedDigits);
      const sameDigit = first.ownedDigits[0] === second.ownedDigits[0];
      const lengthGap = Math.abs(first.ownedDigits.length - second.ownedDigits.length);
      // Narrow repeated glyphs can be dropped by one crop and duplicated by another.
      if (sameRequired && firstRepeated && secondRepeated && sameDigit && lengthGap === 2) {
        const length = Math.min(first.ownedDigits.length, second.ownedDigits.length) + 1;
        const quantity = Number(first.ownedDigits[0].repeat(length));
        return {
          reading: { quantity, needsTooltip: quantity === 9999 },
          confidence: Math.min(0.79, Math.max(parsed[left].confidence, parsed[right].confidence) / 100),
        };
      }
    }
  }

  const best = parsed.sort((left, right) => right.confidence - left.confidence)[0];
  return {
    reading: {
      quantity: best.reading.quantity,
      needsTooltip: best.reading.needsTooltip,
    },
    confidence: Math.max(0, Math.min(1, best.confidence / 100)),
  };
};

export const createHoningObservation = (
  material: MaterialType,
  reading: HoningOwnedQuantity,
  confidence = 0.9,
): MaterialObservation => ({
  material,
  quantity: reading.quantity,
  confidence,
  x: 0,
  y: 0,
  slotSize: 0,
  needsReview: reading.needsTooltip || confidence < 0.8,
  needsTooltip: reading.needsTooltip,
  source: 'honing',
});

interface HoningRecognition {
  observations: MaterialObservation[];
  detected: boolean;
  cappedMaterials: MaterialType[];
  rowY: number;
  leftmostSlotX: number;
  slotSize: number;
  region: { x: number; y: number; width: number; height: number };
}

const recognizeHoningMaterials = async (
  frame: HTMLCanvasElement,
  cv: OpenCv,
  source: OpenCvMat,
  icons: MaterialIconMap,
  materials: MaterialType[],
  metrics: RecognitionMetrics,
): Promise<HoningRecognition> => {
  const candidateStarted = performance.now();
  // Both compact and full-screen samples place the honing material row in this
  // central-lower band. Icon matches plus a `owned / required` line are still
  // required, so this band alone never declares a honing window.
  const region = {
    x: Math.round(frame.width * 0.15),
    y: Math.round(frame.height * 0.48),
    width: Math.round(frame.width * 0.7),
    height: Math.round(frame.height * 0.36),
  };
  const sourceRoi = source.roi(new cv.Rect(region.x, region.y, region.width, region.height));
  metrics.honingCandidateMs += performance.now() - candidateStarted;
  const observations: MaterialObservation[] = [];
  const cappedMaterials: MaterialType[] = [];
  const numericWorker = await getNumericOcrWorker();
  const slotPositions = new Set<string>();
  let detected = false;
  let rowY = frame.height;
  let leftmostSlotX = frame.width;
  let largestSlot = 0;

  try {
    for (const material of materials) {
      const iconUrl = icons[material];
      if (!iconUrl) continue;
      const template = await loadTemplateCanvas(iconUrl);
      const matchTiming = { coarseMs: 0, refineMs: 0 };
      const matches = findTemplateMatches(cv, sourceRoi, template, TEMPLATE_SIZES, matchTiming)
        .sort((left, right) => right.score - left.score);
      metrics.slotDetectionMs += matchTiming.coarseMs;
      metrics.iconClassificationMs += matchTiming.refineMs;
      if (matches.length > 0) detected = true;

      for (const relativeMatch of matches.slice(0, 3)) {
        const match = {
          ...relativeMatch,
          x: relativeMatch.x + region.x,
          y: relativeMatch.y + region.y,
        };
        const quantityCrops = [
          {
            x: match.x - match.slotSize * 0.45,
            y: match.y + match.slotSize * (match.slotSize < 50 ? 0.95 : 1.1),
            width: match.slotSize * 1.9,
            height: match.slotSize * 0.58,
            scale: 5,
            threshold: false,
          },
          {
            x: match.x - match.slotSize * 0.6,
            y: match.y + match.slotSize * 1.1,
            width: match.slotSize * 2.2,
            height: match.slotSize * 0.8,
            scale: 5,
            threshold: false,
          },
          {
            x: match.x - match.slotSize * 0.6,
            y: match.y + match.slotSize * 1.1,
            width: match.slotSize * 2.2,
            height: match.slotSize * 0.8,
            scale: 5,
            threshold: true,
          },
          {
            x: match.x - match.slotSize * 0.4,
            y: match.y + match.slotSize * 1.04,
            width: match.slotSize * 1.8,
            height: match.slotSize * 0.9,
            scale: 5,
            threshold: false,
          },
        ];
        const attempts: HoningOcrAttempt[] = [];
        await numericWorker.setParameters({ tessedit_char_whitelist: '0123456789,/Xx[] ' });
        for (const crop of quantityCrops) {
          const quantityRegion = createOcrRegion(
            frame,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            crop.scale,
            crop.threshold,
            crop.threshold,
          );
          if (!quantityRegion.hasTextPixels) continue;
          const ocrStarted = performance.now();
          const { data } = await numericWorker.recognize(quantityRegion.canvas);
          metrics.slotOcrMs += performance.now() - ocrStarted;
          attempts.push({ text: data.text, confidence: data.confidence });
        }
        const selected = selectHoningOcrReading(attempts);
        if (!selected) continue;
        const { reading } = selected;

        const observation = createHoningObservation(
          material,
          reading,
          Math.min(match.score, selected.confidence),
        );
        observations.push({ ...observation, x: match.x, y: match.y, slotSize: match.slotSize });
        if (reading.needsTooltip) cappedMaterials.push(material);
        rowY = Math.min(rowY, match.y);
        leftmostSlotX = Math.min(leftmostSlotX, match.x);
        largestSlot = Math.max(largestSlot, match.slotSize);
        slotPositions.add(`${Math.round(match.x / 8)}:${Math.round(match.y / 8)}`);
        break;
      }
    }
  } finally {
    sourceRoi.delete();
  }

  metrics.slotCount = slotPositions.size;
  return {
    observations,
    detected: detected && observations.length > 0,
    cappedMaterials,
    rowY,
    leftmostSlotX,
    slotSize: largestSlot,
    region,
  };
};

const recognizeTooltipQuantity = async (
  frame: HTMLCanvasElement,
  match: Match,
): Promise<{ quantity: number; confidence: number; needsReview: boolean } | null> => {
  const title = createOcrRegion(
    frame,
    match.x - match.slotSize * 0.3,
    match.y - match.slotSize * 1.2,
    match.slotSize * 6.8,
    match.slotSize * 0.9,
    4,
    true,
  );

  const numericWorker = await getNumericOcrWorker();
  await numericWorker.setParameters({ tessedit_char_whitelist: '0123456789,Xx[] ' });
  const titleData = title.hasTextPixels
    ? (await numericWorker.recognize(title.canvas)).data
    : { text: '', confidence: 0 };
  const titleQuantity = parseTooltipTitleQuantity(titleData.text);

  const screenScale = frame.height / 1080;
  // Transparent artwork can match the tooltip icon at a smaller template scale.
  // Compensate so both 64px and 80px matches resolve to the same tooltip body.
  const compactMatchOffset = Math.max(0, 80 * screenScale - match.slotSize);
  const tooltip = createOcrRegion(
    frame,
    match.x - compactMatchOffset * 0.625 - screenScale,
    match.y + match.slotSize * 1.025 + compactMatchOffset * 0.46,
    Math.max(match.slotSize * 4, 320 * screenScale),
    100 * screenScale + compactMatchOffset * 0.3125,
    4,
    false,
    false,
    true,
  );
  const tooltipWorker = await getTooltipOcrWorker();
  const { data: tooltipData } = await tooltipWorker.recognize(tooltip.canvas);
  const bodyQuantity = parseTooltipQuantity(tooltipData.text, null);
  const quantity = bodyQuantity ?? titleQuantity;
  if (quantity === null) return null;
  const capped = quantity > MAX_OWNED_QUANTITY;
  const ocrConfidence = bodyQuantity === null ? titleData.confidence : tooltipData.confidence;
  const confidence = Math.max(0, Math.min(1, ocrConfidence / 100));

  return {
    quantity: capped ? MAX_OWNED_QUANTITY : quantity,
    confidence,
    needsReview: capped || ocrConfidence < 70,
  };
};

const recognizeFateShard = async (
  frame: HTMLCanvasElement,
  honing?: HoningRecognition,
): Promise<MaterialObservation | null> => {
  const topBar = createOcrRegion(
    frame,
    frame.width * 0.47,
    0,
    frame.width * 0.07,
    Math.max(36, frame.height * 0.045),
    3,
    true,
  );
  const numericWorker = await getNumericOcrWorker();
  await numericWorker.setParameters({ tessedit_char_whitelist: '0123456789,' });
  const { data: topBarData } = await numericWorker.recognize(topBar.canvas);
  const topBarQuantity = parseTopBarFateShardQuantity(topBarData.text);
  if (topBarQuantity !== null) {
    return {
      material: '운명의 파편',
      quantity: topBarQuantity,
      confidence: Math.max(0, Math.min(1, topBarData.confidence / 100)),
      x: 0,
      y: 0,
      slotSize: 0,
      needsReview: topBarData.confidence < 70,
      source: 'fate-shard',
    };
  }

  const hasHoningRow = honing?.detected && honing.slotSize > 0;
  if (!hasHoningRow || !honing) return null;
  // Normal and advanced honing both place the owned fate-shard amount in the
  // first currency column. A narrow numeric crop avoids silver in the next column.
  const ownedAmount = createOcrRegion(
    frame,
    honing.region.x + honing.region.width * 0.4,
    honing.rowY + honing.slotSize * 2.35,
    honing.region.width * 0.1,
    honing.slotSize * 0.9,
    4,
    false,
  );
  const { data: ownedData } = await numericWorker.recognize(ownedAmount.canvas);
  let honingQuantity = parseNarrowFateShardQuantity(ownedData.text);
  let confidence = Math.max(0, Math.min(1, ownedData.confidence / 100));
  if (honingQuantity === null) {
    // Keep the labelled multi-column OCR as a fallback for layouts where the
    // currency column cannot be isolated reliably.
    const honingCosts = createOcrRegion(
      frame,
      honing.leftmostSlotX - honing.slotSize * 1.3,
      honing.rowY + honing.slotSize * 1.75,
      honing.slotSize * 2.7,
      honing.slotSize * 1.8,
      4,
      false,
    );
    const tooltipWorker = await getTooltipOcrWorker();
    const { data: honingData } = await tooltipWorker.recognize(honingCosts.canvas);
    honingQuantity = parseHoningFateShardQuantity(honingData.text);
    confidence = Math.max(0, Math.min(1, honingData.confidence / 100));
  }
  if (honingQuantity === null) return null;

  return {
    material: '운명의 파편',
    quantity: honingQuantity,
    confidence,
    x: 0,
    y: 0,
    slotSize: 0,
    needsReview: confidence < 0.7,
    source: 'fate-shard',
  };
};

const validateFrame = (frame: HTMLCanvasElement): void => {
  if (frame.width < 800 || frame.height < 450) {
    throw new Error(`공유 화면 해상도가 너무 낮습니다. 감지된 화면: ${frame.width}×${frame.height}`);
  }
};

export const recognizeMaterialFrame = async (
  frame: HTMLCanvasElement,
  icons: MaterialIconMap,
  targetMaterials: MaterialType[],
): Promise<RecognitionFrame> => {
  validateFrame(frame);
  const totalStarted = performance.now();
  const observations: MaterialObservation[] = [];
  const materialTargets = targetMaterials.filter((material) => material !== '운명의 파편');
  const metrics: RecognitionMetrics = {
    honingCandidateMs: 0,
    slotDetectionMs: 0,
    iconClassificationMs: 0,
    slotOcrMs: 0,
    fateShardOcrMs: 0,
    tooltipOcrMs: 0,
    slotCount: 0,
    targetCount: materialTargets.length,
    totalMs: 0,
  };

  let honing: HoningRecognition | undefined;
  let cv: OpenCv | undefined;
  let sourceRgba: OpenCvMat | undefined;
  let sourceRgb: OpenCvMat | undefined;

  try {
    if (materialTargets.length > 0) {
      cv = await getOpenCv();
      sourceRgba = cv.imread(frame);
      sourceRgb = new cv.Mat();
      cv.cvtColor(sourceRgba, sourceRgb, cv.COLOR_RGBA2RGB);
      honing = await recognizeHoningMaterials(frame, cv, sourceRgb, icons, materialTargets, metrics);
      observations.push(...honing.observations);
    }

    if (targetMaterials.includes('운명의 파편')) {
      const fateStarted = performance.now();
      const fateShard = await recognizeFateShard(frame, honing);
      metrics.fateShardOcrMs += performance.now() - fateStarted;
      if (fateShard) observations.push(fateShard);
    }

    const tooltipMaterials = honing?.detected ? honing.cappedMaterials : materialTargets;
    if (tooltipMaterials.length > 0 && cv && sourceRgb) {
      for (const material of tooltipMaterials) {
        const iconUrl = icons[material];
        if (!iconUrl) continue;
        const template = await loadTemplateCanvas(iconUrl);
        const matches = findTemplateMatches(cv, sourceRgb, template)
          .sort((left, right) => right.slotSize - left.slotSize || right.score - left.score);

        for (const match of matches) {
          const tooltipStarted = performance.now();
          const quantity = await recognizeTooltipQuantity(frame, match);
          metrics.tooltipOcrMs += performance.now() - tooltipStarted;
          if (!quantity) continue;
          observations.push({
            material,
            quantity: quantity.quantity,
            confidence: Math.min(match.score, quantity.confidence),
            x: match.x,
            y: match.y,
            slotSize: match.slotSize,
            needsReview: quantity.needsReview || match.score < 0.8,
            needsTooltip: false,
            source: 'tooltip',
          });
          break;
        }
      }
    }
  } finally {
    sourceRgba?.delete();
    sourceRgb?.delete();
  }

  metrics.totalMs = performance.now() - totalStarted;
  return { observations, frameWidth: frame.width, frameHeight: frame.height, metrics };
};

export const disposeMaterialRecognizer = async (): Promise<void> => {
  const workerPromises = [numericOcrWorkerPromise, tooltipOcrWorkerPromise];
  numericOcrWorkerPromise = null;
  tooltipOcrWorkerPromise = null;
  await Promise.all(workerPromises.map(async (workerPromise) => {
    if (!workerPromise) return;
    const worker = await workerPromise;
    await worker.terminate();
  }));
};
