/* /houston — Lee + Mike's Houston Adventures.

   Views (hash routes): #trip, #eat, #go, #do, #room.

   Shared state lives behind /api/houston (netlify/functions/houston.mjs):
   places, calendar plans, stamps, checklist ticks and additions. Both
   phones read and write the same document; the page polls while it's
   open. js/houston-data.js is the starting content — the first visit
   seeds the shared store from it, and after that the store is the truth.

   If the API can't be reached (offline, or a local file preview), the
   page keeps working on this phone and queues the changes, then sends
   them when it's back. */
(function () {
    const H = window.HOUSTON;
    if (!H) return;

    const API = '/api/houston';
    const POLL_MS = 15000;
    const TZ = 'America/Chicago';
    const main = document.getElementById('hx-main');
    const $ = (sel, root = document) => root.querySelector(sel);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ── Local storage (fails soft: private windows, blocked storage) ──
    function load(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    }
    function save(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* fine */ }
    }

    // ── Dates ─────────────────────────────────────────────────────────
    const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
    const asDate = (iso) => new Date(iso + 'T12:00:00Z');
    const fmt = (iso, opts) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts }).format(asDate(iso));
    function addDays(iso, n) {
        const d = asDate(iso);
        d.setUTCDate(d.getUTCDate() + n);
        return d.toISOString().slice(0, 10);
    }

    // ── State ─────────────────────────────────────────────────────────
    // The shape the server keeps. Seed it from houston-data.js so the page
    // renders instantly, even before (or without) the network.
    function seedState() {
        const spots = {};
        H.spots.forEach((s, i) => (spots[s.id] = { ...s, from: s.from || H.defaultFrom, order: i }));
        const plans = {};
        H.plans.forEach((p, i) => { const id = `p-seed-${i}`; plans[id] = { ...p, id, order: i }; });
        return { v: 1, seeded: false, spots, plans, stamps: load('hx-stamps', {}), ticks: load('hx-room', {}), extras: load('hx-room-extra', []), updatedAt: 0 };
    }
    let S = load('hx-cache', null) || seedState();
    let queue = load('hx-queue', []);   // ops made while offline, oldest first
    let online = false;

    const spotList = () => Object.values(S.spots).sort((a, b) => a.order - b.order);
    const planList = () => Object.values(S.plans).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.order - b.order));
    const roomItems = () => H.room.sections.flatMap((s) => s.items).concat(S.extras);
    const fromOf = (spot) => spot.from || H.defaultFrom;
    const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    function tripDays() {
        let start = H.trip.start;
        let end = H.trip.end;
        Object.values(S.plans).forEach((p) => { if (p.date < start) start = p.date; if (p.date > end) end = p.date; });
        const days = [];
        for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
        return days;
    }

    /* Apply an op locally — the same rules the server applies, so the
       screen updates instantly and the server's answer just confirms it. */
    function applyLocal(op) {
        switch (op.op) {
            case 'stamp': if (op.on) S.stamps[op.id] = op.date; else delete S.stamps[op.id]; break;
            case 'tick': if (op.on) S.ticks[op.text] = true; else delete S.ticks[op.text]; break;
            case 'extra':
                if (op.on) { if (!S.extras.includes(op.text)) S.extras.push(op.text); }
                else { S.extras = S.extras.filter((x) => x !== op.text); delete S.ticks[op.text]; }
                break;
            case 'spot.save': S.spots[op.spot.id] = { ...S.spots[op.spot.id], ...op.spot }; break;
            case 'spot.remove':
                delete S.spots[op.id]; delete S.stamps[op.id];
                Object.values(S.plans).forEach((p) => { if (p.spot === op.id) delete p.spot; });
                break;
            case 'plan.save': S.plans[op.plan.id] = { ...S.plans[op.plan.id], ...op.plan }; break;
            case 'plan.remove': delete S.plans[op.id]; break;
        }
    }

    function setState(next) {
        if (!next || !next.spots) return;
        S = next;
        queue.forEach(applyLocal);   // keep not-yet-sent changes visible on top
        save('hx-cache', S);
    }

    async function api(method, body) {
        const r = await fetch(API + (method === 'GET' && body ? body : ''), {
            method,
            headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
            body: method === 'POST' ? JSON.stringify(body) : undefined,
            cache: 'no-store'
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) { const e = new Error(data.error || 'Request failed'); e.status = r.status; throw e; }
        return data;
    }

    function setOnline(v) {
        online = v;
        const el = $('#hx-sync');
        if (!el) return;
        el.textContent = v ? (queue.length ? 'Syncing…' : 'Live') : 'Offline';
        el.dataset.state = v ? 'live' : 'off';
        el.title = v ? 'Shared with Lee + Mike' : 'Changes save on this phone and sync when you’re back online';
    }

    // One sender at a time; anything queued meanwhile goes out in the same run.
    let flushing = null;
    function flush() {
        if (!flushing) flushing = sendQueue().finally(() => { flushing = null; });
        return flushing;
    }
    async function sendQueue() {
        while (queue.length) {
            try {
                const { state } = await api('POST', queue[0]);
                queue.shift();
                save('hx-queue', queue);
                setState(state);
            } catch (e) {
                if (e.status === 400) { queue.shift(); save('hx-queue', queue); continue; }  // rejected: drop it
                throw e;
            }
        }
    }

    // Pull the shared state; on the very first visit anywhere, seed it.
    async function pull() {
        let { state } = await api('GET');
        if (!state.seeded) {
            const local = seedState();
            ({ state } = await api('POST', { op: 'seed', spots: Object.values(local.spots), plans: Object.values(local.plans) }));
        }
        setState(state);
    }

    let lastSync = 0;
    async function sync() {
        lastSync = Date.now();
        try {
            await pull();
            await flush();
            setOnline(true);
        } catch {
            setOnline(false);
        }
        render();
    }

    // Every change goes through here: show it now, send it, reconcile.
    async function commit(op) {
        applyLocal(op);
        save('hx-cache', S);
        render();
        queue.push(op);
        save('hx-queue', queue);
        try {
            if (!S.seeded) await pull();
            await flush();
            setOnline(true);
            render();
        } catch {
            setOnline(false);
            toast('Saved on this phone — it’ll sync when you’re back online.');
        }
    }

    let toastTimer;
    function toast(msg) {
        let t = $('#hx-toast');
        if (!t) { t = document.createElement('div'); t.id = 'hx-toast'; t.className = 'hx-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
        t.textContent = msg;
        t.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
    }

    // A little face for whoever recommended it. The initial sits underneath;
    // the photo covers it once loaded, or removes itself if it's missing.
    function who(key, label) {
        const p = H.people && H.people[key];
        if (!p) return '';
        return `<span class="hx-from"><span class="hx-av" aria-hidden="true" style="background:${esc(p.color || '#FFDD22')}">${esc(p.name[0])}<img src="${esc(p.photo)}" alt="" onerror="this.remove()"></span>${label ? `<span>${esc(label.replace('{name}', p.name))}</span>` : ''}</span>`;
    }

    // ── Stamp artwork ─────────────────────────────────────────────────
    const ICONS = {
        flame:  'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4.5 2-6.5 1 1 2 2.2 2 3.5 1-2 1-5 1-7z',
        taco:   'M3 17a9 9 0 0 1 18 0zM7.5 13.5c1-1 2-1 3 0M13 12.5c1-1 2-1 3 0M10 10.5c1-1 2-1 3 0',
        fork:   'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1.5-3 4-3 7.5h3',
        glass:  'M5 4h14l-7 8zM12 12v8M8 20h8M8.5 7.5h7',
        beer:   'M6 8h9v12H6zM15 11h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M6 8c0-2 1.5-3 3-3 1-1.3 3-1.3 4 0 1.5 0 2 1 2 3M9 11v6M12 11v6',
        coffee: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10.5h1.5a2 2 0 0 1 0 4H16M8.5 3.5v3M12 3.5v3',
        art:    'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15.5 8.5h.01',
        chapel: 'M12 2.5v4M10 4.5h4M5.5 21V11l6.5-4.5 6.5 4.5v10M10 21v-5a2 2 0 0 1 4 0v5',
        tree:   'M12 3l6 8h-3.5l4.5 6H5l4.5-6H6zM12 17v4',
        bat:    'M2 9c2 0 3.5 1 4 3 1-1.5 2.5-1.5 4-.5 0-1.2 1-2.5 2-2.5s2 1.3 2 2.5c1.5-1 3-1 4 .5.5-2 2-3 4-3-1 2-1 5-3.5 7-1-1-2.2-1-3.2 0-1-1-2-2-3.3-2s-2.3 1-3.3 2c-1-1-2.2-1-3.2 0C3 14 3 11 2 9z',
        rocket: 'M12 2.5c3 2 5 6 5 10l-2 4H9l-2-4c0-4 2-8 5-10zM9 16.5l-2.5 4 3.5-1.5M15 16.5l2.5 4-3.5-1.5M12 8.5v.01',
        wave:   'M3 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2M3 19.5c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2M17 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
        star:   'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'
    };

    // Sticker colorways, in the MK / YSJ palette. Each spot's `ink` maps to one.
    const STYLES = {
        yellow: { fill: '#FFDD22', fg: '#060606' },
        black:  { fill: '#060606', fg: '#FFDD22' },
        pink:   { fill: '#FF1D9C', fg: '#ffffff' },
        white:  { fill: '#ffffff', fg: '#060606' }
    };
    const INK_STYLE = { orange: 'yellow', green: 'yellow', navy: 'black', purple: 'black', teal: 'white', maroon: 'pink', red: 'pink' };
    const styleOf = (spot) => INK_STYLE[spot.ink] || 'yellow';

    function scallop(cx, cy, r, n) {
        const pts = [];
        for (let i = 0; i <= n; i++) {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
        const chord = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
        const ra = (chord / 2) * 1.1;
        return 'M' + pts[0].map((v) => v.toFixed(1)).join(' ') +
            pts.slice(1).map((p) => `A${ra.toFixed(1)} ${ra.toFixed(1)} 0 0 1 ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('') + 'Z';
    }

    // Each sticker shape: its outline path, and where the icon and name sit.
    const SHAPES = {
        rect:    { d: 'M32 10h56a24 24 0 0 1 24 24v52a24 24 0 0 1-24 24H32A24 24 0 0 1 8 86V34a24 24 0 0 1 24-24z', icon: [60, 40, 26], name: 76, nameW: 86 },
        arch:    { d: 'M12 104V58a48 48 0 0 1 96 0v46a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z', icon: [60, 44, 26], name: 80, nameW: 80 },
        circle:  { d: 'M60 8a52 52 0 1 1 0 104A52 52 0 0 1 60 8z', icon: [60, 38, 24], name: 74, nameW: 84 },
        hex:     { d: scallop(60, 60, 46, 12), icon: [60, 38, 24], name: 73, nameW: 74 },
        diamond: { d: 'M62 8c24 1 46 14 48 38s-6 50-30 60-58 6-68-18S8 44 24 26 40 7 62 8z', icon: [60, 40, 24], name: 76, nameW: 80 }
    };

    function splitName(name) {
        if (name.length <= 9 || !name.includes(' ')) return [name];
        const mid = name.length / 2;
        let best = -1;
        for (let i = 0; i < name.length; i++) {
            if (name[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
        }
        return [name.slice(0, best), name.slice(best + 1)];
    }

    function stampSVG(spot) {
        const sh = SHAPES[spot.shape] || SHAPES.rect;
        const st = STYLES[styleOf(spot)];
        const [cx, cy, size] = sh.icon;
        const lines = splitName(spot.stamp);
        const longest = Math.max(...lines.map((l) => l.length));
        // Clash Display caps run ~0.62em wide. Cap the size; fitStamps squeezes the rest.
        const fs = Math.max(9, Math.min(lines.length > 1 ? 14 : 17, sh.nameW / (longest * 0.62)));
        const text = lines.map((line, k) => {
            const y = sh.name + (lines.length > 1 ? (k === 0 ? -6 : 10) : 4);
            return `<text x="60" y="${y}" font-size="${fs.toFixed(1)}" data-max="${sh.nameW}">${esc(line)}</text>`;
        }).join('');
        const s = size / 24;
        return `<svg viewBox="-2 -2 126 126" aria-hidden="true">
            <path d="${sh.d}" transform="translate(4 4)" fill="#060606"/>
            <path d="${sh.d}" fill="${st.fill}" stroke="#060606" stroke-width="2.5"/>
            <path transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${s})" d="${ICONS[spot.icon] || ICONS.star}" fill="none" stroke="${st.fg}" stroke-width="${(2.1 / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
            <g fill="${st.fg}" text-anchor="middle" font-family="'Clash Display', 'Helvetica Neue', Arial, sans-serif" font-weight="700">${text}</g>
        </svg>`;
    }

    /* Names are sized from an estimate; this measures the real rendered
       width and squeezes any line that would cross the frame. Re-runs once
       the webfont lands, since the fallback face is wider. */
    function fitStamps(root) {
        root.querySelectorAll('text[data-max]').forEach((t) => {
            t.removeAttribute('textLength');
            t.removeAttribute('lengthAdjust');
            const max = +t.dataset.max;
            if (t.getComputedTextLength() > max) {
                t.setAttribute('textLength', max);
                t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
            }
        });
    }

    // Deterministic tilt so stamps look hand-pressed but don't jump around.
    function tilt(id) {
        let h = 0;
        for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
        return ((Math.abs(h) % 13) - 6) + 'deg';
    }

    // ── Header + stats ────────────────────────────────────────────────
    function renderHeader() {
        const days = tripDays();
        $('#hx-sub').textContent = `${fmt(days[0], { month: 'short', day: 'numeric' })}–${fmt(days[days.length - 1], { day: 'numeric' })} · Houston`;

        const spots = spotList();
        const got = spots.filter((s) => S.stamps[s.id]).length;
        const items = roomItems();
        const done = items.filter((t) => S.ticks[t]).length;
        const plans = planList();
        const next = plans.find((p) => !p.idea && p.date >= todayISO) || plans.find((p) => p.date >= todayISO);
        const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

        $('#hx-stats').innerHTML = `
            <a class="hx-stat hx-stat--yellow" href="#eat">
                <p class="hx-stat-label">Stamped</p>
                <p class="hx-stat-value">${got}<small> / ${spots.length}</small></p>
                <div class="hx-bar"><i style="width:${pct(got, spots.length)}%"></i></div>
                <p class="hx-stat-foot">${pct(got, spots.length)}% explored</p>
            </a>
            <a class="hx-stat hx-stat--pink" href="#room">
                <p class="hx-stat-label">Guest room</p>
                <p class="hx-stat-value">${done}<small> / ${items.length}</small></p>
                <div class="hx-bar"><i style="width:${pct(done, items.length)}%"></i></div>
                <p class="hx-stat-foot">${done === items.length ? 'AWESOME.' : pct(done, items.length) + '% awesome'}</p>
            </a>
            ${next ? `<a class="hx-stat hx-stat--black" href="#trip">
                <p class="hx-stat-label">Next up</p>
                <p class="hx-stat-value hx-stat-value--sm">${esc(next.title)}</p>
                <p class="hx-stat-foot" style="margin-top:10px">${next.date === todayISO ? 'Today' : fmt(next.date, { weekday: 'short', month: 'short', day: 'numeric' })}${next.time ? ' · ' + esc(next.time) : ''}</p>
            </a>` : ''}`;
    }

    // ── Views ─────────────────────────────────────────────────────────
    function viewStamps(tab) {
        const t = H.tabs[tab];
        const list = spotList().filter((s) => s.tab === tab);
        const got = list.filter((s) => S.stamps[s.id]).length;
        main.innerHTML = `
            <div class="hx-section-head"><h2>${esc(t.title)}</h2><span>${got} / ${list.length} been</span></div>
            <div class="hx-grid">
                ${list.map((s) => `
                    <button type="button" class="hx-stamp${S.stamps[s.id] ? ' is-stamped' : ''}" data-spot="${esc(s.id)}" style="--tilt:${tilt(s.id)}" aria-label="${esc(s.name)}${S.stamps[s.id] ? ', been there' : ''}">
                        ${S.stamps[s.id] ? '<span class="hx-been" aria-hidden="true">BEEN ✓</span>' : ''}
                        ${stampSVG(s)}
                        <span class="hx-stamp-meta">${who(fromOf(s), '{name}')}<span>${esc(s.hood)}</span></span>
                    </button>`).join('')}
                <button type="button" class="hx-stamp hx-stamp--add" data-add="spot" data-tab="${tab}">
                    <span class="hx-add-tile" aria-hidden="true">+</span>
                    <span class="hx-stamp-meta"><span>Add a spot</span></span>
                </button>
            </div>`;
    }

    function planRow(p) {
        const spot = p.spot && S.spots[p.spot];
        const tag = p.kind === 'flight' ? 'Flight' : p.idea ? 'Idea' : 'Plan';
        const from = p.from || (spot && fromOf(spot));
        return `
            <button type="button" class="hx-plan${p.kind === 'flight' ? ' hx-plan--flight' : ''}" data-plan="${esc(p.id)}">
                <span class="hx-plan-time">${esc(p.time)}</span>
                <span><p class="hx-plan-title">${from ? who(from) : ''}${esc(p.title)}${spot && S.stamps[spot.id] ? ' ✓' : ''}</p>${p.note ? `<p class="hx-plan-note">${esc(p.note)}</p>` : spot ? `<p class="hx-plan-note">${esc(spot.hood)}</p>` : ''}</span>
                <span class="hx-plan-tag${tag === 'Plan' ? ' hx-plan-tag--plan' : ''}">${tag}</span>
            </button>`;
    }

    function viewTrip() {
        const days = tripDays();
        const byDay = {};
        planList().forEach((p) => (byDay[p.date] = byDay[p.date] || []).push(p));

        // Busy days get their own block; runs of empty days collapse to one.
        const blocks = [];
        days.forEach((d) => {
            if (byDay[d]) blocks.push({ day: d });
            else if (blocks.length && blocks[blocks.length - 1].open) blocks[blocks.length - 1].to = d;
            else blocks.push({ open: true, from: d, to: d });
        });

        const label = (d) => fmt(d, { weekday: 'long', month: 'short', day: 'numeric' });
        main.innerHTML = `
            <div class="hx-section-head"><h2>The Trip</h2><span>${days.length} days</span></div>
            <div class="hx-days">
                ${days.map((d) => `
                    <a class="hx-day-chip${d === todayISO ? ' is-today' : byDay[d] ? ' has-plans' : ' is-empty'}" href="#trip" data-day="${d}">
                        <span>${fmt(d, { weekday: 'short' }).toUpperCase()}</span><strong>${fmt(d, { day: 'numeric' })}</strong>
                    </a>`).join('')}
            </div>
            ${blocks.map((b) => b.open ? `
                <div class="hx-day" id="day-${b.from}">
                    <button type="button" class="hx-plan hx-plan--open" data-add="plan" data-date="${b.from}">
                        <span class="hx-plan-time">${fmt(b.from, { month: 'short', day: 'numeric' })}${b.to !== b.from ? '–' + fmt(b.to, { day: 'numeric' }) : ''}</span>
                        <span><p class="hx-plan-title">Wide open</p><p class="hx-plan-note">Tap to add a plan</p></span>
                        <span class="hx-plan-tag">+ Add</span>
                    </button>
                </div>` : `
                <section class="hx-day" id="day-${b.day}">
                    <div class="hx-day-head">
                        <h3>${label(b.day)}</h3>
                        ${b.day === todayISO ? '<span>Today</span>' : ''}
                        <button type="button" class="hx-day-add" data-add="plan" data-date="${b.day}" aria-label="Add a plan on ${label(b.day)}">+</button>
                    </div>
                    ${byDay[b.day].map(planRow).join('')}
                </section>`).join('')}
            <p class="hx-note">Tap any row to change it. “Idea” rows are suggestions, not bookings. Everything here is shared between Lee and Mike.</p>`;
    }

    function viewRoom() {
        const r = H.room;
        const items = roomItems();
        const done = items.filter((t) => S.ticks[t]).length;
        const row = (t, custom) => `
            <li class="hx-check${S.ticks[t] ? ' is-done' : ''}">
                <label><input type="checkbox" data-tick="${esc(t)}"${S.ticks[t] ? ' checked' : ''}><span class="hx-box" aria-hidden="true"></span><span class="hx-check-text">${esc(t)}</span></label>
                ${custom ? `<button type="button" class="hx-check-x" data-remove="${esc(t)}" aria-label="Remove ${esc(t)}">&times;</button>` : ''}
            </li>`;
        const letter = (i) => String.fromCharCode(65 + i);
        main.innerHTML = `
            <div class="hx-section-head"><h2>${esc(r.title)}</h2><span>${fmt(r.date, { weekday: 'long' })} · ${done} / ${items.length}</span></div>
            <div class="hx-room-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${done}"><i style="width:${items.length ? Math.round((done / items.length) * 100) : 0}%"></i></div>
            ${r.sections.map((s, i) => `
                <h3 class="hx-check-head"><span class="hx-letter">${letter(i)}</span>${esc(s.name)}</h3>
                <ul class="hx-checklist">${s.items.map((t) => row(t, false)).join('')}</ul>`).join('')}
            <h3 class="hx-check-head"><span class="hx-letter">+</span>Our additions</h3>
            <ul class="hx-checklist">${S.extras.map((t) => row(t, true)).join('')}</ul>
            <form class="hx-add" id="hx-add">
                <input type="text" id="hx-add-text" placeholder="Add something to the list" maxlength="80" aria-label="New checklist item">
                <button type="submit">Add</button>
            </form>
            ${done === items.length && items.length ? '<p class="hx-done-note">Guest room: certified AWESOME.</p>' : ''}`;
    }

    // ── Routing ───────────────────────────────────────────────────────
    const VIEWS = ['trip', 'eat', 'go', 'do', 'room'];
    const currentView = () => (VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'trip');
    function render() {
        // Don't redraw under someone's thumbs mid-typing.
        if (document.activeElement && document.activeElement.id === 'hx-add-text' && document.activeElement.value) { renderHeader(); return; }
        const v = currentView();
        const y = window.scrollY;
        if (v === 'trip') viewTrip();
        else if (v === 'room') viewRoom();
        else viewStamps(v);
        document.querySelectorAll('#hx-tabs a').forEach((a) => {
            if (a.dataset.tab === v) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });
        renderHeader();
        fitStamps(main);
        window.scrollTo(0, y);
        if (!sheet.hidden && openSpotId) { if (S.spots[openSpotId]) paintSheet(); else closeSheet(); }
    }

    // ── Place sheet ───────────────────────────────────────────────────
    const sheet = $('#hx-sheet');
    let openSpotId = null;
    let lastFocus = null;

    const mapsHref = (s) => (s.link && /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/.test(s.link))
        ? s.link
        : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.q || s.name + ', Houston TX');
    const linkLabel = (url) => (/tiktok\.com/.test(url) ? 'Watch the TikTok ↗' : /instagram\.com/.test(url) ? 'See the post ↗' : 'Open the link ↗');

    function paintSheet() {
        const s = S.spots[openSpotId];
        $('#hx-sheet-card').dataset.style = styleOf(s);
        $('#hx-sheet-hood').innerHTML = who(fromOf(s), 'From {name}') + `<span>· ${esc(H.tabs[s.tab].title)}</span>`;
        $('#hx-sheet-name').textContent = s.name;
        $('#hx-sheet-stamp').innerHTML = stampSVG(s);
        const when = planList().filter((p) => p.spot === s.id).map((p) => `${fmt(p.date, { weekday: 'short', month: 'short', day: 'numeric' })}${p.time ? ' · ' + p.time : ''}${p.idea ? ' (idea)' : ''}`);
        $('#hx-sheet-about').innerHTML = [s.why, s.hood && `Where: ${s.hood}`]
            .concat(when.length ? [`On the calendar: ${when.join(', ')}`] : [])
            .filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join('');
        $('#hx-sheet-map').href = mapsHref(s);
        const link = $('#hx-sheet-link');
        if (s.link && mapsHref(s) !== s.link) { link.hidden = false; link.href = s.link; link.textContent = linkLabel(s.link); }
        else link.hidden = true;
        const btn = $('#hx-sheet-stampit');
        btn.textContent = S.stamps[s.id] ? `Been ✓ ${fmt(S.stamps[s.id], { month: 'short', day: 'numeric' })}` : 'Stamp it';
        btn.classList.toggle('is-done', !!S.stamps[s.id]);
        fitStamps(sheet);
    }

    function openSheet(id) {
        if (!S.spots[id]) return;
        openSpotId = id;
        lastFocus = document.activeElement;
        paintSheet();
        sheet.hidden = false;
        $('.hx-sheet-x', sheet).focus();
    }
    function closeSheet() {
        sheet.hidden = true;
        openSpotId = null;
        if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }

    $('#hx-sheet-stampit').addEventListener('click', () => {
        const id = openSpotId;
        const on = !S.stamps[id];
        commit({ op: 'stamp', id, on, date: todayISO });
        if (on) {
            const el = main.querySelector(`.hx-stamp[data-spot="${CSS.escape(id)}"]`);
            if (el) el.classList.add('just-stamped');
        }
    });
    $('#hx-sheet-edit').addEventListener('click', () => { const id = openSpotId; closeSheet(); openSpotForm(S.spots[id]); });
    $('#hx-sheet-plan').addEventListener('click', () => { const s = S.spots[openSpotId]; closeSheet(); openPlanForm({ spot: s.id, title: s.name, from: fromOf(s) }); });
    sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });

    // ── Forms: add / edit a place or a plan ───────────────────────────
    const form = $('#hx-form');
    const formCard = $('#hx-form-card');
    let formFocus = null;

    function openForm(html, onSubmit) {
        formFocus = document.activeElement;
        formCard.innerHTML = html;
        form.hidden = false;
        const f = $('form', formCard);
        f.addEventListener('submit', (e) => { e.preventDefault(); onSubmit(new FormData(f), f); });
        const first = $('[autofocus]', formCard) || $('input, textarea, select', formCard);
        if (first && !matchMedia('(hover: none)').matches) first.focus();
        else $('.hx-sheet-x', formCard).focus();
    }
    function closeForm() {
        form.hidden = true;
        formCard.innerHTML = '';
        if (formFocus && document.contains(formFocus)) formFocus.focus();
    }
    form.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeForm(); });

    const chips = (name, options, value) => `
        <div class="hx-chips" role="radiogroup">
            ${options.map(([v, label]) => `<label class="hx-chip"><input type="radio" name="${name}" value="${esc(v)}"${v === value ? ' checked' : ''}><span>${esc(label)}</span></label>`).join('')}
        </div>`;
    const PEOPLE = Object.entries(H.people).map(([k, p]) => [k, p.name]);
    const TAB_OPTS = [['eat', 'Eat + Drink'], ['go', 'Place to hit'], ['do', 'Adventure']];

    // New stickers pick an icon from what the place sounds like, and a
    // shape + color from its name, so they look at home next to the rest.
    function guessIcon(text, tab) {
        const t = text.toLowerCase();
        const rules = [[/bbq|brisket|smoke|sichuan|spicy|hot ?pot/, 'flame'], [/taco|mex|tex|burrito|fajita/, 'taco'], [/bar\b|cocktail|wine|speakeasy|lounge|spirits/, 'glass'],
            [/beer|brew|ice house|pub|tap/, 'beer'], [/coffee|cafe|café|espresso|bakery/, 'coffee'], [/museum|gallery|art|film|cinema|screening|theater|theatre/, 'art'],
            [/chapel|church|temple/, 'chapel'], [/park|garden|trail|bayou|hike|nature/, 'tree'], [/space|nasa|rocket|race|racing|kart|f1/, 'rocket'],
            [/beach|bay|lake|boat|kayak|gulf|pool/, 'wave'], [/bat\b|bats/, 'bat']];
        const hit = rules.find(([re]) => re.test(t));
        return hit ? hit[1] : tab === 'eat' ? 'fork' : 'star';
    }
    function hashOf(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
    const SHAPE_LIST = ['rect', 'arch', 'circle', 'hex', 'diamond'];
    const INK_LIST = ['orange', 'navy', 'maroon', 'teal', 'green', 'purple', 'red'];
    function stampText(name) {
        let t = name.toUpperCase().replace(/^THE\s+/, '');
        if (t.length <= 18) return t;
        t = t.slice(0, 18);
        return t.includes(' ') ? t.slice(0, t.lastIndexOf(' ')) : t;
    }

    function openSpotForm(spot, defaults = {}) {
        const s = spot || { tab: defaults.tab || 'eat', from: load('hx-me', H.defaultFrom), name: '', hood: '', why: '', link: '' };
        const editing = !!spot;
        openForm(`
            <button type="button" class="hx-sheet-x" data-close aria-label="Close">&times;</button>
            <p class="hx-sheet-kicker">${editing ? 'Edit' : 'New'} · ${editing ? esc(H.tabs[s.tab].title) : 'Drop a link'}</p>
            <h2>${editing ? esc(s.name) : 'Add a spot'}</h2>
            <form class="hx-fields" novalidate>
                <label class="hx-field">
                    <span>Link <em>Google Maps, TikTok, Instagram, a website…</em></span>
                    <span class="hx-link-row">
                        <input type="url" name="link" value="${esc(s.link)}" placeholder="Paste a link" inputmode="url" autocomplete="off">
                        <button type="button" class="hx-mini" data-paste>Paste</button>
                    </span>
                    <small class="hx-hint" id="hx-unfurl-hint"></small>
                </label>
                <label class="hx-field"><span>Name</span><input name="name" value="${esc(s.name)}" maxlength="90" placeholder="What’s it called?" required></label>
                <div class="hx-field"><span>What is it?</span>${chips('tab', TAB_OPTS, s.tab)}</div>
                <div class="hx-field"><span>Whose rec?</span>${chips('from', PEOPLE, s.from)}</div>
                <label class="hx-field"><span>Neighborhood <em>optional</em></span><input name="hood" value="${esc(s.hood)}" maxlength="60" placeholder="Montrose, Heights…"></label>
                <label class="hx-field"><span>Why go? <em>optional</em></span><textarea name="why" rows="3" maxlength="400" placeholder="One line on why it’s worth it">${esc(s.why)}</textarea></label>
                ${editing ? '' : `
                <div class="hx-field hx-field--row">
                    <label><span>Put it on the calendar? <em>optional</em></span><input type="date" name="date" min="${H.trip.start}"></label>
                    <label><span>Time</span><input name="time" maxlength="30" placeholder="7 PM"></label>
                </div>`}
                <p class="hx-form-error" id="hx-form-error" role="alert"></p>
                <div class="hx-sheet-actions">
                    ${editing ? '<button type="button" class="hx-btn hx-btn--ghost hx-btn--danger" data-delete>Delete</button>' : ''}
                    <button type="submit" class="hx-btn">${editing ? 'Save' : 'Add it'}</button>
                </div>
            </form>`, (fd) => {
            const name = String(fd.get('name') || '').trim();
            if (!name) return formError('Give it a name.');
            const tab = fd.get('tab') || 'do';
            const from = fd.get('from') || H.defaultFrom;
            save('hx-me', from);
            const why = String(fd.get('why') || '').trim();
            const next = {
                ...(spot || {}),
                id: spot ? spot.id : newId('s'),
                tab, from, name,
                hood: String(fd.get('hood') || '').trim(),
                why,
                link: String(fd.get('link') || '').trim(),
                stamp: spot && spot.name === name ? spot.stamp : stampText(name),
                icon: spot ? spot.icon : guessIcon(`${name} ${why}`, tab),
                shape: spot ? spot.shape : SHAPE_LIST[hashOf(name) % SHAPE_LIST.length],
                ink: spot ? spot.ink : INK_LIST[hashOf(name + '!') % INK_LIST.length],
                q: spot ? spot.q : `${name}, Houston TX`,
                order: spot ? spot.order : Date.now()
            };
            commit({ op: 'spot.save', spot: next });
            const date = fd.get('date');
            if (!spot && date) commit({ op: 'plan.save', plan: { id: newId('p'), date, time: String(fd.get('time') || '').trim(), title: name, spot: next.id, idea: false, order: Date.now() } });
            closeForm();
            if (!spot) {
                if (currentView() !== tab && !date) location.hash = tab;
                toast(date ? `Added “${name}” and put it on ${fmt(date, { weekday: 'short', month: 'short', day: 'numeric' })}.` : `Added “${name}”.`);
            }
        });

        const linkInput = $('input[name="link"]', formCard);
        const hint = $('#hx-unfurl-hint', formCard);
        let lastUnfurled = s.link;
        async function unfurl() {
            const url = linkInput.value.trim();
            if (!url || url === lastUnfurled || !/^https?:\/\//i.test(url)) return;
            lastUnfurled = url;
            hint.textContent = 'Reading the link…';
            try {
                const d = await api('GET', '?unfurl=' + encodeURIComponent(url));
                if (d.error) { hint.textContent = d.error; return; }
                const nameEl = $('input[name="name"]', formCard);
                const whyEl = $('textarea[name="why"]', formCard);
                if (d.title && !nameEl.value) nameEl.value = d.title;
                if (d.description && !whyEl.value) whyEl.value = d.description.slice(0, 220);
                hint.textContent = d.title || d.description ? `Got it from ${d.site}. Tweak anything.` : `Couldn’t read much from ${d.site || 'that link'} — fill in the name.`;
                if (!nameEl.value) nameEl.focus();
            } catch {
                hint.textContent = 'Couldn’t read the link right now — fill it in by hand; the link still saves.';
            }
        }
        linkInput.addEventListener('change', unfurl);
        linkInput.addEventListener('paste', () => setTimeout(unfurl, 0));
        $('[data-paste]', formCard).addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) { linkInput.value = text.trim(); unfurl(); }
            } catch { linkInput.focus(); hint.textContent = 'Long-press the box and choose Paste.'; }
        });
        const del = $('[data-delete]', formCard);
        if (del) del.addEventListener('click', () => {
            if (!confirm(`Delete “${spot.name}”? Its stamp goes too, and calendar rows lose the link to it.`)) return;
            commit({ op: 'spot.remove', id: spot.id });
            closeForm();
            toast(`Deleted “${spot.name}”.`);
        });
        if (defaults.link) { linkInput.value = defaults.link; unfurl(); }
    }

    function openPlanForm(plan = {}) {
        const editing = !!plan.id;
        const spotOpts = [['', 'No place']].concat(spotList().map((s) => [s.id, s.name]));
        openForm(`
            <button type="button" class="hx-sheet-x" data-close aria-label="Close">&times;</button>
            <p class="hx-sheet-kicker">${editing ? 'Edit plan' : 'New plan'}${plan.date ? ' · ' + fmt(plan.date, { weekday: 'long', month: 'short', day: 'numeric' }) : ''}</p>
            <h2>${editing ? esc(plan.title) : 'Add to the calendar'}</h2>
            <form class="hx-fields" novalidate>
                <label class="hx-field"><span>What</span><input name="title" value="${esc(plan.title || '')}" maxlength="90" placeholder="Dinner, a show, a road trip…" required${editing ? '' : ' autofocus'}></label>
                <div class="hx-field hx-field--row">
                    <label><span>Day</span><input type="date" name="date" value="${esc(plan.date || todayISO)}" required></label>
                    <label><span>Time</span><input name="time" value="${esc(plan.time || '')}" maxlength="30" placeholder="7 PM, Morning…"></label>
                </div>
                <label class="hx-field"><span>Note <em>optional</em></span><input name="note" value="${esc(plan.note || '')}" maxlength="200" placeholder="Book ahead, meet there…"></label>
                <label class="hx-field"><span>Linked place <em>optional</em></span>
                    <select name="spot">${spotOpts.map(([v, l]) => `<option value="${esc(v)}"${v === (plan.spot || '') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
                </label>
                <div class="hx-field"><span>Is it decided?</span>${chips('idea', [['plan', 'It’s a plan'], ['idea', 'Just an idea']], plan.idea ? 'idea' : 'plan')}</div>
                <p class="hx-form-error" id="hx-form-error" role="alert"></p>
                <div class="hx-sheet-actions">
                    ${editing ? '<button type="button" class="hx-btn hx-btn--ghost hx-btn--danger" data-delete>Remove</button>' : ''}
                    ${plan.spot && S.spots[plan.spot] ? '<button type="button" class="hx-btn hx-btn--ghost" data-open-spot>Open place</button>' : ''}
                    <button type="submit" class="hx-btn">${editing ? 'Save' : 'Add it'}</button>
                </div>
            </form>`, (fd) => {
            const title = String(fd.get('title') || '').trim();
            const date = String(fd.get('date') || '');
            if (!title) return formError('What’s the plan?');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return formError('Pick a day.');
            const next = {
                ...plan,
                id: plan.id || newId('p'),
                title, date,
                time: String(fd.get('time') || '').trim(),
                note: String(fd.get('note') || '').trim(),
                idea: fd.get('idea') === 'idea',
                order: plan.order ?? Date.now()
            };
            const spotId = String(fd.get('spot') || '');
            if (spotId) next.spot = spotId; else delete next.spot;
            commit({ op: 'plan.save', plan: next });
            closeForm();
            if (location.hash !== '#trip') location.hash = 'trip';
            if (!editing) toast(`On the calendar: ${fmt(date, { weekday: 'short', month: 'short', day: 'numeric' })}.`);
        });
        const del = $('[data-delete]', formCard);
        if (del) del.addEventListener('click', () => {
            if (!confirm(`Take “${plan.title}” off the calendar?`)) return;
            commit({ op: 'plan.remove', id: plan.id });
            closeForm();
        });
        const open = $('[data-open-spot]', formCard);
        if (open) open.addEventListener('click', () => { closeForm(); openSheet(plan.spot); });
    }

    function formError(msg) { const e = $('#hx-form-error', formCard); if (e) e.textContent = msg; }

    // The + button adds whatever fits the tab you're on.
    $('#hx-fab').addEventListener('click', () => {
        const v = currentView();
        if (v === 'trip') openPlanForm({ date: todayISO >= H.trip.start ? todayISO : H.trip.start });
        else if (v === 'room') { location.hash = 'room'; const i = $('#hx-add-text'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } }
        else openSpotForm(null, { tab: v });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!form.hidden) closeForm();
        else if (!sheet.hidden) closeSheet();
    });

    // ── Delegated clicks + checklist ──────────────────────────────────
    main.addEventListener('click', (e) => {
        const add = e.target.closest('[data-add]');
        if (add) {
            e.preventDefault();
            if (add.dataset.add === 'plan') openPlanForm({ date: add.dataset.date });
            else openSpotForm(null, { tab: add.dataset.tab });
            return;
        }
        const spotEl = e.target.closest('[data-spot]');
        if (spotEl) { e.preventDefault(); openSheet(spotEl.dataset.spot); return; }

        const planEl = e.target.closest('[data-plan]');
        if (planEl) { const p = S.plans[planEl.dataset.plan]; if (p) openPlanForm(p); return; }

        const chip = e.target.closest('[data-day]');
        if (chip) {
            e.preventDefault();
            const target = document.getElementById('day-' + chip.dataset.day) ||
                [...document.querySelectorAll('.hx-day[id^="day-"]')].reverse().find((el) => el.id.slice(4) <= chip.dataset.day);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        const rm = e.target.closest('[data-remove]');
        if (rm) commit({ op: 'extra', text: rm.dataset.remove, on: false });
    });

    main.addEventListener('change', (e) => {
        const box = e.target.closest('[data-tick]');
        if (box) commit({ op: 'tick', text: box.dataset.tick, on: box.checked });
    });

    main.addEventListener('submit', (e) => {
        if (e.target.id !== 'hx-add') return;
        e.preventDefault();
        const input = $('#hx-add-text');
        const t = input.value.trim();
        if (!t || roomItems().includes(t)) return;
        input.value = '';
        commit({ op: 'extra', text: t, on: true });
        const again = $('#hx-add-text');
        if (again) again.focus();
    });

    // ── Share ─────────────────────────────────────────────────────────
    $('#hx-share').addEventListener('click', async () => {
        const url = location.origin + location.pathname;
        const label = $('#hx-share .hx-share-label');
        try {
            if (navigator.share) await navigator.share({ title: document.title, url });
            else { await navigator.clipboard.writeText(url); label.textContent = 'Copied'; setTimeout(() => (label.textContent = 'Share'), 1600); }
        } catch { /* dismissed */ }
    });

    // ── Go ────────────────────────────────────────────────────────────
    window.addEventListener('hashchange', () => {
        render();
        window.scrollTo(0, 0);
        if (Date.now() - lastSync > 4000) sync();   // switching tabs is a good moment to catch up
    });

    // ?add=<link> opens the add form with that link — handy from an iOS
    // Shortcut or a bookmark: mikekilcoyne.com/houston/?add=https://…
    const params = new URLSearchParams(location.search);
    const addLink = params.get('add');

    setOnline(false);
    render();
    if (document.fonts) document.fonts.ready.then(() => { fitStamps(main); if (!sheet.hidden) fitStamps(sheet); });
    sync().then(() => {
        if (addLink) {
            history.replaceState(null, '', location.pathname + location.hash);
            openSpotForm(null, { tab: 'do', link: addLink });
        }
    });

    // Stay current while the page is open; catch up the moment it's back.
    setInterval(() => { if (document.visibilityState === 'visible' && form.hidden) sync(); }, POLL_MS);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
    window.addEventListener('online', sync);
}());
