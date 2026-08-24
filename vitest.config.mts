import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    // Keep parallelism bounded so UI-heavy jsdom tests do not compete for CPU in CI.
    maxWorkers: 4,
  },
});
