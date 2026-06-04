#!/usr/bin/env node
/*
 * manage.js — photo ingest for mikekilcoyne.com
 *
 * Drop raw photos into _inbox/<City>/ then run:  node manage.js
 *
 * For each _inbox subfolder it will:
 *   1. Optimize every image (resize to max 2000px, JPEG q80, HEIC/PNG -> JPG) via macOS `sips`
 *   2. Copy the optimized file into the matching photos_web/NN_CITY/ folder
 *   3. Register it in the qwestData array in js/script.js (isNew: true)
 *   4. For a brand-new city: create the numbered folder, add the qwestData entry,
 *      and (if _inbox/<City>/meta.json has {"country":"..."}) slot it into the
 *      matching COUNTRY_GROUPS list so it shows up in the location picker.
 *   5. Move processed originals to _inbox/_done/<City>/
 *
 * Folder naming: name the inbox folder with the EXACT display name you want, e.g.
 *     _inbox/Denver, CO/            (matches an existing city -> appends)
 *     _inbox/Lisbon, PT/            (new city -> meta.json should give country)
 *
 * Flags:
 *   --dry        Show what would happen, write nothing.
 *   --max=NNNN   Override max pixel dimension (default 2000).
 *   --q=NN       Override JPEG quality 0-100 (default 80).
 *
 * After running, fine-tune framing at /admin, then commit & push.
 * This script is local-only (it edits files; it does not git push).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const INBOX = path.join(ROOT, '_inbox');
const DONE = path.join(INBOX, '_done');
const PHOTOS_WEB = path.join(ROOT, 'photos_web');
const SCRIPT = path.join(ROOT, 'js', 'script.js');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const MAX = parseInt((args.find(a => a.startsWith('--max=')) || '').split('=')[1] || '2000', 10);
const QUALITY = parseInt((args.find(a => a.startsWith('--q=')) || '').split('=')[1] || '80', 10);

const IMG_RE = /\.(jpe?g|png|heic|heif|tiff?)$/i;

function log(...a) { console.log(...a); }
function die(msg) { console.error('\n  ✗ ' + msg + '\n'); process.exit(1); }

// ── Parse qwestData out of script.js (mirrors admin/index.html) ──────────────
function readScript() {
    return fs.readFileSync(SCRIPT, 'utf8');
}
function extractQwestData(src) {
    const start = src.indexOf('const qwestData = [');
    if (start === -1) die('Could not find `const qwestData = [` in script.js');
    const arrStart = src.indexOf('[', start);
    let depth = 0, i = arrStart;
    for (; i < src.length; i++) {
        if (src[i] === '[' || src[i] === '{') depth++;
        else if (src[i] === ']' || src[i] === '}') { depth--; if (depth === 0) break; }
    }
    const arrStr = src.slice(arrStart, i + 1);
    return new Function('return ' + arrStr)();
}

// ── Serialize qwestData back (mirrors admin serializer / existing style) ─────
function serializePhoto(p) {
    if (typeof p === 'string') return `"${p}"`;
    const parts = [`"src": "${p.src}"`];
    if (p.pos) parts.push(`"pos": "${p.pos}"`);
    if (p.hidden) parts.push(`"hidden": true`);
    if (p.isNew) parts.push(`"isNew": true`);
    return `{ ${parts.join(', ')} }`;
}
function serializeQwestData(data) {
    const entries = data.map(city => {
        const photos = city.photos.map(p => `                ${serializePhoto(p)}`).join(',\n');
        let cityStr = `            "location": "${city.location}",\n            "photos": [\n${photos}\n            ]`;
        if (city.hidden) cityStr += `,\n            "hidden": true`;
        return `        {\n${cityStr}\n        }`;
    });
    return `[\n${entries.join(',\n')}\n]`;
}
function writeQwestData(src, data) {
    const serialized = serializeQwestData(data);
    return src.replace(
        /const qwestData\s*=\s*\[[\s\S]*?\](?=\s*;)/,
        `const qwestData = ${serialized}`
    );
}

// ── Insert a new city into COUNTRY_GROUPS by label ───────────────────────────
function addToCountryGroup(src, country, location) {
    const re = new RegExp(`(\\{\\s*label:\\s*'${country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',\\s*cities:\\s*\\[)`);
    if (!re.test(src)) {
        log(`  ! Country group "${country}" not found in COUNTRY_GROUPS — add "${location}" manually.`);
        return src;
    }
    return src.replace(re, `$1'${location}',`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function normName(s) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function cityFolderFromSrc(city) {
    const p = city.photos.find(x => (typeof x === 'string' ? x : x.src));
    if (!p) return null;
    const src = typeof p === 'string' ? p : p.src;
    return path.dirname(src).replace(/^photos_web\//, ''); // e.g. 01_DENVER_CO
}
function nextCityNumber() {
    const nums = fs.readdirSync(PHOTOS_WEB)
        .map(d => /^(\d{2})_/.exec(d))
        .filter(Boolean)
        .map(m => parseInt(m[1], 10));
    return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, '0');
}
function slugFolder(num, location) {
    const base = location.toUpperCase().replace(/,/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    return `${num}_${base}`;
}
function sanitizeBase(name) {
    return path.basename(name, path.extname(name)).replace(/[^A-Za-z0-9._-]+/g, '_');
}
function uniqueName(dir, base) {
    let name = base + '.jpg', n = 1;
    while (fs.existsSync(path.join(dir, name))) { n++; name = `${base}-${n}.jpg`; }
    return name;
}
function optimize(srcFile, outFile) {
    if (DRY) return;
    execFileSync('/usr/bin/sips', [
        '-s', 'format', 'jpeg',
        '-s', 'formatOptions', String(QUALITY),
        '-Z', String(MAX),
        srcFile, '--out', outFile
    ], { stdio: 'ignore' });
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
    if (!fs.existsSync(INBOX)) die(`No _inbox/ folder. Create _inbox/<City>/ and drop photos in.`);

    const cityDirs = fs.readdirSync(INBOX, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== '_done')
        .map(d => d.name);

    if (!cityDirs.length) { log('  Nothing in _inbox/ to process.'); return; }

    let src = readScript();
    const qwestData = extractQwestData(src);
    let totalAdded = 0;

    for (const cityName of cityDirs) {
        const inDir = path.join(INBOX, cityName);
        const files = fs.readdirSync(inDir).filter(f => IMG_RE.test(f));
        if (!files.length) { log(`  (skip) "${cityName}" — no images`); continue; }

        // Match existing city by normalized location name
        let city = qwestData.find(c => normName(c.location) === normName(cityName));
        let folder, isNewCity = false;

        if (city) {
            folder = cityFolderFromSrc(city);
            log(`\n  ${cityName} → existing city (${folder})`);
        } else {
            isNewCity = true;
            const num = nextCityNumber();
            folder = slugFolder(num, cityName);
            city = { location: cityName, photos: [] };
            qwestData.push(city);
            log(`\n  ${cityName} → NEW city (${folder})`);

            const metaPath = path.join(inDir, 'meta.json');
            if (fs.existsSync(metaPath)) {
                const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                if (meta.country && !DRY) src = addToCountryGroup(src, meta.country, cityName);
                else if (meta.country) log(`    would add to country group: ${meta.country}`);
            } else {
                log(`    ! no meta.json — add "${cityName}" to COUNTRY_GROUPS in script.js to show in picker`);
            }
        }

        const destDir = path.join(PHOTOS_WEB, folder);
        if (!DRY) fs.mkdirSync(destDir, { recursive: true });

        for (const f of files) {
            const base = sanitizeBase(f);
            const outName = DRY ? base + '.jpg' : uniqueName(destDir, base);
            const outFile = path.join(destDir, outName);
            optimize(path.join(inDir, f), outFile);
            const relSrc = `photos_web/${folder}/${outName}`;
            city.photos.push({ src: relSrc, isNew: true });
            const sizeKB = DRY ? '?' : Math.round(fs.statSync(outFile).size / 1024);
            log(`    + ${f}  →  ${outName}  (${sizeKB} KB)`);
            totalAdded++;

            if (!DRY) {
                fs.mkdirSync(path.join(DONE, cityName), { recursive: true });
                fs.renameSync(path.join(inDir, f), path.join(DONE, cityName, f));
            }
        }
    }

    if (totalAdded === 0) { log('\n  No images added.'); return; }

    if (DRY) {
        log(`\n  [dry run] would add ${totalAdded} photo(s). Nothing written.\n`);
        return;
    }

    src = writeQwestData(src, qwestData);
    fs.writeFileSync(SCRIPT, src, 'utf8');

    log(`\n  ✓ Added ${totalAdded} photo(s) to qwestData.`);
    log(`  → Review framing at /admin (drag to reposition), then:`);
    log(`      git add -A && git commit -m "photos: ingest new images" && git push\n`);
}

main();
