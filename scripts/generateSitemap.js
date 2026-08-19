const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const SITE_URL = 'https://lokki.vercel.app';
const routeSeoPath = join(process.cwd(), 'src', 'constants', 'routeSeo.json');
const sitemapPath = join(process.cwd(), 'public', 'sitemap.xml');

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function routeUrl(path) {
  return `${SITE_URL}${path === '/' ? '/' : path}`;
}

function buildSitemap(routes) {
  const urls = routes
    .filter((route) => route.robots === 'index, follow')
    .map(
      (route) => `  <url>
    <loc>${escapeXml(routeUrl(route.path))}</loc>
    <lastmod>${escapeXml(route.lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${escapeXml(route.priority)}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function main() {
  const routes = JSON.parse(readFileSync(routeSeoPath, 'utf8'));
  writeFileSync(sitemapPath, buildSitemap(routes));
}

if (require.main === module) {
  main();
}

module.exports = { buildSitemap };
