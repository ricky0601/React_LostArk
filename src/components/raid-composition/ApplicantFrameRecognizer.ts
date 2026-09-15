import { OcrWorkerPool, type FrameRecognizer, type OcrWorker } from '../screen-recognition';
import {
  detectRaidViewportTransform,
  getRaidOcrSequenceCandidates,
  getRaidPixelBox,
  mergeRaidOcrCandidates,
  rankRaidOcrCandidates,
  type RaidViewportTransform,
} from './RaidPartyFrameRecognizer';
import { normalizeRaidNickname, type NormalizedBox } from './recognition';

const REFERENCE_WIDTH = 1920;
const REFERENCE_HEIGHT = 1080;
const ROW_TOPS = [280, 367, 453, 540] as const;
const STABLE_FRAME_COUNT = 2;
const OCR_CONFIDENCE = 45;
const LOSTARK_OCR_CORE_PATH = '/tesseract-core/tesseract-core-simd-lstm.wasm.js';

export const APPLICANT_ROW_BOXES: readonly NormalizedBox[] = ROW_TOPS.map((top) => ({
  x: 1312 / REFERENCE_WIDTH,
  y: top / REFERENCE_HEIGHT,
  width: 573 / REFERENCE_WIDTH,
  height: 82 / REFERENCE_HEIGHT,
}));

export const APPLICANT_NICKNAME_BOXES: readonly NormalizedBox[] = ROW_TOPS.map((top) => ({
  // Lv.70 표시는 제외하고 그 오른쪽의 닉네임 문자열만 OCR한다.
  x: 1360 / REFERENCE_WIDTH,
  y: (top + 53) / REFERENCE_HEIGHT,
  width: 220 / REFERENCE_WIDTH,
  height: 27 / REFERENCE_HEIGHT,
}));

export interface ApplicantRowObservation {
  readonly row: number;
  readonly occupied: boolean;
  readonly nickname: string | null;
  readonly nicknameCandidates: readonly string[];
  readonly needsReview: boolean;
}

export interface ApplicantFrameObservation {
  readonly rows: readonly ApplicantRowObservation[];
  readonly scannedAt: number;
}

export interface ApplicantNicknameStability {
  readonly signature: string;
  readonly candidates: readonly string[];
  readonly count: number;
}

export const stabilizeApplicantNickname = (
  previous: ApplicantNicknameStability | undefined,
  candidates: readonly string[],
): ApplicantNicknameStability | null => {
  const signature = candidates[0] ?? '';
  if (!signature) return null;
  const continued = previous?.signature === signature;
  return {
    signature,
    candidates: continued ? mergeRaidOcrCandidates(previous.candidates, candidates) : candidates,
    count: continued ? previous.count + 1 : 1,
  };
};

export const hasApplicantRowPixels = (pixels: ImageData): boolean => {
  let foreground = 0;
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    const brightness = Math.max(red, green, blue);
    if (brightness >= 145 && (Math.min(red, green, blue) >= 105 || red - blue >= 35)) foreground += 1;
  }
  return foreground >= Math.max(8, Math.round(pixels.width * pixels.height * 0.002));
};

export const preprocessApplicantNicknamePixels = (
  pixels: ImageData,
  threshold = 130,
  invert = false,
): ImageData => {
  for (let index = 0; index < pixels.data.length; index += 4) {
    const brightness = Math.max(pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]);
    const value = brightness >= threshold ? 255 : 0;
    const output = invert ? 255 - value : value;
    pixels.data[index] = output;
    pixels.data[index + 1] = output;
    pixels.data[index + 2] = output;
    pixels.data[index + 3] = 255;
  }
  return pixels;
};

const normalizeApplicantOcrScores = (
  observations: readonly { text: string; confidence: number }[],
): readonly { text: string; confidence: number }[] => observations
  .map(({ text, confidence }) => ({ text: normalizeRaidNickname(text), confidence }))
  .filter((candidate): candidate is { text: string; confidence: number } => candidate.text != null);

export const getApplicantSpecializedConsensus = (
  observations: readonly { text: string; confidence: number }[],
): string | null => {
  const counts = new Map<string, { count: number; confidence: number }>();
  normalizeApplicantOcrScores(observations).forEach(({ text, confidence }) => {
    const current = counts.get(text) ?? { count: 0, confidence: 0 };
    counts.set(text, { count: current.count + 1, confidence: current.confidence + confidence });
  });
  return Array.from(counts.entries())
    .filter(([, score]) => score.count >= 2)
    .sort((left, right) => right[1].confidence - left[1].confidence)[0]?.[0] ?? null;
};

export const generateApplicantNicknameCandidates = (
  observations: readonly { text: string; confidence: number }[],
  specializedObservations: readonly { text: string; confidence: number }[] = [],
): readonly string[] => {
  const genericScores = normalizeApplicantOcrScores(observations);
  const specializedScores = normalizeApplicantOcrScores(specializedObservations);
  const specializedConsensus = getApplicantSpecializedConsensus(specializedObservations);
  const sequenceCandidates = getRaidOcrSequenceCandidates(specializedScores);
  const rankedCandidates = rankRaidOcrCandidates([
    ...genericScores,
    ...specializedScores,
  ]);
  return Array.from(new Set([
    ...(specializedConsensus ? [specializedConsensus] : []),
    ...rankedCandidates,
    ...sequenceCandidates,
  ]));
};

