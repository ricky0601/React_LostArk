const { mkdirSync, readFileSync, writeFileSync } = require('fs');
const { dirname, join } = require('path');

const SITE_URL = 'https://lokki.vercel.app';
const routeSeoPath = join(process.cwd(), 'src', 'constants', 'routeSeo.json');
const buildIndexPath = join(process.cwd(), 'build', 'index.html');
const buildNotFoundPath = join(process.cwd(), 'build', '404.html');

const NOT_FOUND_ROUTE = {
  path: '/',
  title: '페이지를 찾을 수 없습니다 - 로아끼욧',
  description: '요청하신 로아끼욧 페이지를 찾을 수 없습니다. 홈에서 로스트아크 캐릭터 조회와 주간 골드 계산 기능을 이용해 주세요.',
  robots: 'noindex, follow',
};

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function routeUrl(path) {
  return `${SITE_URL}${path === '/' ? '/' : path}`;
}

function replaceTag(html, pattern, tag) {
  if (!pattern.test(html)) {
    throw new Error(`Missing SEO tag for ${tag}`);
  }
  return html.replace(pattern, () => tag);
}

function buildStructuredData(route) {
  const canonical = routeUrl(route.path);
  const websiteId = `${SITE_URL}/#website`;
  const graph = [
    {
      '@type': 'WebSite',
      '@id': websiteId,
      name: '로아끼욧',
      url: `${SITE_URL}/`,
      inLanguage: 'ko-KR',
      description: '로아끼욧에서 로스트아크 캐릭터 조회, 원정대 주간 골드 계산, 스펙 시뮬레이터, 강화·거래소·지출 관리를 한 번에 확인하세요.',
    },
  ];

  if (route.robots === 'noindex, follow') {
    return { '@context': 'https://schema.org', '@graph': graph };
  }

  const pageName = route.name || route.title.replace(/\s[-|]\s로아끼욧$/, '');
  const schemaType = route.schemaType === 'WebApplication' ? 'WebApplication' : 'WebPage';
  const page = {
    '@type': schemaType,
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: pageName,
    description: route.description,
    inLanguage: 'ko-KR',
    isPartOf: { '@id': websiteId },
  };

  if (schemaType === 'WebApplication') {
    page.applicationCategory = 'GameApplication';
    page.operatingSystem = 'Web';
    page.offers = { '@type': 'Offer', price: '0', priceCurrency: 'KRW' };
  }

  graph.push(page);

  if (route.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: pageName, item: canonical },
      ],
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

function applyRouteSeo(html, route) {
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const robots = escapeHtml(route.robots);
  const canonical = escapeHtml(routeUrl(route.path));
  const structuredData = JSON.stringify(buildStructuredData(route)).replaceAll('<', '\\u003c');

  return [
    (value) => replaceTag(value, /<title>.*?<\/title>/, `<title>${title}</title>`),
    (value) => replaceTag(value, /<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${description}" />`),
    (value) => replaceTag(value, /<meta name="robots" content="[^"]*"\s*\/>/, `<meta name="robots" content="${robots}" />`),
    (value) => replaceTag(value, /<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`),
    (value) => replaceTag(value, /<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`),
    (value) => replaceTag(value, /<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${description}" />`),
    (value) => replaceTag(value, /<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`),
    (value) => replaceTag(value, /<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${title}" />`),
    (value) => replaceTag(value, /<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${description}" />`),
    (value) => replaceTag(value, /<script id="route-structured-data" type="application\/ld\+json">.*?<\/script>/s, `<script id="route-structured-data" type="application/ld+json">${structuredData}</script>`),
  ].reduce((currentHtml, transform) => transform(currentHtml), html);
}

function routeOutputPath(path) {
  return path === '/'
    ? buildIndexPath
    : join(process.cwd(), 'build', path.replace(/^\//, ''), 'index.html');
}

function main() {
  const routes = JSON.parse(readFileSync(routeSeoPath, 'utf8'));
  const indexHtml = readFileSync(buildIndexPath, 'utf8');

  for (const route of routes) {
    const outputPath = routeOutputPath(route.path);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, applyRouteSeo(indexHtml, route));
  }

  writeFileSync(buildNotFoundPath, applyRouteSeo(indexHtml, NOT_FOUND_ROUTE));
}

if (require.main === module) {
  main();
}

module.exports = { applyRouteSeo };
