/*
  Design-note overlay. Dev only — injected by dev-server.js, never shipped.

  Hold A (or hit the ✎ button) and drag to circle anything on the page.
  Release, type the note, save. Notes land in notes/design-notes.json with
  enough context — page, CSS selector, the element's own text, page-space
  coordinates — for Claude to find the exact thing being pointed at without
  needing the screenshot.
*/
(() => {
    if (window.__mkAnnotate) return;
    window.__mkAnnotate = true;

    const NS = 'http://www.w3.org/2000/svg';
    const PAGE = location.pathname;

    let armed = false;      // annotate mode on
    let drawing = false;    // mid-drag
    let points = [];        // freehand path, page coords
    let notes = [];

    /* ---------- chrome ---------- */

    const style = document.createElement('style');
    style.textContent = `
    .mkn-layer{position:absolute;inset:0;z-index:2147483000;pointer-events:none}
    .mkn-layer svg{position:absolute;top:0;left:0;overflow:visible}
    .mkn-armed,.mkn-armed *{cursor:crosshair!important}
    .mkn-armed .mkn-layer{pointer-events:auto}
    .mkn-path{fill:rgba(255,221,102,.10);stroke:#FFDD66;stroke-width:2.5;
      stroke-linejoin:round;stroke-linecap:round;
      filter:drop-shadow(0 1px 3px rgba(0,0,0,.7))}
    .mkn-path.is-live{fill:rgba(255,221,102,.06);stroke-dasharray:6 4}
    .mkn-pin{position:absolute;z-index:2147483001;width:22px;height:22px;
      border-radius:50%;background:#FFDD66;color:#000;font:700 12px/22px
      'Helvetica Neue',Helvetica,Arial,sans-serif;text-align:center;
      cursor:pointer;pointer-events:auto;box-shadow:0 2px 8px rgba(0,0,0,.6);
      transform:translate(-50%,-50%)}
    .mkn-pin:hover{transform:translate(-50%,-50%) scale(1.15)}
    .mkn-bubble{position:absolute;z-index:2147483002;max-width:280px;
      background:rgba(18,18,18,.96);backdrop-filter:blur(10px);color:#fff;
      border:1px solid rgba(255,255,255,.16);border-radius:4px;padding:10px 12px;
      font:400 13px/1.45 -apple-system,'Helvetica Neue',sans-serif;
      box-shadow:0 8px 30px rgba(0,0,0,.6);pointer-events:auto}
    .mkn-bubble textarea{width:260px;height:74px;background:rgba(255,255,255,.06);
      color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:3px;
      padding:7px;font:400 13px/1.4 inherit;resize:vertical;outline:none}
    .mkn-bubble textarea:focus{border-color:#FFDD66}
    .mkn-row{display:flex;gap:6px;margin-top:8px;align-items:center}
    .mkn-btn{font:700 10px/1 'Helvetica Neue',Helvetica,sans-serif;
      letter-spacing:2px;text-transform:uppercase;padding:7px 11px;border-radius:4px;
      border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);
      color:#fff;cursor:pointer}
    .mkn-btn:hover{border-color:#FFDD66;color:#FFDD66}
    .mkn-btn--go{background:#FFDD66;color:#000;border-color:#FFDD66}
    .mkn-btn--go:hover{color:#000;filter:brightness(1.08)}
    .mkn-sel{font:400 11px/1.4 ui-monospace,Menlo,monospace;color:#FFDD66;
      opacity:.75;margin-bottom:7px;word-break:break-all}
    .mkn-read{white-space:pre-wrap}
    .mkn-meta{font:400 10px/1.4 'Helvetica Neue',sans-serif;color:rgba(255,255,255,.45);
      margin-top:7px}
    .mkn-dock{position:fixed;right:14px;bottom:14px;z-index:2147483003;display:flex;
      gap:6px;align-items:center}
    .mkn-toggle{width:40px;height:40px;border-radius:50%;border:1px solid
      rgba(255,255,255,.22);background:rgba(18,18,18,.9);color:#fff;font-size:16px;
      cursor:pointer;backdrop-filter:blur(10px);box-shadow:0 4px 16px rgba(0,0,0,.5)}
    .mkn-toggle.is-on{background:#FFDD66;color:#000;border-color:#FFDD66}
    .mkn-count{font:700 10px/1 'Helvetica Neue',sans-serif;letter-spacing:1px;
      color:rgba(255,255,255,.6);background:rgba(18,18,18,.9);padding:6px 8px;
      border-radius:3px;backdrop-filter:blur(10px)}
    .mkn-hint{position:fixed;left:50%;top:14px;transform:translateX(-50%);
      z-index:2147483003;background:rgba(255,221,102,.95);color:#000;
      font:700 10px/1 'Helvetica Neue',Helvetica,sans-serif;letter-spacing:2px;
      text-transform:uppercase;padding:8px 14px;border-radius:3px}
  `;
    document.head.appendChild(style);

    const layer = document.createElement('div');
    layer.className = 'mkn-layer';
    const svg = document.createElementNS(NS, 'svg');
    layer.appendChild(svg);
    document.body.appendChild(layer);

    const dock = document.createElement('div');
    dock.className = 'mkn-dock';
    const count = document.createElement('span');
    count.className = 'mkn-count';
    const toggle = document.createElement('button');
    toggle.className = 'mkn-toggle';
    toggle.textContent = '✎';
    toggle.title = 'Annotate (A)';
    dock.append(count, toggle);
    document.body.appendChild(dock);

    let hint = null;

    /* ---------- helpers ---------- */

    function sizeLayer() {
        const w = document.documentElement.scrollWidth;
        const h = document.documentElement.scrollHeight;
        layer.style.width = w + 'px';
        layer.style.height = h + 'px';
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
    }

    /* A short, human-readable path to the element — good enough for Claude
       to grep for, which matters more here than strict uniqueness. */
    function selectorFor(el) {
        if (!el || el === document.body) return 'body';
        const parts = [];
        let node = el;
        while (node && node !== document.body && parts.length < 4) {
            let s = node.tagName.toLowerCase();
            if (node.id) { parts.unshift(s + '#' + node.id); break; }
            const cls = (node.className || '').toString().trim().split(/\s+/)
                .filter(c => c && !c.startsWith('mkn-'))[0];
            if (cls) s += '.' + cls;
            parts.unshift(s);
            node = node.parentElement;
        }
        return parts.join(' > ');
    }

    function bbox(pts) {
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        return {
            x: Math.round(Math.min(...xs)), y: Math.round(Math.min(...ys)),
            w: Math.round(Math.max(...xs) - Math.min(...xs)),
            h: Math.round(Math.max(...ys) - Math.min(...ys))
        };
    }

    function d(pts) {
        return 'M' + pts.map(p => p[0] + ',' + p[1]).join('L') + 'Z';
    }

    function setArmed(on) {
        armed = on;
        document.documentElement.classList.toggle('mkn-armed', on);
        toggle.classList.toggle('is-on', on);
        if (on && !hint) {
            hint = document.createElement('div');
            hint.className = 'mkn-hint';
            hint.textContent = 'Drag to circle · Esc to exit';
            document.body.appendChild(hint);
        } else if (!on && hint) {
            hint.remove(); hint = null;
        }
    }

    /* ---------- rendering ---------- */

    function render() {
        svg.querySelectorAll('.mkn-path:not(.is-live)').forEach(n => n.remove());
        document.querySelectorAll('.mkn-pin').forEach(n => n.remove());
        const mine = notes.filter(n => n.page === PAGE);
        count.textContent = mine.length ? mine.length + ' NOTES' : 'NO NOTES';

        mine.forEach((n, i) => {
            if (!n.points || !n.points.length) return;
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('class', 'mkn-path');
            p.setAttribute('d', d(n.points));
            svg.appendChild(p);

            const b = n.box || bbox(n.points);
            const pin = document.createElement('div');
            pin.className = 'mkn-pin';
            pin.textContent = i + 1;
            pin.style.left = (b.x + b.w) + 'px';
            pin.style.top = b.y + 'px';
            pin.addEventListener('click', e => {
                e.stopPropagation();
                showNote(n, i + 1, b);
            });
            layer.appendChild(pin);
        });
    }

    function closeBubbles() {
        document.querySelectorAll('.mkn-bubble').forEach(n => n.remove());
        svg.querySelectorAll('.is-live').forEach(n => n.remove());
    }

    function showNote(note, num, b) {
        closeBubbles();
        const bub = document.createElement('div');
        bub.className = 'mkn-bubble';
        bub.style.left = (b.x + b.w + 16) + 'px';
        bub.style.top = b.y + 'px';
        bub.innerHTML =
            `<div class="mkn-sel">#${num} · ${note.selector}</div>` +
            `<div class="mkn-read"></div>` +
            `<div class="mkn-meta">${new Date(note.created).toLocaleString()}</div>` +
            `<div class="mkn-row"><button class="mkn-btn" data-x>Delete</button>` +
            `<button class="mkn-btn" data-close>Close</button></div>`;
        bub.querySelector('.mkn-read').textContent = note.comment;
        bub.querySelector('[data-close]').onclick = closeBubbles;
        bub.querySelector('[data-x]').onclick = async () => {
            await fetch('/__notes?id=' + note.id, { method: 'DELETE' });
            closeBubbles(); await load();
        };
        layer.appendChild(bub);
    }

    function askForNote(pts) {
        const b = bbox(pts);
        const live = document.createElementNS(NS, 'path');
        live.setAttribute('class', 'mkn-path is-live');
        live.setAttribute('d', d(pts));
        svg.appendChild(live);

        /* What's under the middle of the circle is what's being pointed at. */
        const cx = b.x + b.w / 2 - scrollX, cy = b.y + b.h / 2 - scrollY;
        layer.style.pointerEvents = 'none';
        const target = document.elementFromPoint(
            Math.max(0, Math.min(innerWidth - 1, cx)),
            Math.max(0, Math.min(innerHeight - 1, cy))
        ) || document.body;
        layer.style.pointerEvents = '';
        const selector = selectorFor(target);

        const bub = document.createElement('div');
        bub.className = 'mkn-bubble';
        bub.style.left = (b.x + b.w + 16) + 'px';
        bub.style.top = b.y + 'px';
        bub.innerHTML =
            `<div class="mkn-sel">${selector}</div>` +
            `<textarea placeholder="What should change here?"></textarea>` +
            `<div class="mkn-row"><button class="mkn-btn mkn-btn--go" data-save>Save note</button>` +
            `<button class="mkn-btn" data-cancel>Cancel</button></div>`;
        layer.appendChild(bub);

        const ta = bub.querySelector('textarea');
        ta.focus();
        bub.querySelector('[data-cancel]').onclick = closeBubbles;

        const save = async () => {
            const comment = ta.value.trim();
            if (!comment) return closeBubbles();
            await fetch('/__notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    page: PAGE,
                    comment,
                    selector,
                    elementText: (target.textContent || '').trim().slice(0, 160),
                    points: pts,
                    box: b,
                    viewport: { w: innerWidth, h: innerHeight },
                    scrollY: Math.round(scrollY)
                })
            });
            closeBubbles();
            await load();
        };
        bub.querySelector('[data-save]').onclick = save;
        /* Cmd/Ctrl+Enter saves without reaching for the mouse. */
        ta.addEventListener('keydown', e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
            e.stopPropagation();
        });
    }

    /* ---------- drawing ---------- */

    layer.addEventListener('pointerdown', e => {
        if (!armed || e.target.closest('.mkn-bubble,.mkn-pin')) return;
        closeBubbles();
        drawing = true;
        points = [[Math.round(e.pageX), Math.round(e.pageY)]];
        layer.setPointerCapture(e.pointerId);
        const live = document.createElementNS(NS, 'path');
        live.setAttribute('class', 'mkn-path is-live');
        svg.appendChild(live);
        e.preventDefault();
    });

    layer.addEventListener('pointermove', e => {
        if (!drawing) return;
        const last = points[points.length - 1];
        const x = Math.round(e.pageX), y = Math.round(e.pageY);
        /* Thin the path — raw pointermove floods the JSON with noise. */
        if (Math.hypot(x - last[0], y - last[1]) < 5) return;
        points.push([x, y]);
        svg.querySelector('.is-live').setAttribute('d', d(points));
    });

    layer.addEventListener('pointerup', e => {
        if (!drawing) return;
        drawing = false;
        layer.releasePointerCapture(e.pointerId);
        const b = bbox(points);
        /* A stray click is not a circle. */
        if (points.length < 3 || (b.w < 12 && b.h < 12)) { closeBubbles(); return; }
        svg.querySelectorAll('.is-live').forEach(n => n.remove());
        askForNote(points);
    });

    /* ---------- input ---------- */

    toggle.addEventListener('click', () => setArmed(!armed));

    document.addEventListener('keydown', e => {
        if (e.target.matches('input,textarea,[contenteditable]')) return;
        if (e.key === 'Escape') { setArmed(false); closeBubbles(); }
        if ((e.key === 'a' || e.key === 'A') && !e.metaKey && !e.ctrlKey && !e.altKey) {
            setArmed(!armed);
        }
    });

    addEventListener('resize', () => { sizeLayer(); render(); });

    async function load() {
        try {
            notes = await (await fetch('/__notes')).json();
        } catch { notes = []; }
        sizeLayer();
        render();
    }

    /* Pages that build themselves after load (the essay engine) grow the
       document well past DOMContentLoaded — re-measure once things settle. */
    load();
    setTimeout(() => { sizeLayer(); render(); }, 1200);
})();
