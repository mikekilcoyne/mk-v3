#!/usr/bin/env node
/*
  SEO groundwork — sitemap.xml, robots.txt, canonical tags, optional analytics.

  Portable: everything site-specific lives in seo.config.json. To use on
  breakfastclubbing.com, copy this file + seo.config.json, change `site` and
  `name`, and run `node build-seo.js`. Pages are discovered from the
  filesystem, so nothing here hardcodes this site's structure.

  Run after manage-essays.js --rebuild, so generated essay pages are included.
*/

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'seo.config.json'), 'utf8'));
const SITE = CONFIG.site.replace(/\/$/, '');

/* Directories that never contain public pages, on any site. */
const SKIP_ALWAYS = new Set([
    '.git', 'node_modules', 'css', 'js', 'assets', 'photos_web',
    'content', 'docs', '_inbox', 'notes', 'netlify', '.claude'
]);
const noindex = new Set(CONFIG.noindex || []);

/* ---- discover pages ---- */

function findPages(dir = ROOT, rel = '') {
    const found = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_ALWAYS.has(entry.name)) continue;
            found.push(...findPages(abs, rel ? `${rel}/${entry.name}` : entry.name));
        } else if (entry.name === 'index.html') {
            found.push({ url: rel ? `/${rel}/` : '/', file: abs, dir: rel.split('/')[0] || '' });
        }
    }
    return found;
}

const all = findPages();
const pages = all.filter(p => !noindex.has(p.dir));
const excluded = all.filter(p => noindex.has(p.dir));

/* Skip unpublished essays — a page Google indexes before it's ready is worse
   than one it hasn't found yet. */
let unpublished = new Set();
try {
    const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/essays/index.json'), 'utf8'));
    idx.essays.filter(e => e.published === false).forEach(e => unpublished.add(`/${e.slug}/`));
} catch { /* no essay index on this site — fine */ }

const indexable = pages.filter(p => !unpublished.has(p.url));
const draft = pages.filter(p => unpublished.has(p.url));

/* ---- sitemap.xml ---- */

function lastmod(file) {
    return fs.statSync(file).mtime.toISOString().slice(0, 10);
}

const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    indexable.map(p =>
        '  <url>\n' +
        `    <loc>${SITE}${p.url}</loc>\n` +
        `    <lastmod>${lastmod(p.file)}</lastmod>\n` +
        `    <changefreq>${CONFIG.changefreq || 'monthly'}</changefreq>\n` +
        `    <priority>${(CONFIG.priority || {})[p.url] || CONFIG.defaultPriority || '0.7'}</priority>\n` +
        '  </url>'
    ).join('\n') +
    '\n</urlset>\n';

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

/* ---- robots.txt ---- */

const robots =
    'User-agent: *\n' +
    'Allow: /\n' +
    [...noindex].map(d => `Disallow: /${d}/`).join('\n') + '\n' +
    '\n' +
    `Sitemap: ${SITE}/sitemap.xml\n`;

fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots);

/* ---- canonical tags + analytics, injected idempotently ---- */

const A = CONFIG.analytics || {};
function analyticsSnippet() {
    if (!A.provider || !A.id) return '';
    if (A.provider === 'plausible') {
        return `<script defer data-domain="${A.id}" src="https://plausible.io/js/script.js"></script>`;
    }
    if (A.provider === 'ga4') {
        return `<script async src="https://www.googletagmanager.com/gtag/js?id=${A.id}"></script>\n` +
               `    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}` +
               `gtag('js',new Date());gtag('config','${A.id}');</script>`;
    }
    console.warn(`  ! unknown analytics provider "${A.provider}" — skipped`);
    return '';
}

const START = '<!-- seo:start -->';
const END = '<!-- seo:end -->';
let touched = 0;

for (const p of pages) {
    let html = fs.readFileSync(p.file, 'utf8');
    const isDraft = unpublished.has(p.url);

    const inner = [
        `<link rel="canonical" href="${SITE}${p.url}">`,
        isDraft ? '<meta name="robots" content="noindex, nofollow">' : null,
        analyticsSnippet() || null
    ].filter(Boolean).join('\n    ');

    const blockText = `${START}\n    ${inner}\n    ${END}`;
    const existing = new RegExp(`${START}[\\s\\S]*?${END}`);

    let next;
    if (existing.test(html)) {
        next = html.replace(existing, blockText);
    } else if (/<\/head>/i.test(html)) {
        next = html.replace(/<\/head>/i, `    ${blockText}\n</head>`);
    } else {
        console.warn(`  ! no </head> in ${p.url} — skipped`);
        continue;
    }

    if (next !== html) { fs.writeFileSync(p.file, next); touched++; }
}

/* Private areas get an explicit noindex, since robots.txt only asks politely
   and a Disallowed page can still be indexed if something links to it. */
for (const p of excluded) {
    let html = fs.readFileSync(p.file, 'utf8');
    const blockText = `${START}\n    <meta name="robots" content="noindex, nofollow">\n    ${END}`;
    const existing = new RegExp(`${START}[\\s\\S]*?${END}`);
    const next = existing.test(html)
        ? html.replace(existing, blockText)
        : (/<\/head>/i.test(html) ? html.replace(/<\/head>/i, `    ${blockText}\n</head>`) : html);
    if (next !== html) { fs.writeFileSync(p.file, next); touched++; }
}

/* ---- report ---- */

console.log(`\n  ${SITE}`);
console.log(`  → sitemap.xml    ${indexable.length} page${indexable.length === 1 ? '' : 's'}`);
indexable.forEach(p => console.log(`      ${p.url}`));
if (draft.length) {
    console.log(`  → excluded (unpublished, marked noindex):`);
    draft.forEach(p => console.log(`      ${p.url}`));
}
if (excluded.length) {
    console.log(`  → private (marked noindex):`);
    excluded.forEach(p => console.log(`      ${p.url}`));
}
console.log(`  → robots.txt     ${noindex.size} disallowed path${noindex.size === 1 ? '' : 's'}`);
console.log(`  → canonical tags injected into ${touched} file${touched === 1 ? '' : 's'}`);
console.log(`  → analytics      ${A.provider && A.id ? `${A.provider} (${A.id})` : 'not configured'}`);
console.log('\n  Done. Submit the sitemap in Search Console:');
console.log(`  https://search.google.com/search-console?resource_id=${encodeURIComponent(SITE)}\n`);