const cropPixels = (
  frame: HTMLCanvasElement,
  box: NormalizedBox,
  viewport: RaidViewportTransform,
): ImageData => {
  const pixelBox = getRaidPixelBox(box, frame.width, frame.height, viewport);
  const context = frame.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('신청자 영역을 분석할 수 없습니다.');
  return context.getImageData(pixelBox.x, pixelBox.y, pixelBox.width, pixelBox.height);
};

const createNicknameCanvas = (
  frame: HTMLCanvasElement,
  row: number,
  viewport: RaidViewportTransform,
  threshold?: number,
  invert = false,
  pixelOffsetY = 0,
): HTMLCanvasElement => {
  const baseBox = getRaidPixelBox(APPLICANT_NICKNAME_BOXES[row], frame.width, frame.height, viewport);
  const box = { ...baseBox, y: baseBox.y + pixelOffsetY };
  const scale = threshold == null ? 1 : 4;
  const canvas = document.createElement('canvas');
  canvas.width = box.width * scale;
  canvas.height = box.height * scale;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('신청자 닉네임을 분석할 수 없습니다.');
  context.drawImage(frame, box.x, box.y, box.width, box.height, 0, 0, canvas.width, canvas.height);
  if (threshold != null) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    context.putImageData(preprocessApplicantNicknamePixels(pixels, threshold, invert), 0, 0);
  }
  return canvas;
};

const getGenericWorker = async (pool: OcrWorkerPool): Promise<OcrWorker> => {
  const { PSM } = await import('tesseract.js');
  return pool.get({
    languages: 'kor+eng',
    parameters: { tessedit_pageseg_mode: PSM.SINGLE_LINE, preserve_interword_spaces: '0' },
  });
};

const getLostArkWorker = async (pool: OcrWorkerPool): Promise<OcrWorker> => {
  const { PSM } = await import('tesseract.js');
  return pool.get({
    languages: 'lostark_kor',
    options: { langPath: '/tessdata', corePath: LOSTARK_OCR_CORE_PATH },
    parameters: { tessedit_pageseg_mode: PSM.SINGLE_LINE, preserve_interword_spaces: '0' },
  });
};

export class ApplicantFrameRecognizer implements FrameRecognizer<ApplicantFrameObservation> {
  private readonly workers = new OcrWorkerPool();

  private readonly stableNicknames = new Map<number, ApplicantNicknameStability>();

  private lostArkWorkerUnavailable = false;

  async recognize(frame: HTMLCanvasElement): Promise<ApplicantFrameObservation> {
    const frameContext = frame.getContext('2d', { willReadFrequently: true });
    if (!frameContext) throw new Error('공유 화면을 분석할 수 없습니다.');
    const viewport = detectRaidViewportTransform(frameContext.getImageData(0, 0, frame.width, frame.height));
    const occupiedRows = APPLICANT_ROW_BOXES.map((box, row) => ({
      row,
      occupied: hasApplicantRowPixels(cropPixels(frame, box, viewport)),
    }));
    const workers = occupiedRows.some(({ occupied }) => occupied)
      ? await Promise.all([
        getGenericWorker(this.workers),
        this.lostArkWorkerUnavailable
          ? Promise.resolve(null)
          : getLostArkWorker(this.workers).catch(() => {
            this.lostArkWorkerUnavailable = true;
            return null;
          }),
      ])
      : null;
    const rows: ApplicantRowObservation[] = [];

    for (const current of occupiedRows) {
      if (!current.occupied || !workers) {
        this.stableNicknames.delete(current.row);
        rows.push({ row: current.row, occupied: false, nickname: null, nicknameCandidates: [], needsReview: false });
        continue;
      }
      const [genericWorker, lostArkWorker] = workers;
      const [genericResults, specializedResults] = await Promise.all([
        Promise.all([100, 150].map((threshold) => (
          genericWorker.recognize(createNicknameCanvas(frame, current.row, viewport, threshold))
        ))),
        lostArkWorker
          ? Promise.all([
            lostArkWorker.recognize(createNicknameCanvas(frame, current.row, viewport)),
            lostArkWorker.recognize(createNicknameCanvas(frame, current.row, viewport, undefined, false, 1)),
            lostArkWorker.recognize(createNicknameCanvas(frame, current.row, viewport, 130, true)),
          ]).catch(() => {
            this.lostArkWorkerUnavailable = true;
            return [];
          })
          : Promise.resolve([]),
      ]);
      const toScores = (results: typeof genericResults) => results
        .filter((result) => result.data.confidence >= OCR_CONFIDENCE)
        .map((result) => ({ text: result.data.text, confidence: result.data.confidence }));
      const candidates = generateApplicantNicknameCandidates(
        toScores(genericResults),
        toScores(specializedResults),
      );
      const previous = this.stableNicknames.get(current.row);
      const stable = stabilizeApplicantNickname(previous, candidates);
      if (stable) this.stableNicknames.set(current.row, stable);
      else if (previous) this.stableNicknames.set(current.row, { ...previous, count: 0 });
      rows.push({
        row: current.row,
        occupied: true,
        nickname: stable && stable.count >= STABLE_FRAME_COUNT ? stable.candidates[0] ?? null : null,
        nicknameCandidates: stable?.candidates ?? [],
        needsReview: true,
      });
    }

    return { rows, scannedAt: Date.now() };
  }

  async dispose(): Promise<void> {
    this.stableNicknames.clear();
    this.lostArkWorkerUnavailable = false;
    await this.workers.dispose();
  }
}
