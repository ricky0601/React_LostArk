type TesseractModule = typeof import('tesseract.js');
export type OcrWorker = Awaited<ReturnType<TesseractModule['createWorker']>>;
type OcrParameters = Parameters<OcrWorker['setParameters']>[0];
type OcrWorkerOptions = NonNullable<Parameters<TesseractModule['createWorker']>[2]>;

export interface OcrWorkerSettings {
  languages: string;
  parameters?: OcrParameters;
  options?: Partial<OcrWorkerOptions>;
}

type OcrWorkerFactory = (settings: OcrWorkerSettings) => Promise<OcrWorker>;

/** Tesseract.js 7.0.0 runtime assets vendored under public/ (see public/tesseract/README.md). */
export const LOCAL_TESSERACT_OPTIONS: Partial<OcrWorkerOptions> = {
  workerPath: '/tesseract/worker.min.js',
  corePath: '/tesseract-core/tesseract-core-simd-lstm.wasm.js',
  langPath: '/tessdata',
};

const withLocalRuntimeAssets = (settings: OcrWorkerSettings): OcrWorkerSettings => ({
  ...settings,
  options: { ...settings.options, ...LOCAL_TESSERACT_OPTIONS },
});

const settingsKey = ({ languages, parameters = {}, options = {} }: OcrWorkerSettings): string => JSON.stringify([
  languages,
  Object.entries(parameters).sort(([left], [right]) => left.localeCompare(right)),
  Object.entries(options).sort(([left], [right]) => left.localeCompare(right)),
]);

const createDefaultWorker: OcrWorkerFactory = async ({ languages, parameters, options }) => {
  const { createWorker, OEM } = await import('tesseract.js');
  const worker = await createWorker(languages, OEM.LSTM_ONLY, options);
  try {
    if (parameters) await worker.setParameters(parameters);
    return worker;
  } catch (error) {
    await worker.terminate();
    throw error;
  }
};

export class OcrWorkerPool {
  private readonly workers = new Map<string, Promise<OcrWorker>>();

  constructor(private readonly factory: OcrWorkerFactory = createDefaultWorker) {}

  get(settings: OcrWorkerSettings): Promise<OcrWorker> {
    const localSettings = withLocalRuntimeAssets(settings);
    const key = settingsKey(localSettings);
    const cached = this.workers.get(key);
    if (cached) return cached;

    let worker!: Promise<OcrWorker>;
    worker = this.factory(localSettings).catch((error: unknown) => {
      if (this.workers.get(key) === worker) this.workers.delete(key);
      throw error;
    });
    this.workers.set(key, worker);
    return worker;
  }

  async dispose(): Promise<void> {
    const workers = Array.from(this.workers.values());
    this.workers.clear();
    await Promise.all(workers.map(async (workerPromise) => {
      const worker = await workerPromise;
      await worker.terminate();
    }));
  }
}
