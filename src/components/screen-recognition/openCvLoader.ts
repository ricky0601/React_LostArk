export type OpenCv = typeof import('@techstark/opencv-js') & {
  onRuntimeInitialized?: () => void;
};

type OpenCvModule = OpenCv | Promise<OpenCv>;
type OpenCvImporter = () => Promise<{ default: OpenCvModule }>;

export const createOpenCvLoader = (
  importer: OpenCvImporter = () => import('./opencvModule'),
): (() => Promise<OpenCv>) => {
  let loading: Promise<OpenCv> | null = null;

  return () => {
    if (loading) return loading;
    loading = importer().then(async ({ default: importedModule }) => {
      const cv = await importedModule;
      if (cv.Mat) return cv;
      await new Promise<void>((resolve) => {
        cv.onRuntimeInitialized = resolve;
      });
      return cv;
    }).catch((error: unknown) => {
      loading = null;
      throw error;
    });
    return loading;
  };
};

export const getOpenCv = createOpenCvLoader();
