const { mkdirSync, readFileSync, writeFileSync } = require('fs');
const { dirname, join } = require('path');

const SITE_URL = 'https://lokki.vercel.app';
const routeSeoPath = join(process.cwd(), 'src', 'constants', 'routeSeo.json');
const buildIndexPath = join(process.cwd(), 'build', 'index.html');
const buildNotFoundPath = join(process.cwd(), 'build', '404.html');

const NOT_FOUND_ROUTE = {
  path: '/',
  title: '페이지를 찾을 수 없습니다 - 로아끼욧',
  description: '요청하신 페이지를 찾을 수 없습니다. 로아끼욧 홈에서 원하는 기능을 찾아보세요.',
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
  return html.replace(pattern, tag);
}

function applyRouteSeo(html, route) {
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const robots = escapeHtml(route.robots);
  const canonical = escapeHtml(routeUrl(route.path));

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
