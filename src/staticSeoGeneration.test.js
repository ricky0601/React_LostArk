const { execFileSync } = require('child_process');
const {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');

const routeSeoEntries = require('./constants/routeSeo.json');
const projectRoot = process.cwd();
const siteUrl = 'https://lokki.vercel.app';

let fixtureRoot;
let fixtureBuild;

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'lokki-static-seo-'));
  fixtureBuild = join(fixtureRoot, 'build');

  mkdirSync(join(fixtureRoot, 'src', 'constants'), { recursive: true });
  mkdirSync(fixtureBuild, { recursive: true });
  cpSync(join(projectRoot, 'src', 'constants', 'routeSeo.json'), join(fixtureRoot, 'src', 'constants', 'routeSeo.json'));
  cpSync(join(projectRoot, 'index.html'), join(fixtureBuild, 'index.html'));

  execFileSync(process.execPath, [join(projectRoot, 'scripts', 'generateStaticSeo.js')], {
    cwd: fixtureRoot,
  });
});

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});

test('uses a 1200 by 630 PNG for static social metadata', () => {
  const indexHtml = readFileSync(join(projectRoot, 'index.html'), 'utf8');
  const png = readFileSync(join(projectRoot, 'public', 'og-banner.png'));

  expect(indexHtml).toContain(`property="og:image" content="${siteUrl}/og-banner.png"`);
  expect(indexHtml).toContain('property="og:image:type" content="image/png"');
  expect(indexHtml).toContain(`name="twitter:image" content="${siteUrl}/og-banner.png"`);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});

test('generates route HTML with metadata matching routeSeo.json', () => {
  for (const route of routeSeoEntries) {
    const outputPath = route.path === '/'
      ? join(fixtureBuild, 'index.html')
      : join(fixtureBuild, route.path.slice(1), 'index.html');
    const html = readFileSync(outputPath, 'utf8');
    const canonical = `${siteUrl}${route.path === '/' ? '/' : route.path}`;

    expect(html).toContain(`<title>${route.title}</title>`);
    expect(html).toContain(`<meta name="robots" content="${route.robots}" />`);
    expect(html).toContain(`<link rel="canonical" href="${canonical}" />`);
  }

  const generatedRouteDirectories = readdirSync(fixtureBuild, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `/${entry.name}`)
    .sort();
  const configuredRoutes = routeSeoEntries
    .filter((route) => route.path !== '/')
    .map((route) => route.path)
    .sort();

  expect(generatedRouteDirectories).toEqual(configuredRoutes);
  for (const route of routeSeoEntries.filter((entry) => entry.robots === 'index, follow')) {
    const outputPath = route.path === '/'
      ? join(fixtureBuild, 'index.html')
      : join(fixtureBuild, route.path.slice(1), 'index.html');
    expect(existsSync(outputPath)).toBe(true);
  }
});

test('generates a noindex static 404 document with the home canonical', () => {
  const notFoundHtml = readFileSync(join(fixtureBuild, '404.html'), 'utf8');

  expect(notFoundHtml).toContain('<title>페이지를 찾을 수 없습니다 - 로아끼욧</title>');
  expect(notFoundHtml).toContain('<meta name="robots" content="noindex, follow" />');
  expect(notFoundHtml).toContain(`<link rel="canonical" href="${siteUrl}/" />`);
});

test('keeps API, known routes, missing routes, and static assets distinct in Vercel routing', () => {
  const { outputDirectory, rewrites } = require(join(projectRoot, 'vercel.json'));
  const apiRewrite = rewrites[0];
  const fallbackRewrite = rewrites[rewrites.length - 1];
  const pageRewrites = rewrites.slice(1, -1);
  const indexablePageRoutes = routeSeoEntries
    .filter((route) => route.path !== '/' && route.robots === 'index, follow')
    .map((route) => route.path)
    .sort();

  expect(outputDirectory).toBe('build');
  expect(apiRewrite).toEqual({
    source: '/api/lostark/:path*',
    destination: '/api/lostark/[...]',
  });
  expect(pageRewrites.map((rewrite) => rewrite.source).sort()).toEqual(indexablePageRoutes);
  for (const rewrite of pageRewrites) {
    expect(rewrite.destination).toBe(`${rewrite.source}/index.html`);
  }
  expect(fallbackRewrite).toEqual({ source: '/:path*', destination: '/404.html' });
  expect(pageRewrites.some((rewrite) => rewrite.source === '/og-banner.png')).toBe(false);
  expect(existsSync(join(projectRoot, 'public', 'og-banner.png'))).toBe(true);
});
