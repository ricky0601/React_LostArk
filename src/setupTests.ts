import { TextDecoder, TextEncoder } from 'node:util';
import '@testing-library/jest-dom/vitest';

// jsdom does not implement window.scrollTo; NavBar's mobile drawer scroll-lock calls it on cleanup.
window.scrollTo = vi.fn();

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}
