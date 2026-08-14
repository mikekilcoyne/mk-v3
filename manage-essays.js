#!/usr/bin/env node
/*
 * manage-essays.js — photo essay ingest for mikekilcoyne.com
 *
 * Drop a folder into _inbox/essays/<slug>/ containing:
 *     essay.md      the writing (optional frontmatter, see below)
 *     *.jpg         the photos, named so they sort into story order
 *
 * Then run:  node manage-essays.js
 *
 * For each folder it will:
 *   1. Optimize every photo (max 1920px, JPEG q82) into photos_web/essays/<slug>/
 *   2. Parse essay.md into chapters (# headings) and text blocks (paragraph runs)
 *   3. Write content/essays/<slug>.json — the file the site actually reads
 *   4. Generate <slug>/index.html so the essay lives at mikekilcoyne.com/<slug>
 *   5. Register it in content/essays/index.json
 *   6. Move the originals to _inbox/essays/_done/<slug>/
 *
 * Re-running on an essay that already exists PRESERVES the photo choices and
 * focal points you set in /admin/essays — only the writing is refreshed. That
 * way fixing a typo never costs you the framing work.
 *
 * essay.md format:
 *     ---
 *     title: How to Be Happy
 *     location: Kyoto, JP
 *     description: One line for search results and link previews.
 *     ---
 *
 *     # Chapter Heading          <- starts a new chapter (optional)
 *
 *     A paragraph.
 *     Another paragraph in the same text card.
 *
 *     ---                        <- force a new text card
 *
 *     Text for the next card. *Italics* with asterisks.
 *
 * Flags:
 *   --dry            Show what would happen, write nothing.
 *   --rebuild        Skip ingest; regenerate index.html + index.json from
 *                    the existing content/essays/*.json files.
 *   --max=NNNN       Max pixel dimension (default 1920).
 *   --q=NN           JPEG quality 0-100 (default 82).
 *   --per-block=N    Paragraphs per text card before splitting (default 4).
 *
 * Local-only: this edits files, it never commits or pushes.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const INBOX = path.join(ROOT, '_inbox', 'essays');
const DONE = path.join(INBOX, '_done');
const PHOTOS = path.join(ROOT, 'photos_web', 'essays');
const CONTENT = path.join(ROOT, 'content', 'essays');
const INDEX_FILE = path.join(CONTENT, 'index.json');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const REBUILD = args.includes('--rebuild');
const flag = (name, def) => {
    const a = args.find(x => x.startsWith(`--${name}=`));
    return a ? parseInt(a.split('=')[1], 10) : def;
};
const MAX = flag('max', 1920);
const QUALITY = flag('q', 82);
const PER_BLOCK = flag('per-block', 4);

const IMG_RE = /\.(jpe?g|png|heic|heif|tiff?)$/i;
const SITE = 'https://mikekilcoyne.com';

const log = (...a) => console.log(...a);
const die = msg => { console.error('\n  ✗ ' + msg + '\n'); process.exit(1); };

/* ── Text → chapters/blocks ─────────────────────────────────────────── */

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Straight quotes read as typewriter text at this size; curl them. */
function smarten(s) {
    return s
        .replace(/"([^"]*)"/g, '“$1”')
        .replace(/(\w)'(\w)/g, '$1’$2')
        .replace(/'/g, '’')
        .replace(/(\s)-{2,}(\s)/g, '$1—$2');
}

function inline(s) {
    /* Escape first, then re-introduce the one markup we support. */
    return smarten(escapeHtml(s)).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function parseFrontmatter(text) {
    const meta = {};
    const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!m) return { meta, body: text };
    m[1].split('\n').forEach(line => {
        const i = line.indexOf(':');
        if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
    return { meta, body: text.slice(m[0].length) };
}

function parseEssay(text) {
    const { meta, body } = parseFrontmatter(text);
    const chapters = [];
    let chapter = null;
    let block = [];

    const pushBlock = () => {
        if (block.length) { chapter.blocks.push(block); block = []; }
    };
    const pushChapter = heading => {
        pushBlock();
        chapter = { heading: heading || '', label: heading || '', img: '', pos: '50% 50%', blocks: [] };
        chapters.push(chapter);
    };
    pushChapter('');

    const lines = body.split('\n');
    let para = [];
    const flushPara = () => {
        if (!para.length) return;
        block.push(inline(para.join(' ').trim()));
        para = [];
        /* Keep cards to a readable length; long runs split automatically. */
        if (block.length >= PER_BLOCK) pushBlock();
    };

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) { flushPara(); continue; }
        if (/^#{1,3}\s+/.test(line)) {
            flushPara();
            pushChapter(line.replace(/^#{1,3}\s+/, '').trim());
            continue;
        }
        if (/^(---|\*\*\*)$/.test(line)) { flushPara(); pushBlock(); continue; }
        para.push(line);
    }
    flushPara();
    pushBlock();

    /* Drop a leading chapter that only exists because the file opened with a heading. */
    const cleaned = chapters.filter(c => c.blocks.length || c.heading);
    if (!meta.title && cleaned.length && cleaned[0].heading) {
        meta.title = cleaned[0].heading;
        cleaned[0].heading = '';
    }
    return { meta, chapters: cleaned };
}

/* ── Photos ─────────────────────────────────────────────────────────── */

function optimize(src, dest) {
    if (DRY) return;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    execFileSync('sips', ['-Z', String(MAX), '-s', 'formatOptions', String(QUALITY),
        src, '--out', dest], { stdio: 'ignore' });
}

/* ── Page + index generation ────────────────────────────────────────── */

function esc(s) { return String(s || '').replace(/"/g, '&quot;'); }

function pageHtml(essay) {
    /* Mirrors essay.js imgPath: names with a slash are already full paths. */
    const ogImg = essay.cover.img.includes('/')
        ? `${SITE}/${essay.cover.img}`
        : `${SITE}/${essay.photoDir}/${essay.cover.img}`;
    const desc = esc(essay.description);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Generated by manage-essays.js from content/essays/${essay.slug}.json.
         Re-run \`node manage-essays.js --rebuild\` after changing title/description. -->
    <title>${esc(essay.title)} — Michael Kilcoyne</title>
    <meta name="description" content="${desc}">
    <meta property="og:title" content="${esc(essay.title)}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${ogImg}">
    <meta property="og:url" content="${SITE}/${essay.slug}">
    <meta property="og:type" content="article">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${ogImg}">
    <link rel="preconnect" href="https://api.fontshare.com" crossorigin>
    <link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>
    <link href="https://api.fontshare.com/v2/css?f%5B%5D=clash-display@700&f%5B%5D=gambetta@400,500,401&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/essay.css?v=14">
</head>
<body class="essay-body" data-essay="${essay.slug}">
    <main id="essay-root"></main>
    <script src="/js/essay.js?v=14"></script>
</body>
</html>
`;
}

function writeEssay(essay) {
    const jsonPath = path.join(CONTENT, `${essay.slug}.json`);
    const htmlDir = path.join(ROOT, essay.slug);
    log(`    → content/essays/${essay.slug}.json`);
    log(`    → ${essay.slug}/index.html`);
    if (DRY) return;
    fs.mkdirSync(CONTENT, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(essay, null, 2) + '\n');
    fs.mkdirSync(htmlDir, { recursive: true });
    fs.writeFileSync(path.join(htmlDir, 'index.html'), pageHtml(essay));
}

function rebuildIndex() {
    const files = fs.existsSync(CONTENT)
        ? fs.readdirSync(CONTENT).filter(f => f.endsWith('.json') && f !== 'index.json')
        : [];
    const existing = fs.existsSync(INDEX_FILE)
        ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')).essays || []
        : [];
    const order = existing.map(e => e.slug);

    const essays = files.map(f => {
        const d = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'));
        return { slug: d.slug, title: d.title, published: d.published !== false };
    }).sort((a, b) => {
        /* Keep the order already set in index.json; new essays go on top. */
        const ai = order.indexOf(a.slug), bi = order.indexOf(b.slug);
        if (ai === -1 && bi === -1) return a.slug.localeCompare(b.slug);
        if (ai === -1) return -1;
        if (bi === -1) return 1;
        return ai - bi;
    });

    log(`    → content/essays/index.json (${essays.length} essays)`);
    if (!DRY) fs.writeFileSync(INDEX_FILE, JSON.stringify({ essays }, null, 2) + '\n');
}

/* Every photo under photos_web, grouped by folder. The admin panel reads
   this to offer photos from the whole library, not just one essay's
   folder — timeline pages like /now pull from many cities at once. */
function rebuildPhotoManifest() {
    const root = path.join(ROOT, 'photos_web');
    if (!fs.existsSync(root)) return;
    const manifest = {};
    const walk = dir => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const imgs = entries.filter(e => e.isFile() && IMG_RE.test(e.name))
                            .map(e => e.name).sort();
        if (imgs.length) manifest[path.relative(root, dir)] = imgs;
        entries.filter(e => e.isDirectory())
               .forEach(e => walk(path.join(dir, e.name)));
    };
    fs.readdirSync(root, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(e => walk(path.join(root, e.name)));

    const total = Object.values(manifest).reduce((n, v) => n + v.length, 0);
    /* Lives beside content/essays/, not inside it — the rebuild loop
       treats every JSON in that folder as an essay. */
    log(`    → content/photos.json (${total} photos in ${Object.keys(manifest).length} folders)`);
    if (!DRY) fs.writeFileSync(path.join(ROOT, 'content', 'photos.json'),
        JSON.stringify(manifest, null, 1) + '\n');
}

/* ── Ingest one inbox folder ────────────────────────────────────────── */

function ingest(slug) {
    const dir = path.join(INBOX, slug);
    const files = fs.readdirSync(dir);
    const textFile = files.find(f => /\.(md|txt)$/i.test(f));
    if (!textFile) { log(`  ⚠ ${slug}: no .md or .txt file — skipped`); return false; }

    const photos = files.filter(f => IMG_RE.test(f)).sort();
    const { meta, chapters } = parseEssay(fs.readFileSync(path.join(dir, textFile), 'utf8'));

    log(`\n  ${slug}`);
    log(`    ${chapters.length} chapters · ${chapters.reduce((n, c) => n + c.blocks.length, 0)} text cards · ${photos.length} photos`);

    /* Optimize photos into the essay's web folder. */
    const outDir = path.join(PHOTOS, slug);
    const webNames = [];
    photos.forEach(f => {
        const name = f.replace(IMG_RE, '.jpg');
        optimize(path.join(dir, f), path.join(outDir, name));
        webNames.push(name);
    });

    /* Carry over prior photo assignments + focal points so /admin tuning survives. */
    const jsonPath = path.join(CONTENT, `${slug}.json`);
    const prev = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : null;
    const prevChapters = prev ? prev.chapters : [];
    const available = webNames.length ? webNames
        : (prev ? prevChapters.map(c => c.img).filter(Boolean) : []);

    chapters.forEach((c, i) => {
        const old = prevChapters[i];
        c.img = (old && old.img) || available[i % (available.length || 1)] || '';
        c.pos = (old && old.pos) || '50% 50%';
        if (old && old.label) c.label = old.label;
    });

    const essay = {
        slug,
        title: meta.title || prev?.title || slug,
        credit: meta.credit || prev?.credit || 'A photo essay. Original photos by Michael Kilcoyne.',
        location: meta.location || prev?.location || '',
        description: meta.description || prev?.description || '',
        published: prev ? prev.published !== false : true,
        date: meta.date || prev?.date || new Date().toISOString().slice(0, 10),
        photoDir: `photos_web/essays/${slug}`,
        /* Every photo in the folder, so /admin/essays can offer them as swaps. */
        photos: available,
        cover: prev?.cover || { img: available[0] || '', pos: '50% 50%' },
        chapters,
        end: prev?.end || {
            title: meta.end || 'Thanks for reading.',
            img: available[available.length - 1] || '',
            pos: '50% 50%',
            shareSubject: meta.title || slug,
            shareBody: `Hey, recently read this photo essay from Michael Kilcoyne, thought of you.\n\nHere's the link:\n{url}`
        }
    };

    writeEssay(essay);

    /* Park the originals so the inbox stays clean. */
    if (!DRY) {
        const doneDir = path.join(DONE, slug);
        fs.mkdirSync(doneDir, { recursive: true });
        files.forEach(f => fs.renameSync(path.join(dir, f), path.join(doneDir, f)));
        fs.rmdirSync(dir);
    }
    log(`    → originals moved to _inbox/essays/_done/${slug}/`);
    return true;
}

/* ── Main ───────────────────────────────────────────────────────────── */

log(`\n  Photo essay ingest${DRY ? ' (dry run)' : ''}\n  ${'─'.repeat(40)}`);

if (REBUILD) {
    log('\n  Rebuilding pages + index from content/essays/*.json');
    const files = fs.readdirSync(CONTENT).filter(f => f.endsWith('.json') && f !== 'index.json');
    files.forEach(f => writeEssay(JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'))));
    rebuildIndex();
    rebuildPhotoManifest();
} else {
    if (!fs.existsSync(INBOX)) {
        fs.mkdirSync(INBOX, { recursive: true });
        die(`No inbox yet — created _inbox/essays/.\n    Drop a folder in there (essay.md + photos) and run this again.`);
    }
    const slugs = fs.readdirSync(INBOX)
        .filter(f => !f.startsWith('_') && !f.startsWith('.'))
        .filter(f => fs.statSync(path.join(INBOX, f)).isDirectory());

    if (!slugs.length) {
        log('\n  Nothing in _inbox/essays/ to ingest.');
        log('  Drop a folder there named with the URL you want, e.g.');
        log('  _inbox/essays/how-to-be-happy/  (essay.md + photos)\n');
        process.exit(0);
    }
    let n = 0;
    slugs.forEach(s => { if (ingest(s)) n++; });
    if (n) { rebuildIndex(); rebuildPhotoManifest(); }
}

log(`\n  Done.${DRY ? ' (dry run — nothing written)' : ''}`);
log('  Next: open /admin/essays to set photos + framing, then Save + Deploy.\n');
