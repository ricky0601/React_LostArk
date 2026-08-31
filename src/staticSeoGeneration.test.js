const { execFileSync } = require('child_process');
const { applyRouteSeo } = require('../scripts/generateStaticSeo');
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

    const structuredDataMatch = html.match(/<script id="route-structured-data" type="application\/ld\+json">(.*?)<\/script>/s);
    expect(structuredDataMatch).not.toBeNull();
    const structuredData = JSON.parse(structuredDataMatch[1]);
    expect(structuredData['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        description: '로아끼욧에서 로스트아크 캐릭터 조회, 원정대 주간 골드 계산, 스펙 시뮬레이터, 강화·거래소·지출 관리를 한 번에 확인하세요.',
      }),
    ]));
    const page = structuredData['@graph'].find((entry) => entry['@id'] === `${canonical}#webpage`);
    expect(page).toMatchObject({
      '@type': route.schemaType === 'WebApplication' ? 'WebApplication' : 'WebPage',
      url: canonical,
      name: route.name || route.title.replace(/\s[-|]\s로아끼욧$/, ''),
      description: route.description,
      inLanguage: 'ko-KR',
    });

    if (route.path !== '/') {
      expect(structuredData['@graph']).toEqual(expect.arrayContaining([
        expect.objectContaining({ '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb` }),
      ]));
    }
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


test('normalizes unsupported schema types and preserves dollar sequences in replacements', () => {
  const indexHtml = readFileSync(join(projectRoot, 'index.html'), 'utf8');
  const description = "골드 시세 $' 안내";
  const canonical = `${siteUrl}/schema-test`;
  const html = applyRouteSeo(indexHtml, {
    path: '/schema-test',
    title: '스키마 $$ 테스트 - 로아끼욧',
    description,
    schemaType: 'Article',
    robots: 'index, follow',
  });

  expect(html).toContain('<title>스키마 $$ 테스트 - 로아끼욧</title>');
  expect(html).toContain(`<meta name="description" content="${description}" />`);

  const structuredDataMatch = html.match(/<script id="route-structured-data" type="application\/ld\+json">(.*?)<\/script>/s);
  expect(structuredDataMatch).not.toBeNull();
  const structuredData = JSON.parse(structuredDataMatch[1]);
  expect(structuredData['@graph']).toEqual(expect.arrayContaining([
    expect.objectContaining({
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      description,
    }),
  ]));
});

test('generates a noindex static 404 document with the home canonical', () => {
  const notFoundHtml = readFileSync(join(fixtureBuild, '404.html'), 'utf8');
  const canonical = `${siteUrl}/`;

  expect(notFoundHtml).toContain('<title>페이지를 찾을 수 없습니다 - 로아끼욧</title>');
  expect(notFoundHtml).toContain('<meta name="robots" content="noindex, follow" />');
  expect(notFoundHtml).toContain(`<link rel="canonical" href="${canonical}" />`);

  const structuredDataMatch = notFoundHtml.match(/<script id="route-structured-data" type="application\/ld\+json">(.*?)<\/script>/s);
  expect(structuredDataMatch).not.toBeNull();
  const structuredData = JSON.parse(structuredDataMatch[1]);
  expect(structuredData['@graph']).toEqual([
    expect.objectContaining({
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: canonical,
    }),
  ]);
});

test('keeps API, known routes, missing routes, and static assets distinct in Vercel routing', () => {
  const { outputDirectory, headers, rewrites } = require(join(projectRoot, 'vercel.json'));
  const apiRewrite = rewrites.find((rewrite) => rewrite.source === '/api/lostark/:path*');
  const materialIconSource = '/api/material-icon/:path(.*\\.png)';
  const materialIconRewrite = rewrites.find((rewrite) => rewrite.source === materialIconSource);
  const materialIconHeaders = headers.find((rule) => rule.source === materialIconSource);
  const fallbackRewrite = rewrites[rewrites.length - 1];
  const pageRewrites = rewrites.filter((rewrite) => rewrite.destination.endsWith('/index.html'));
  const indexablePageRoutes = routeSeoEntries
    .filter((route) => route.path !== '/' && route.robots === 'index, follow')
    .map((route) => route.path)
    .sort();

  expect(outputDirectory).toBe('build');
  expect(apiRewrite).toEqual({
    source: '/api/lostark/:path*',
    destination: '/api/lostark/[...]',
  });
  expect(materialIconRewrite).toEqual({
    source: materialIconSource,
    destination: 'https://cdn-lostark.game.onstove.com/:path',
  });
  expect(materialIconHeaders).toEqual({
    source: materialIconSource,
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      {
        key: 'Cache-Control',
        value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    ],
  });
  expect(pageRewrites.map((rewrite) => rewrite.source).sort()).toEqual(indexablePageRoutes);
  for (const rewrite of pageRewrites) {
    expect(rewrite.destination).toBe(`${rewrite.source}/index.html`);
  }
  expect(fallbackRewrite).toEqual({ source: '/:path*', destination: '/404.html' });
  expect(pageRewrites.some((rewrite) => rewrite.source === '/og-banner.png')).toBe(false);
  expect(existsSync(join(projectRoot, 'public', 'og-banner.png'))).toBe(true);
});
