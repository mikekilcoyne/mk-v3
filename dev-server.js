#!/usr/bin/env node
/*
  Local dev server. Two jobs beyond serving files:

  1. Injects js/annotate.js into every HTML response, so the annotation
     overlay is available on every page without touching a single source
     file. Nothing about this reaches production — Netlify serves the
     static tree directly and never runs this script.

  2. Accepts POST /__notes and appends to notes/design-notes.json, which is
     what Claude reads to action the notes.

  Run it via `node dev-server.js` (or the mk-site launch config).
*/

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8001;
const NOTES_FILE = path.join(ROOT, 'notes', 'design-notes.json');

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
    '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
    '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

function readNotes() {
    try {
        return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function writeNotes(notes) {
    fs.mkdirSync(path.dirname(NOTES_FILE), { recursive: true });
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2) + '\n');
}

function send(res, code, type, body) {
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
}

function collect(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', c => {
            raw += c;
            if (raw.length > 1e6) { req.destroy(); reject(new Error('too large')); }
        });
        req.on('end', () => resolve(raw));
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    /* ---- notes API ---- */
    if (url.pathname === '/__notes') {
        if (req.method === 'GET') {
            return send(res, 200, TYPES['.json'], JSON.stringify(readNotes()));
        }
        if (req.method === 'POST') {
            try {
                const incoming = JSON.parse(await collect(req));
                const notes = readNotes();
                notes.push({
                    id: 'n' + Date.now().toString(36),
                    created: new Date().toISOString(),
                    status: 'open',
                    ...incoming
                });
                writeNotes(notes);
                return send(res, 200, TYPES['.json'], JSON.stringify({ ok: true, count: notes.length }));
            } catch (err) {
                return send(res, 400, TYPES['.json'], JSON.stringify({ ok: false, error: String(err) }));
            }
        }
        if (req.method === 'DELETE') {
            const id = url.searchParams.get('id');
            const notes = readNotes().filter(n => id ? n.id !== id : false);
            writeNotes(notes);
            return send(res, 200, TYPES['.json'], JSON.stringify({ ok: true, count: notes.length }));
        }
        return send(res, 405, TYPES['.txt'], 'method not allowed');
    }

    /* ---- static files ---- */
    let rel = decodeURIComponent(url.pathname);
    let file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT)) return send(res, 403, TYPES['.txt'], 'forbidden');

    try {
        if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    } catch {
        return send(res, 404, TYPES['.txt'], 'not found');
    }

    let body;
    try {
        body = fs.readFileSync(file);
    } catch {
        return send(res, 404, TYPES['.txt'], 'not found');
    }

    const ext = path.extname(file).toLowerCase();
    if (ext === '.html') {
        /* Inject the overlay just before </body> so it runs after page JS. */
        const tag = `<script src="/js/annotate.js?t=${Date.now()}"></script>`;
        body = body.toString('utf8').replace(/<\/body>/i, `${tag}\n</body>`);
    }

    send(res, 200, TYPES[ext] || 'application/octet-stream', body);
});

server.listen(PORT, () => {
    console.log(`mk-site dev server → http://localhost:${PORT}`);
    console.log(`annotation overlay injected into every page · notes → notes/design-notes.json`);
});
