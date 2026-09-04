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

  it('retries OpenCV import after a failure', async () => {
    const cv = { Mat: vi.fn() } as unknown as OpenCv;
    const importer = vi.fn()
      .mockRejectedValueOnce(new Error('cdn fail'))
      .mockResolvedValue({ default: cv });
    const load = createOpenCvLoader(importer);

    await expect(load()).rejects.toThrow('cdn fail');
    await expect(load()).resolves.toBe(cv);
    expect(importer).toHaveBeenCalledTimes(2);
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

  it('evicts failed workers so a retry creates a new worker', async () => {
    const worker = { terminate: vi.fn().mockResolvedValue(undefined) } as unknown as OcrWorker;
    const factory = vi.fn()
      .mockRejectedValueOnce(new Error('cdn fail'))
      .mockResolvedValue(worker);
    const pool = new OcrWorkerPool(factory);
    const settings = { languages: 'eng' };

    await expect(pool.get(settings)).rejects.toThrow('cdn fail');
    await expect(pool.get(settings)).resolves.toBe(worker);
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
