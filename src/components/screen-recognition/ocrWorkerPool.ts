type TesseractModule = typeof import('tesseract.js');
export type OcrWorker = Awaited<ReturnType<TesseractModule['createWorker']>>;
type OcrParameters = Parameters<OcrWorker['setParameters']>[0];

export interface OcrWorkerSettings {
  languages: string;
  parameters?: OcrParameters;
}

type OcrWorkerFactory = (settings: OcrWorkerSettings) => Promise<OcrWorker>;

const settingsKey = ({ languages, parameters = {} }: OcrWorkerSettings): string => JSON.stringify([
  languages,
  Object.entries(parameters).sort(([left], [right]) => left.localeCompare(right)),
]);

const createDefaultWorker: OcrWorkerFactory = async ({ languages, parameters }) => {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(languages);
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
    const key = settingsKey(settings);
    const cached = this.workers.get(key);
    if (cached) return cached;

    let worker!: Promise<OcrWorker>;
    worker = this.factory(settings).catch((error: unknown) => {
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
