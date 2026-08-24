import viteConfig from '../vite.config.mts';

describe('Vite migration configuration', () => {
  it('keeps the Lost Ark development proxy server-side and preserves its path contract', async () => {
    if (typeof viteConfig !== 'function') {
      throw new TypeError('Expected the Vite config to be environment-aware');
    }

    const config = await viteConfig({
      command: 'serve',
      mode: 'test',
      isSsrBuild: false,
      isPreview: false,
    });
    const proxy = config.server?.proxy?.['/api/lostark'];

    if (!proxy || typeof proxy === 'string') {
      throw new TypeError('Expected the Lost Ark proxy configuration');
    }

    expect(proxy.target).toBe('https://developer-lostark.game.onstove.com');
    expect(proxy.changeOrigin).toBe(true);
    expect(proxy.rewrite?.('/api/lostark/news/events')).toBe('/news/events');
    expect(proxy.headers?.accept).toBe('application/json');

    // loadEnv is consumed only while creating the dev server config. Nothing is defined in client code.
    expect(config.define).toBeUndefined();
    expect(config.envPrefix).toBeUndefined();
  });

  it('keeps the existing build directory used by Vercel and static SEO generation', async () => {
    if (typeof viteConfig !== 'function') {
      throw new TypeError('Expected the Vite config to be environment-aware');
    }

    const config = await viteConfig({
      command: 'build',
      mode: 'production',
      isSsrBuild: false,
      isPreview: false,
    });

    expect(config.build?.outDir).toBe('build');
  });
});
