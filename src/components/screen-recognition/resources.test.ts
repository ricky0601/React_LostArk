import { createOpenCvLoader, type OpenCv } from './openCvLoader';
import { OcrWorkerPool, type OcrWorker } from './ocrWorkerPool';

describe('createOpenCvLoader', () => {
  it('imports OpenCV once and waits for runtime initialization', async () => {
    const cv = {} as OpenCv;
    const importer = vi.fn().mockResolvedValue({ default: cv });
    const load = createOpenCvLoader(importer);

    const first = load();
    const second = load();
    await Promise.resolve();
    expect(importer).toHaveBeenCalledOnce();

    Object.assign(cv, { Mat: vi.fn() });
    cv.onRuntimeInitialized?.();
    await expect(first).resolves.toBe(cv);
    await expect(second).resolves.toBe(cv);
    expect(load()).toBe(first);
  });
});

describe('OcrWorkerPool', () => {
  it('reuses workers by settings and terminates every created worker', async () => {
    const workers: OcrWorker[] = [];
    const factory = vi.fn().mockImplementation(async () => {
      const worker = { terminate: vi.fn().mockResolvedValue(undefined) } as unknown as OcrWorker;
      workers.push(worker);
      return worker;
    });
    const pool = new OcrWorkerPool(factory);
    const numeric = {
      languages: 'eng',
      parameters: { tessedit_char_whitelist: '0123456789', preserve_interword_spaces: '0' },
    };

    const first = pool.get(numeric);
    const sameSettings = pool.get({
      languages: 'eng',
      parameters: { preserve_interword_spaces: '0', tessedit_char_whitelist: '0123456789' },
    });
    const korean = pool.get({ languages: 'kor+eng' });

    expect(await sameSettings).toBe(await first);
    expect(await korean).not.toBe(await first);
    expect(factory).toHaveBeenCalledTimes(2);

    await pool.dispose();
    expect(workers).toHaveLength(2);
    workers.forEach((worker) => expect(worker.terminate).toHaveBeenCalledOnce());

    await pool.get(numeric);
    expect(factory).toHaveBeenCalledTimes(3);
  });
});
