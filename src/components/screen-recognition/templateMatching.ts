import type { Mat } from '@techstark/opencv-js';
import type { OpenCv } from './openCvLoader';

export interface TemplateMatch {
  x: number;
  y: number;
  size: number;
  confidence: number;
}

export interface TemplateMatchTiming {
  coarseMs: number;
  refineMs: number;
}

export interface TemplateCropRatios {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MultiScaleTemplateMatchOptions {
  sizes: number[];
  threshold?: number;
  coarseThreshold?: number;
  coarseScale?: number;
  maxMatchesPerScale?: number;
  timing?: TemplateMatchTiming;
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

export const addTemplateMatch = (
  matches: TemplateMatch[],
  candidate: TemplateMatch,
): void => {
  const duplicateIndex = matches.findIndex((match) => (
    Math.hypot(match.x - candidate.x, match.y - candidate.y)
      < Math.min(match.size, candidate.size) * 0.55
  ));
  if (duplicateIndex < 0) matches.push(candidate);
  else if (candidate.confidence > matches[duplicateIndex].confidence) {
    matches[duplicateIndex] = candidate;
  }
};

export const matchMultiScaleTemplate = (
  cv: OpenCv,
  source: Mat,
  templateCanvas: HTMLCanvasElement,
  {
    sizes,
    threshold = 0.72,
    coarseThreshold = 0.5,
    coarseScale = 0.25,
    maxMatchesPerScale = 4,
    timing,
  }: MultiScaleTemplateMatchOptions,
): TemplateMatch[] => {
  const templateSource = cv.imread(templateCanvas);
  let templateRgb!: Mat;
  let coarseSource!: Mat;
  let mask!: Mat;
  let cropCandidates!: TemplateCropRatios[];
  const matches: TemplateMatch[] = [];

  const findMatchesForCrop = (cropRatios: TemplateCropRatios): boolean => {
    const previousMatchCount = matches.length;
    for (const size of sizes) {
      const resized = new cv.Mat();
      const coarseTemplate = new cv.Mat();
      const coarseResult = new cv.Mat();
      const cropX = Math.round(size * cropRatios.x);
      const cropY = Math.round(size * cropRatios.y);
      const cropWidth = Math.max(1, Math.round(size * cropRatios.width));
      const cropHeight = Math.max(1, Math.round(size * cropRatios.height));
      const coarseSize = Math.max(10, Math.round(size * coarseScale));
      const coarseCropX = Math.round(coarseSize * cropRatios.x);
      const coarseCropY = Math.round(coarseSize * cropRatios.y);
      const coarseCropWidth = Math.max(1, Math.round(coarseSize * cropRatios.width));
      const coarseCropHeight = Math.max(1, Math.round(coarseSize * cropRatios.height));
      let templateCrop: Mat | null = null;
      let coarseTemplateCrop: Mat | null = null;

      try {
        cv.resize(templateRgb, resized, new cv.Size(size, size), 0, 0, cv.INTER_AREA);
        templateCrop = resized.roi(new cv.Rect(cropX, cropY, cropWidth, cropHeight));
        cv.resize(
          templateRgb,
          coarseTemplate,
          new cv.Size(coarseSize, coarseSize),
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

        for (let count = 0; count < maxMatchesPerScale; count += 1) {
          const { maxVal: coarseScore, maxLoc: coarseLoc } = cv.minMaxLoc(coarseResult, mask);
          if (coarseScore < coarseThreshold) break;

          const expectedCropX = Math.round(coarseLoc.x / coarseScale);
          const expectedCropY = Math.round(coarseLoc.y / coarseScale);
          const margin = Math.round(size * 0.4);
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
            if (maxVal >= threshold) {
              addTemplateMatch(matches, {
                x: left + maxLoc.x - cropX,
                y: top + maxLoc.y - cropY,
                size,
                confidence: maxVal,
              });
            }
          } finally {
            sourceRoi.delete();
            refinedResult.delete();
          }

          const suppressLeft = Math.max(0, coarseLoc.x - coarseSize);
          const suppressTop = Math.max(0, coarseLoc.y - coarseSize);
          const suppressWidth = Math.min(coarseResult.cols - suppressLeft, coarseSize * 2);
          const suppressHeight = Math.min(coarseResult.rows - suppressTop, coarseSize * 2);
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
    templateRgb = new cv.Mat();
    coarseSource = new cv.Mat();
    mask = new cv.Mat();
    cropCandidates = getTemplateCropCandidates(
      templateSource.data,
      templateSource.cols,
      templateSource.rows,
    );
    cv.cvtColor(templateSource, templateRgb, cv.COLOR_RGBA2RGB);
    cv.resize(
      source,
      coarseSource,
      new cv.Size(Math.round(source.cols * coarseScale), Math.round(source.rows * coarseScale)),
      0,
      0,
      cv.INTER_AREA,
    );
    for (const cropRatios of cropCandidates) {
      if (findMatchesForCrop(cropRatios)) break;
    }
    return matches;
  } finally {
    templateSource.delete();
    templateRgb?.delete();
    coarseSource?.delete();
    mask?.delete();
  }
};
