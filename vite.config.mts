import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const LOST_ARK_API_ORIGIN = 'https://developer-lostark.game.onstove.com';
const LOST_ARK_CDN_ORIGIN = 'https://cdn-lostark.game.onstove.com';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'LOSTARK_');
  const apiKey = process.env.LOSTARK_API_KEY || env.LOSTARK_API_KEY;

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api/lostark': {
          target: LOST_ARK_API_ORIGIN,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/lostark/, ''),
          headers: {
            accept: 'application/json',
            ...(apiKey ? { authorization: `bearer ${apiKey}` } : {}),
          },
        },
        '/api/material-icon': {
          target: LOST_ARK_CDN_ORIGIN,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/material-icon/, ''),
        },
      },
    },
    preview: {
      port: 3000,
    },
    build: {
      outDir: 'build',
    },
  };
});
