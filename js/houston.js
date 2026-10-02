/* /houston — renders everything from window.HOUSTON (js/houston-data.js).

   Views (hash routes): #trip, #eat, #go, #do, #room.
   Stamps and checklist ticks are kept in localStorage — per phone, not
   shared between Lee's and Mike's. */
(function () {
    const H = window.HOUSTON;
    if (!H) return;

    const TZ = 'America/Chicago';
    const main = document.getElementById('hx-main');
    const $ = (sel, root = document) => root.querySelector(sel);
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ── Storage (fails soft: private windows, blocked storage) ────────
    function load(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    }
    function save(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* fine */ }
    }
    let stamps = load('hx-stamps', {});      // { spotId: 'YYYY-MM-DD' }
    let ticks = load('hx-room', {});         // { itemText: true }
    let extras = load('hx-room-extra', []);  // [ 'text', ... ]

    // ── Dates ─────────────────────────────────────────────────────────
    const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
    const asDate = (iso) => new Date(iso + 'T12:00:00Z');
    const fmt = (iso, opts) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts }).format(asDate(iso));
    function addDays(iso, n) {
        const d = asDate(iso);
        d.setUTCDate(d.getUTCDate() + n);
        return d.toISOString().slice(0, 10);
    }
    const tripDays = [];
    for (let d = H.trip.start; d <= H.trip.end; d = addDays(d, 1)) tripDays.push(d);

    // A little face for whoever recommended it. The initial sits underneath;
    // the photo covers it once loaded, or removes itself if it's missing.
    function who(key, label) {
        const p = H.people && H.people[key];
        if (!p) return '';
        return `<span class="hx-from"><span class="hx-av" aria-hidden="true" style="background:${esc(p.color || '#f2782a')}">${esc(p.name[0])}<img src="${esc(p.photo)}" alt="" onerror="this.remove()"></span>${label ? `<span>${esc(label.replace('{name}', p.name))}</span>` : ''}</span>`;
    }

    const fromOf = (spot) => spot.from || H.defaultFrom;
    const spotsById = Object.fromEntries(H.spots.map((s) => [s.id, s]));
    const roomItems = () => H.room.sections.flatMap((s) => s.items).concat(extras);

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

    // Each frame: outer + inner outline, and where the icon / name / foot sit.
    const SHAPES = {
        rect:    { o: '<rect x="8" y="12" width="104" height="96" rx="5"/>', i: '<rect x="14" y="18" width="92" height="84" rx="2"/>', icon: [60, 44, 26], name: 76, nameW: 84, foot: 95 },
        arch:    { o: '<path d="M12 110V56a48 48 0 0 1 96 0v54z"/>', i: '<path d="M18 104V56a42 42 0 0 1 84 0v48z"/>', icon: [60, 42, 26], name: 76, nameW: 80, foot: 96 },
        circle:  { o: '<circle cx="60" cy="60" r="52"/>', i: '<circle cx="60" cy="60" r="46"/>', icon: [60, 38, 24], name: 70, nameW: 82, foot: 89 },
        hex:     { o: '<path d="M60 6l50 27v54l-50 27-50-27V33z"/>', i: '<path d="M60 13l44 23.5v47L60 107 16 83.5v-47z"/>', icon: [60, 38, 24], name: 70, nameW: 82, foot: 89 },
        diamond: { o: '<path d="M60 4l56 56-56 56L4 60z"/>', i: '<path d="M60 12l48 48-48 48-48-48z"/>', icon: [60, 36, 22], name: 66, nameW: 72, foot: 86 }
    };

    function splitName(name) {
        if (name.length <= 10 || !name.includes(' ')) return [name];
        const mid = name.length / 2;
        let best = -1;
        for (let i = 0; i < name.length; i++) {
            if (name[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
        }
        return [name.slice(0, best), name.slice(best + 1)];
    }

    function stampSVG(spot) {
        const sh = SHAPES[spot.shape] || SHAPES.rect;
        const [cx, cy, size] = sh.icon;
        const lines = splitName(spot.stamp);
        const longest = Math.max(...lines.map((l) => l.length));
        // Oswald caps run ~0.5em wide. Cap the size, then squeeze if needed.
        const fs = Math.max(10, Math.min(lines.length > 1 ? 14 : 17, sh.nameW / (longest * 0.5)));
        const text = lines.map((line, k) => {
            const y = sh.name + (lines.length > 1 ? (k === 0 ? -7 : 9) : 2);
            return `<text x="60" y="${y}" font-size="${fs.toFixed(1)}" data-max="${sh.nameW}">${esc(line)}</text>`;
        }).join('');
        const s = size / 24;
        return `<svg viewBox="0 0 120 120" aria-hidden="true" class="ink-${spot.ink}">
            <g fill="none" stroke="currentColor" stroke-linejoin="round">
                <g stroke-width="3.4">${sh.o}</g><g stroke-width="1.2">${sh.i}</g>
                <path transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${s})" d="${ICONS[spot.icon] || ICONS.star}" stroke-width="${(1.8 / s).toFixed(2)}" stroke-linecap="round"/>
            </g>
            <g fill="currentColor" text-anchor="middle" font-family="Oswald, 'Arial Narrow', Impact, sans-serif" font-weight="600" letter-spacing=".5">${text}</g>
            <text x="60" y="${sh.foot + (lines.length > 1 ? 3 : 0)}" fill="currentColor" text-anchor="middle" font-family="'DM Mono', monospace" font-size="6.5" letter-spacing="2">HOUSTON · TX</text>
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
        const range = `${fmt(H.trip.start, { month: 'short', day: 'numeric' })} – ${fmt(H.trip.end, { month: 'short', day: 'numeric' })}`;
        $('#hx-sub').textContent = `${range} · ${H.spots.length} spots saved`;

        const got = H.spots.filter((s) => stamps[s.id]).length;
        const items = roomItems();
        const done = items.filter((t) => ticks[t]).length;
        const next = H.plans.find((p) => !p.idea && p.date >= todayISO) || H.plans.find((p) => p.date >= todayISO);
        const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

        $('#hx-stats').innerHTML = `
            <a class="hx-stat" href="#eat" style="text-decoration:none;color:inherit">
                <p class="hx-stat-label">Stamped</p>
                <p class="hx-stat-value">${got}<small> / ${H.spots.length}</small></p>
                <div class="hx-bar"><i style="width:${pct(got, H.spots.length)}%"></i></div>
                <p class="hx-stat-foot">${pct(got, H.spots.length)}% explored</p>
            </a>
            <a class="hx-stat" href="#room" style="text-decoration:none;color:inherit">
                <p class="hx-stat-label">Guest room</p>
                <p class="hx-stat-value">${done}<small> / ${items.length}</small></p>
                <div class="hx-bar"><i style="width:${pct(done, items.length)}%"></i></div>
                <p class="hx-stat-foot">${done === items.length ? 'AWESOME.' : pct(done, items.length) + '% awesome'}</p>
            </a>
            ${next ? `<a class="hx-stat" href="#trip" style="text-decoration:none;color:inherit">
                <p class="hx-stat-label">Next up</p>
                <p class="hx-stat-value hx-stat-value--sm">${esc(next.title)}</p>
                <p class="hx-stat-foot" style="margin-top:10px">${next.date === todayISO ? 'Today' : fmt(next.date, { weekday: 'short', month: 'short', day: 'numeric' })} · ${esc(next.time)}</p>
            </a>` : ''}`;
    }

    // ── Views ─────────────────────────────────────────────────────────
    function viewStamps(tab) {
        const t = H.tabs[tab];
        const list = H.spots.filter((s) => s.tab === tab);
        const got = list.filter((s) => stamps[s.id]).length;
        main.innerHTML = `
            <div class="hx-section-head"><h2>${esc(t.title)}</h2><span>${got} of ${list.length} stamped</span></div>
            <div class="hx-page">
                <div class="hx-page-head"><span>${esc(t.blurb)}</span><span>Entry / Sortie</span></div>
                <div class="hx-grid">
                    ${list.map((s) => `
                        <button type="button" class="hx-stamp${stamps[s.id] ? ' is-stamped' : ''}" data-spot="${s.id}" style="--tilt:${tilt(s.id)}" aria-label="${esc(s.name)}${stamps[s.id] ? ', stamped' : ''}">
                            ${stampSVG(s)}
                            <span class="hx-stamp-meta">${who(fromOf(s), '{name}')}${esc(s.hood)}${stamps[s.id] ? `<b>✓ ${fmt(stamps[s.id], { month: 'short', day: 'numeric' }).toUpperCase()}</b>` : ''}</span>
                        </button>`).join('')}
                </div>
                <p class="hx-page-foot">Tap a stamp for the why, directions, and to stamp it once you’ve been.</p>
            </div>`;
    }

    function planRow(p) {
        const spot = p.spot && spotsById[p.spot];
        const tag = p.kind === 'flight' ? 'Flight' : p.idea ? 'Idea' : 'Plan';
        const from = p.from || (spot && fromOf(spot));
        const cls = `hx-plan${p.kind === 'flight' ? ' hx-plan--flight' : ''}`;
        const inner = `
            <span class="hx-plan-time">${esc(p.time)}</span>
            <span><p class="hx-plan-title">${from ? who(from) : ''}${esc(p.title)}${spot && stamps[spot.id] ? ' ✓' : ''}</p>${p.note ? `<p class="hx-plan-note">${esc(p.note)}</p>` : spot ? `<p class="hx-plan-note">${esc(spot.hood)}</p>` : ''}</span>
            <span class="hx-plan-tag">${tag}</span>`;
        if (spot) return `<a class="${cls}" href="#${spot.tab}" data-spot="${spot.id}">${inner}</a>`;
        if (p.room) return `<a class="${cls}" href="#room">${inner}</a>`;
        return `<div class="${cls}">${inner}</div>`;
    }

    function viewTrip() {
        const byDay = {};
        H.plans.forEach((p) => (byDay[p.date] = byDay[p.date] || []).push(p));

        // Busy days get their own card; runs of empty days collapse to one.
        const blocks = [];
        tripDays.forEach((d) => {
            if (byDay[d]) blocks.push({ day: d });
            else if (blocks.length && blocks[blocks.length - 1].open) blocks[blocks.length - 1].to = d;
            else blocks.push({ open: true, from: d, to: d });
        });

        const label = (d) => fmt(d, { weekday: 'long', month: 'short', day: 'numeric' });
        main.innerHTML = `
            <div class="hx-section-head"><h2>The Trip</h2><span>${tripDays.length} days</span></div>
            <div class="hx-stats hx-days-scroll" style="margin-top:0;grid-auto-columns:64px">
                ${tripDays.map((d) => `
                    <a class="hx-day-chip${d === todayISO ? ' is-today' : ''}" href="#trip" data-day="${byDay[d] ? d : ''}" style="${byDay[d] ? '' : 'opacity:.45'}">
                        <span>${fmt(d, { weekday: 'short' }).toUpperCase()}</span><strong>${fmt(d, { day: 'numeric' })}</strong>
                    </a>`).join('')}
            </div>
            ${blocks.map((b) => b.open ? `
                <div class="hx-day">
                    <a class="hx-plan hx-plan--open" href="#do">
                        <span class="hx-plan-time">${fmt(b.from, { month: 'short', day: 'numeric' })}${b.to !== b.from ? '–' + fmt(b.to, { day: 'numeric' }) : ''}</span>
                        <span><p class="hx-plan-title">Wide open</p><p class="hx-plan-note">Pick an adventure →</p></span>
                        <span></span>
                    </a>
                </div>` : `
                <section class="hx-day" id="day-${b.day}">
                    <div class="hx-day-head"><h3>${label(b.day)}</h3>${b.day === todayISO ? '<span class="is-today">Today</span>' : ''}</div>
                    ${byDay[b.day].map(planRow).join('')}
                </section>`).join('')}
            <p class="hx-note">“Idea” rows are suggestions, not bookings. Stamps and checklist ticks save on this phone.</p>`;
    }

    function viewRoom() {
        const r = H.room;
        const items = roomItems();
        const done = items.filter((t) => ticks[t]).length;
        const row = (t, custom) => `
            <li class="hx-check${ticks[t] ? ' is-done' : ''}">
                <label><input type="checkbox" data-tick="${esc(t)}"${ticks[t] ? ' checked' : ''}><span class="hx-box" aria-hidden="true"></span><span class="hx-check-text">${esc(t)}</span></label>
                ${custom ? `<button type="button" class="hx-check-x" data-remove="${esc(t)}" aria-label="Remove ${esc(t)}">&times;</button>` : ''}
            </li>`;
        main.innerHTML = `
            <div class="hx-section-head"><h2>${esc(r.title)}</h2><span>${fmt(r.date, { weekday: 'long' })}</span></div>
            <div class="hx-page">
                <div class="hx-page-head"><span>Mission: awesome</span><span>${done} / ${items.length}</span></div>
                <div class="hx-bar hx-bar--paper"><i style="width:${items.length ? Math.round((done / items.length) * 100) : 0}%"></i></div>
                ${r.sections.map((s) => `
                    <h3 class="hx-check-head">${esc(s.name)}</h3>
                    <ul class="hx-checklist">${s.items.map((t) => row(t, false)).join('')}</ul>`).join('')}
                <h3 class="hx-check-head">Our additions</h3>
                <ul class="hx-checklist">${extras.map((t) => row(t, true)).join('')}</ul>
                <form class="hx-add" id="hx-add">
                    <input type="text" id="hx-add-text" placeholder="Add something to the list" maxlength="80" aria-label="New checklist item">
                    <button type="submit">Add</button>
                </form>
                ${done === items.length && items.length ? '<p class="hx-page-foot hx-done-note">Guest room: certified AWESOME.</p>' : ''}
            </div>`;
    }

    // ── Routing ───────────────────────────────────────────────────────
    const VIEWS = ['trip', 'eat', 'go', 'do', 'room'];
    function route() {
        const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'trip';
        if (v === 'trip') viewTrip();
        else if (v === 'room') viewRoom();
        else viewStamps(v);
        document.querySelectorAll('#hx-tabs a').forEach((a) => {
            if (a.dataset.tab === v) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });
        renderHeader();
        fitStamps(main);
    }

    // ── Detail sheet ──────────────────────────────────────────────────
    const sheet = $('#hx-sheet');
    let openSpot = null;
    let lastFocus = null;

    function paintSheet() {
        const s = openSpot;
        $('#hx-sheet-stamp').innerHTML = stampSVG(s);
        $('#hx-sheet-hood').innerHTML = who(fromOf(s), 'From {name}') + `<span>${esc(s.hood)}</span>`;
        $('#hx-sheet-name').textContent = s.name;
        $('#hx-sheet-why').textContent = s.why;
        $('#hx-sheet-map').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.q || s.name + ', Houston TX');
        const btn = $('#hx-sheet-stampit');
        btn.textContent = stamps[s.id] ? `Stamped ${fmt(stamps[s.id], { month: 'short', day: 'numeric' })} ✓` : 'Stamp it';
        btn.classList.toggle('is-done', !!stamps[s.id]);
    }

    function openSheet(id) {
        openSpot = spotsById[id];
        if (!openSpot) return;
        lastFocus = document.activeElement;
        paintSheet();
        sheet.hidden = false;
        fitStamps(sheet);
        $('.hx-sheet-x', sheet).focus();
    }
    function closeSheet() {
        sheet.hidden = true;
        openSpot = null;
        if (lastFocus) lastFocus.focus();
    }

    $('#hx-sheet-stampit').addEventListener('click', () => {
        const id = openSpot.id;
        if (stamps[id]) delete stamps[id];
        else stamps[id] = todayISO;
        save('hx-stamps', stamps);
        paintSheet();
        fitStamps(sheet);
        route();
        if (stamps[id]) {
            const el = main.querySelector(`.hx-stamp[data-spot="${id}"]`);
            if (el) el.classList.add('just-stamped');
        }
    });
    sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

    // ── Delegated clicks + checklist ──────────────────────────────────
    main.addEventListener('click', (e) => {
        const spotEl = e.target.closest('[data-spot]');
        if (spotEl) { e.preventDefault(); openSheet(spotEl.dataset.spot); return; }

        const chip = e.target.closest('[data-day]');
        if (chip) {
            e.preventDefault();
            const target = chip.dataset.day && document.getElementById('day-' + chip.dataset.day);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        const rm = e.target.closest('[data-remove]');
        if (rm) {
            const t = rm.dataset.remove;
            extras = extras.filter((x) => x !== t);
            delete ticks[t];
            save('hx-room-extra', extras);
            save('hx-room', ticks);
            route();
        }
    });

    main.addEventListener('change', (e) => {
        const box = e.target.closest('[data-tick]');
        if (!box) return;
        if (box.checked) ticks[box.dataset.tick] = true;
        else delete ticks[box.dataset.tick];
        save('hx-room', ticks);
        const y = window.scrollY;
        route();
        window.scrollTo(0, y);
    });

    main.addEventListener('submit', (e) => {
        if (e.target.id !== 'hx-add') return;
        e.preventDefault();
        const input = $('#hx-add-text');
        const t = input.value.trim();
        if (t && !roomItems().includes(t)) {
            extras.push(t);
            save('hx-room-extra', extras);
            route();
            const again = $('#hx-add-text');
            if (again) again.focus();
        }
    });

    // ── Share ─────────────────────────────────────────────────────────
    $('#hx-share').addEventListener('click', async () => {
        const url = location.origin + location.pathname;
        const label = $('#hx-share span');
        try {
            if (navigator.share) await navigator.share({ title: document.title, url });
            else { await navigator.clipboard.writeText(url); label.textContent = 'Copied'; setTimeout(() => (label.textContent = 'Share'), 1600); }
        } catch { /* dismissed */ }
    });

    window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
    route();
    if (document.fonts) document.fonts.ready.then(() => { fitStamps(main); if (!sheet.hidden) fitStamps(sheet); });
}());
