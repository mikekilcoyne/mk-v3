/* Shared state for /houston — the logic behind /api/houston.

   One JSON document holds everything Lee and Mike share: places, calendar
   plans, stamps, checklist ticks and checklist additions. Writes are
   read-modify-write with an etag check (`onlyIfMatch`), retried on
   conflict, so two phones tapping at once can't overwrite each other.

   No login, by design — the page is unlisted and the link is the key.
   Every write is validated and size-capped so a stray request can't
   wreck the document.

   `handle(request, store)` is storage-agnostic: Netlify passes a Blobs
   store (netlify/functions/houston.mjs); dev-server.js passes a file-backed
   one so it works locally too. */

const KEY = 'state';
const MAX = { spots: 300, plans: 300, extras: 200, ticks: 400 };

const TABS = ['eat', 'go', 'do'];
const ICONS = ['flame', 'taco', 'fork', 'glass', 'beer', 'coffee', 'art', 'chapel', 'tree', 'bat', 'rocket', 'wave', 'star'];
const SHAPES = ['rect', 'arch', 'circle', 'hex', 'diamond'];
const INKS = ['orange', 'teal', 'navy', 'green', 'maroon', 'purple', 'red'];
const PEOPLE = ['mike', 'lee'];

const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

// ── Validation ────────────────────────────────────────────────────────
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const oneOf = (v, list, dflt) => (list.includes(v) ? v : dflt);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isId = (v) => typeof v === 'string' && /^[a-z0-9-]{1,64}$/.test(v);
const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
function safeUrl(v) {
    const s = str(v, 600);
    if (!s) return '';
    try {
        const u = new URL(s);
        return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
    } catch { return ''; }
}

function cleanSpot(raw, prev) {
    const name = str(raw.name, 90);
    if (!name) throw new Error('A place needs a name.');
    return {
        id: prev ? prev.id : (isId(raw.id) ? raw.id : newId('s')),
        tab: oneOf(raw.tab, TABS, 'do'),
        name,
        stamp: (str(raw.stamp, 18) || name.slice(0, 18)).toUpperCase(),
        hood: str(raw.hood, 60),
        why: str(raw.why, 400),
        icon: oneOf(raw.icon, ICONS, 'star'),
        shape: oneOf(raw.shape, SHAPES, 'rect'),
        ink: oneOf(raw.ink, INKS, 'orange'),
        q: str(raw.q, 160),
        link: safeUrl(raw.link),
        from: oneOf(raw.from, PEOPLE, 'mike'),
        order: Number.isFinite(raw.order) ? raw.order : (prev ? prev.order : Date.now()),
        createdAt: prev ? prev.createdAt : Date.now()
    };
}

function cleanPlan(raw, prev) {
    const title = str(raw.title, 90);
    if (!title) throw new Error('A plan needs a title.');
    if (!isDate(raw.date)) throw new Error('A plan needs a date.');
    const plan = {
        id: prev ? prev.id : (isId(raw.id) ? raw.id : newId('p')),
        date: raw.date,
        time: str(raw.time, 30),
        title,
        note: str(raw.note, 200),
        idea: !!raw.idea,
        order: Number.isFinite(raw.order) ? raw.order : (prev ? prev.order : Date.now())
    };
    if (isId(raw.spot)) plan.spot = raw.spot;
    if (raw.kind === 'flight') plan.kind = 'flight';
    if (raw.room) plan.room = true;
    if (PEOPLE.includes(raw.from)) plan.from = raw.from;
    return plan;
}

const empty = () => ({ v: 1, seeded: false, spots: {}, plans: {}, stamps: {}, ticks: {}, extras: [], updatedAt: 0 });

// ── Operations ────────────────────────────────────────────────────────
function apply(state, op) {
    switch (op.op) {
        case 'seed': {
            if (state.seeded) return state;           // first phone wins; later seeds are no-ops
            (op.spots || []).slice(0, MAX.spots).forEach((s, i) => {
                const spot = cleanSpot({ ...s, order: i });
                state.spots[spot.id] = spot;
            });
            (op.plans || []).slice(0, MAX.plans).forEach((p, i) => {
                const plan = cleanPlan({ ...p, id: p.id || `p-seed-${i}`, order: i });
                state.plans[plan.id] = plan;
            });
            state.seeded = true;
            return state;
        }
        case 'stamp': {
            if (!state.spots[op.id]) throw new Error('No such place.');
            if (op.on) state.stamps[op.id] = isDate(op.date) ? op.date : new Date().toISOString().slice(0, 10);
            else delete state.stamps[op.id];
            return state;
        }
        case 'tick': {
            const t = str(op.text, 120);
            if (!t) throw new Error('Nothing to tick.');
            if (op.on) {
                if (Object.keys(state.ticks).length >= MAX.ticks) throw new Error('Checklist is full.');
                state.ticks[t] = true;
            } else delete state.ticks[t];
            return state;
        }
        case 'extra': {
            const t = str(op.text, 80);
            if (!t) throw new Error('Nothing to add.');
            if (op.on) {
                if (!state.extras.includes(t)) {
                    if (state.extras.length >= MAX.extras) throw new Error('Checklist is full.');
                    state.extras.push(t);
                }
            } else {
                state.extras = state.extras.filter((x) => x !== t);
                delete state.ticks[t];
            }
            return state;
        }
        case 'spot.save': {
            const prev = op.spot && isId(op.spot.id) ? state.spots[op.spot.id] : null;
            if (!prev && Object.keys(state.spots).length >= MAX.spots) throw new Error('Too many places.');
            const spot = cleanSpot(op.spot || {}, prev);
            state.spots[spot.id] = spot;
            state.lastSaved = spot.id;
            return state;
        }
        case 'spot.remove': {
            if (!isId(op.id)) throw new Error('No such place.');
            delete state.spots[op.id];
            delete state.stamps[op.id];
            Object.values(state.plans).forEach((p) => { if (p.spot === op.id) delete p.spot; });
            return state;
        }
        case 'plan.save': {
            const prev = op.plan && isId(op.plan.id) ? state.plans[op.plan.id] : null;
            if (!prev && Object.keys(state.plans).length >= MAX.plans) throw new Error('Too many plans.');
            const plan = cleanPlan(op.plan || {}, prev);
            state.plans[plan.id] = plan;
            state.lastSaved = plan.id;
            return state;
        }
        case 'plan.remove': {
            if (!isId(op.id)) throw new Error('No such plan.');
            delete state.plans[op.id];
            return state;
        }
        default:
            throw new Error('Unknown operation.');
    }
}

