import React, { createContext, useContext, useEffect, useState } from 'react';
import { safeSessionStorage } from '../utils/safeStorage';

export const CHUNK_ERROR_KEY = 'loa_chunk_error';
export const CHUNK_ERROR_EVENT = 'loa-chunk-error';

interface PwaChunkContextValue {
  /** Chunk 로드 실패로 새 버전 안내가 필요한지 */
  chunkErrorOccurred: boolean;
  clearChunkError: () => void;
}

const PwaChunkContext = createContext<PwaChunkContextValue | null>(null);

export function PwaChunkProvider({ children }: { children: React.ReactNode }) {
  const [chunkErrorOccurred, setChunkErrorOccurred] = useState<boolean>(() => {
    return safeSessionStorage.getItem(CHUNK_ERROR_KEY) === '1';
  });

  useEffect(() => {
    const onCustom = () => setChunkErrorOccurred(true);
    window.addEventListener(CHUNK_ERROR_EVENT, onCustom);
    return () => window.removeEventListener(CHUNK_ERROR_EVENT, onCustom);
  }, []);

  const clearChunkError = () => {
    safeSessionStorage.removeItem(CHUNK_ERROR_KEY);
    setChunkErrorOccurred(false);
  };

  return (
    <PwaChunkContext.Provider value={{ chunkErrorOccurred, clearChunkError }}>
      {children}
    </PwaChunkContext.Provider>
  );
}

export function usePwaChunk(): PwaChunkContextValue {
  const ctx = useContext(PwaChunkContext);
  if (!ctx) throw new Error('usePwaChunk must be used within PwaChunkProvider');
  return ctx;
}