async function mutate(store, op) {
    for (let attempt = 0; attempt < 6; attempt++) {
        const cur = await store.getWithMetadata(KEY, { type: 'json' });
        const state = cur && cur.data ? cur.data : empty();
        delete state.lastSaved;
        const next = apply(state, op);
        next.updatedAt = Date.now();
        const res = await store.setJSON(KEY, next, cur && cur.etag ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
        if (!res || res.modified !== false) return next;
        await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
    }
    throw new Error('Busy — try again.');
}

// ── Link unfurling: paste a link, get a name ──────────────────────────
function blockedHost(host) {
    const h = host.toLowerCase();
    return h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') ||
        /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.includes(':') || h === '0';
}

function meta(html, name) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i');
    const tag = html.match(re);
    if (!tag) return '';
    const c = tag[0].match(/content=["']([^"']*)["']/i);
    return c ? decode(c[1]) : '';
}
function decode(s) {
    return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim();
}

async function unfurl(raw) {
    const url = safeUrl(raw);
    if (!url) return { error: 'That doesn’t look like a link.' };
    const u = new URL(url);
    if (blockedHost(u.hostname)) return { error: 'Can’t read that link.' };

    const out = { url, kind: 'web', title: '', description: '', site: u.hostname.replace(/^www\./, '') };
    const get = (target, accept = 'text/html') => fetch(target, {
        redirect: 'follow',
        signal: AbortSignal.timeout(7000),
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', Accept: accept }
    });

    try {
        if (/(^|\.)tiktok\.com$/.test(u.hostname)) {
            out.kind = 'tiktok';
            const r = await get(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, 'application/json');
            if (r.ok) {
                const d = await r.json();
                out.description = str(d.title, 400);
                out.site = d.author_name ? `TikTok · @${d.author_unique_id || d.author_name}` : 'TikTok';
            }
            return out;
        }

        const r = await get(url);
        const finalUrl = new URL(r.url || url);
        const isMaps = /google\.[a-z.]+$/.test(finalUrl.hostname) && finalUrl.pathname.startsWith('/maps') || finalUrl.hostname === 'maps.app.goo.gl';
        if (isMaps) {
            out.kind = 'maps';
            const place = finalUrl.pathname.match(/\/maps\/place\/([^/]+)/);
            if (place) out.title = decodeURIComponent(place[1].replace(/\+/g, ' '));
            else if (finalUrl.searchParams.get('q')) out.title = finalUrl.searchParams.get('q');
            out.site = 'Google Maps';
        }
        if (/(^|\.)instagram\.com$/.test(finalUrl.hostname)) out.kind = 'instagram';

        const type = r.headers.get('content-type') || '';
        if (r.ok && type.includes('html')) {
            const html = (await r.text()).slice(0, 400000);
            const title = meta(html, 'og:title') || decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '');
            if (!out.title) out.title = title.replace(/\s*[·|–-]\s*Google Maps\s*$/i, '');
            out.description = meta(html, 'og:description') || meta(html, 'description');
            const site = meta(html, 'og:site_name');
            if (site && out.kind === 'web') out.site = site;
        }
    } catch {
        /* Timeouts, blocks, logins — fine. The form still works by hand. */
    }
    out.title = str(out.title, 90);
    out.description = str(out.description, 400);
    return out;
}

// ── HTTP ──────────────────────────────────────────────────────────────
export async function handle(req, store) {
    const url = new URL(req.url);
    try {
        if (req.method === 'GET') {
            if (url.searchParams.has('unfurl')) return json(await unfurl(url.searchParams.get('unfurl')));
            const cur = await store.getWithMetadata(KEY, { type: 'json' });
            return json({ state: cur && cur.data ? cur.data : empty() });
        }
        if (req.method === 'POST') {
            const text = await req.text();
            if (text.length > 200000) return json({ error: 'Too big.' }, 413);
            const op = JSON.parse(text || '{}');
            const state = await mutate(store, op);
            return json({ state });
        }
        return json({ error: 'Method not allowed.' }, 405);
    } catch (e) {
        return json({ error: e.message || 'Something went wrong.' }, 400);
    }
}
