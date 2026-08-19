/* ── Photo Essay engine ──────────────────────────────────────────────
   Renders a scrollable photo essay from a JSON file in /content/essays.

   A page opts in with:  <body class="essay-body" data-essay="the-incident">
   and the engine fetches /content/essays/the-incident.json. See
   docs/ESSAY_WORKFLOW.md for the schema and the authoring flow.

   Photo paths in the JSON are bare filenames resolved against the
   essay's photoDir, so the whole set can be moved by editing one field.

   The background is a fixed layer with two stacked <img>s that crossfade
   whenever the chapter in view changes; text blocks fade up as they
   enter the viewport. */
(async function () {
    const root = document.getElementById('essay-root');
    if (!root) return;

    const slug = document.body.dataset.essay;
    if (!slug) return;

    let essay;
    try {
        const res = await fetch(`/content/essays/${slug}.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        essay = await res.json();
    } catch (err) {
        root.innerHTML = '<div class="essay-error">This essay could not be loaded.</div>';
        console.error('Essay load failed:', err);
        return;
    }

    const photoDir = (essay.photoDir || `photos_web/essays/${slug}`).replace(/^\/|\/$/g, '');
    /* Bare filenames live in photoDir; anything with a slash is already a path. */
    const imgPath = name => !name ? '' : (name.includes('/') ? `/${name.replace(/^\//, '')}` : `/${photoDir}/${name}`);

    /* ── Build DOM ── */
    const bg = document.createElement('div');
    bg.className = 'essay-bg';
    const bgA = document.createElement('img');
    const bgB = document.createElement('img');
    bgA.alt = ''; bgB.alt = '';
    bg.appendChild(bgA); bg.appendChild(bgB);

    const progress = document.createElement('div');
    progress.className = 'essay-progress';

    /* Vertical read-progress rail — revealed only on essays tall enough to
       warrant it (see updateRailVisibility). */
    const rail = document.createElement('div');
    rail.className = 'essay-rail';
    /* Bar and thumb only — no percentage readout. A live number chasing the
       reader down the edge of the page is something to watch instead of read,
       and the fill already says how far along they are. */
    rail.innerHTML =
        '<div class="essay-rail-fill"></div>' +
        '<div class="essay-rail-thumb"></div>';
    const railFill = rail.querySelector('.essay-rail-fill');
    const railThumb = rail.querySelector('.essay-rail-thumb');

    const topbar = document.createElement('div');
    topbar.className = 'essay-topbar';
    topbar.innerHTML = '<a href="/">Michael Kilcoyne</a><span class="essay-chapter-label" id="essay-chapter-label"></span>';

    const hasIndex = Array.isArray(essay.index) && essay.index.length;

    const hero = document.createElement('section');
    hero.className = 'essay-hero essay-scene';
    hero.dataset.img = imgPath(essay.cover.img);
    hero.dataset.pos = essay.cover.pos || '50% 50%';
    const credit = essay.credit || 'Words and photographs — Michael Kilcoyne';
    /* With an index below, the scroll cue becomes the way into it. */
    const hintInner =
        '<span class="essay-scroll-word" data-desktop="Scroll" data-mobile="Swipe"></span>' +
        '<span class="essay-scroll-arrow" aria-hidden="true"></span>';
    const scrollHint = hasIndex
        ? `<a class="essay-scroll-hint" href="#essay-index" aria-label="Skip to the index">${hintInner}</a>`
        : `<span class="essay-scroll-hint">${hintInner}</span>`;
    hero.innerHTML =
        `<h1 class="essay-title">${essay.title}</h1>` +
        `<p class="essay-credit">${credit}</p>` +
        (essay.location ? `<p class="essay-location">${essay.location}</p>` : '') +
        scrollHint;

    /* Optional index — a full-screen jump list right after the hero.
       Opt-in via an "index" array of {year, label, target} where target is
       a chapter id; used by timeline pages like /now. The year rides above
       the label so long entries never wrap mid-phrase. */
    let indexSec = null;
    let indexPlaced = false;
    if (hasIndex) {
        document.documentElement.classList.add('essay-snap');
        indexSec = document.createElement('section');
        indexSec.id = 'essay-index';
        indexSec.className = 'essay-index essay-scene';
        indexSec.dataset.img = imgPath(essay.indexImg || essay.cover.img);
        indexSec.dataset.pos = essay.indexPos || essay.cover.pos || '50% 50%';
        const indexTitle = essay.indexTitle || 'Index';
        indexSec.dataset.label = indexTitle;
        indexSec.innerHTML =
            `<p class="essay-index-kicker">${indexTitle}</p>` +
            '<nav class="essay-index-list">' +
            essay.index.map(e =>
                /* The year span renders even when empty so every place
                   name starts on the same left edge. */
                `<a class="essay-index-link" href="#${e.target}"><h1>` +
                `<span class="essay-index-year">${e.year || ''}</span>` +
                `<span class="essay-index-place">${e.label}</span>` +
                '</h1></a>'
            ).join('') +
            '</nav>';
    }

    const flow = document.createElement('div');
    flow.className = 'essay-flow';

    /* Every gallery block pushes its photo list here so the lightbox can
       open the right set from a thumbnail's data-index. */
    const galleries = [];

    /* "pages" layout: every chapter is one full screen with its heading
       and text in a single card, instead of text drifting past a photo
       over several screens. Timeline pages like /now use it. */
    const paged = essay.layout === 'pages';
    if (paged) document.body.classList.add('essay-paged');
    /* Paged + indexed pages snap mandatorily so the index can't be scrolled
       past — see the essay-snap-paged rule in essay.css. */
    if (paged && hasIndex) document.documentElement.classList.add('essay-snap-paged');

    essay.chapters.forEach(ch => {
        const section = document.createElement('section');
        section.className = 'essay-chapter essay-scene' + (paged ? ' essay-chapter--page' : '');
        if (ch.id) section.id = ch.id;
        section.dataset.img = imgPath(ch.img);
        section.dataset.pos = ch.pos || '50% 50%';
        section.dataset.label = ch.label || ch.heading || '';
        /* Paged chapters gather heading + text into one card so the whole
           section reads as a single composed screen. */
        const host = paged ? document.createElement('div') : section;
        if (paged) host.className = 'essay-page-card';
        if (ch.heading) {
            const h = document.createElement('h2');
            h.className = 'essay-chapter-heading';
            h.innerHTML = ch.heading + '<span class="rule"></span>';
            host.appendChild(h);
        }
        (ch.blocks || []).forEach(paras => {
            /* An embed block is a single-item array whose only entry is an
               object with an "embed" key — renders as a responsive iframe
               instead of a text card. */
            if (paras.length === 1 && paras[0] && typeof paras[0] === 'object' && paras[0].embed) {
                const wrap = document.createElement('div');
                wrap.className = 'essay-embed';
                const iframe = document.createElement('iframe');
                iframe.src = paras[0].embed;
                iframe.allow = 'autoplay; fullscreen; picture-in-picture';
                iframe.allowFullscreen = true;
                iframe.loading = 'lazy';
                iframe.title = paras[0].title || 'Video';
                wrap.appendChild(iframe);
                host.appendChild(wrap);
                return;
            }
            /* A gallery block is a photo montage: a compact grid of stills
               that has to fit inside the one screen its chapter owns, so
               the images are thumbs rather than full-bleed frames. */
            if (paras.length === 1 && paras[0] && typeof paras[0] === 'object' && paras[0].gallery) {
                const grid = document.createElement('div');
                grid.className = 'essay-gallery';
                paras[0].gallery.forEach((g, gi) => {
                    const src = typeof g === 'string' ? g : g.img;
                    const label = (typeof g === 'object' && g.label) ? g.label : '';
                    /* A button, not a bare figure: opening full screen is the
                       point of the montage, so it has to be reachable by
                       keyboard and announce itself as pressable. */
                    const fig = document.createElement('figure');
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'essay-gallery-open';
                    btn.dataset.index = gi;
                    btn.setAttribute('aria-label',
                        label ? `View ${label} full screen` : 'View photo full screen');
                    const im = document.createElement('img');
                    im.src = imgPath(src);
                    im.loading = 'lazy';
                    im.alt = (typeof g === 'object' && g.alt) ? g.alt : label;
                    btn.appendChild(im);
                    if (label) {
                        const cap = document.createElement('figcaption');
                        cap.textContent = label;
                        btn.appendChild(cap);
                    }
                    fig.appendChild(btn);
                    grid.appendChild(fig);
                });
                galleries.push(paras[0].gallery.map(g => ({
                    src: imgPath(typeof g === 'string' ? g : g.img),
                    label: (typeof g === 'object' && g.label) ? g.label : ''
                })));
                grid.dataset.gallery = galleries.length - 1;
                host.appendChild(grid);
                return;
            }
            /* A projects block renders the "what I'm working on" meters.
               Bars are sized with a plain inline width and never animated —
               a reveal animation is frozen at its first keyframe in a
               background tab, which renders every project at 0%. */
            if (paras.length === 1 && paras[0] && typeof paras[0] === 'object' && paras[0].projects) {
                const block = document.createElement('div');
                block.className = 'essay-block essay-projects';
                block.innerHTML = paras[0].projects.map(p => {
                    const pct = Math.max(0, Math.min(100, Number(p.pct) || 0));
                    return '<div class="essay-project">' +
                        `<h3 class="essay-project-name">${p.name}</h3>` +
                        (p.note ? `<p class="essay-project-note">${p.note}</p>` : '') +
                        `<div class="essay-meter-track"><span class="essay-meter-fill" style="width:${pct}%"></span></div>` +
                        `<p class="essay-meter-label"><span class="essay-pct">${pct}%</span>` +
                        (p.status ? ` &middot; ${p.status}` : '') + '</p>' +
                    '</div>';
                }).join('');
                host.appendChild(block);
                return;
            }
            const block = document.createElement('div');
            block.className = 'essay-block';
            block.innerHTML = paras.map(p => `<p>${p}</p>`).join('');
            /* A block that is nothing but a button shouldn't get the glass
               plate too — that reads as a box inside a box. */
            if (block.querySelector(':scope > p:only-child > a.essay-cta:only-child')) {
                block.classList.add('essay-block--bare');
            }
            /* A single short sentence whose only job is the ask — centre it
               under whatever it follows. */
            if (paras.length === 1 && typeof paras[0] === 'string' && /mailto:/.test(paras[0])) {
                block.classList.add('essay-block--ask');
            }
            host.appendChild(block);
        });
        if (paged) section.appendChild(host);
        flow.appendChild(section);

        /* `indexAfter` lets a chapter run before the jump list, so the page
           can open on its most important screen and hand off to the index
           immediately after. The chapter that precedes the index becomes a
           snap target too, otherwise the run hero → chapter → index has a
           gap in the middle and the scroll overshoots. */
        if (indexSec && essay.indexAfter && ch.id === essay.indexAfter) {
            section.classList.add('essay-scene--presnap');
            flow.appendChild(indexSec);
            indexPlaced = true;
        }
    });

    /* ── End card: next essay + share ── */
    const end = document.createElement('section');
    end.className = 'essay-end essay-scene';
    end.dataset.img = imgPath(essay.end.img || essay.cover.img);
    end.dataset.pos = essay.end.pos || '50% 50%';

    const backArrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5m6-7l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const nextArrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-7l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    /* Next published essay in index order, wrapping around; falls back to
       home when this is the only one published. */
    let nextLink = { label: `${backArrow} Back Home`, href: '/' };
    try {
        const idxRes = await fetch('/content/essays/index.json', { cache: 'no-cache' });
        if (idxRes.ok) {
            const list = (await idxRes.json()).essays.filter(e => e.published !== false);
            const here = list.findIndex(e => e.slug === slug);
            if (here !== -1 && list.length > 1) {
                const next = list[(here + 1) % list.length];
                nextLink = { label: `Next Essay ${nextArrow}`, href: `/${next.slug}/`, title: next.title };
            }
        }
    } catch (err) {
        /* Index is optional — the Back Home fallback already covers this. */
    }

    const pageUrl = `https://mikekilcoyne.com/${slug}`;
    const shareBody = (essay.end.shareBody || `Thought of you — a photo essay from Michael Kilcoyne.\n\n{url}`).replace('{url}', pageUrl);
    const shareHref = 'mailto:?subject=' + encodeURIComponent(essay.end.shareSubject || essay.title) +
                      '&body=' + encodeURIComponent(shareBody);

    end.innerHTML =
        `<h2 class="essay-end-title">${essay.end.title}</h2>` +
        '<div class="essay-end-links">' +
        `<a href="${nextLink.href}"${nextLink.title ? ` title="${nextLink.title}"` : ''}>${nextLink.label}</a>` +
        `<a href="${shareHref}">Share With a Friend</a>` +
        '</div>' +
        /* The ask sits last, after they've read the whole thing — never
           above the fold, per CLAUDE.md §2. */
        (essay.end.ask ? `<p class="essay-end-ask">${essay.end.ask}</p>` : '');

    root.appendChild(bg);
    root.appendChild(progress);
    root.appendChild(rail);
    root.appendChild(topbar);
    root.appendChild(hero);
    if (indexSec && !indexPlaced) root.appendChild(indexSec);
    root.appendChild(flow);
    root.appendChild(end);

    /* ── Background crossfade ── */
    const label = document.getElementById('essay-chapter-label');
    let activeImg = bgA;
    let idleImg = bgB;
    let currentSrc = '';

    function showScene(scene) {
        const src = new URL(scene.dataset.img, location.href).href;
        if (src === currentSrc) {
            if (label) label.textContent = scene.dataset.label || '';
            return;
        }
        currentSrc = src;
        const img = idleImg;
        img.onload = null; /* drop any handler from a superseded transition */
        img.style.objectPosition = scene.dataset.pos || '50% 50%';
        let done = false;
        const swap = () => {
            /* run once, and only if this transition is still the latest */
            if (done || img.src !== currentSrc) return;
            done = true;
            img.onload = null;
            img.classList.add('active');
            activeImg.classList.remove('active');
            idleImg = activeImg; activeImg = img;
        };
        img.onload = swap;
        img.src = src;
        if (img.complete) swap();
        if (label) label.textContent = scene.dataset.label || '';
    }

    const scenes = Array.from(document.querySelectorAll('.essay-scene'));

    const sceneObserver = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) showScene(e.target); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    scenes.forEach(s => sceneObserver.observe(s));

    /* Preload each scene's photo shortly before it scrolls in */
    const preloadObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                new Image().src = e.target.dataset.img;
                preloadObserver.unobserve(e.target);
            }
        });
    }, { rootMargin: '120% 0px 120% 0px' });
    scenes.forEach(s => preloadObserver.observe(s));

    /* ── Text block reveal ── */
    const blockObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) e.target.classList.add('in-view');
        });
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('.essay-block').forEach(b => blockObserver.observe(b));

    /* ── Photo lightbox ──────────────────────────────────────────────
       Opens a montage thumb full screen and lets you move through the set
       with arrows, swipe, or the on-screen buttons. Every control is
       visible — nothing here is hover-only or discovered by accident. */
    const lightbox = (() => {
        let set = [], at = 0, open = false, lastFocus = null;

        const el = document.createElement('div');
        el.className = 'essay-lb';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-label', 'Photo viewer');
        el.hidden = true;
        el.innerHTML =
            '<button class="essay-lb-close" type="button" aria-label="Close (Esc)">&times;</button>' +
            '<button class="essay-lb-nav essay-lb-prev" type="button" aria-label="Previous photo">&#8249;</button>' +
            '<figure class="essay-lb-stage"><img alt=""><figcaption></figcaption></figure>' +
            '<button class="essay-lb-nav essay-lb-next" type="button" aria-label="Next photo">&#8250;</button>';
        const img = el.querySelector('img');
        const cap = el.querySelector('figcaption');
        const prevBtn = el.querySelector('.essay-lb-prev');
        const nextBtn = el.querySelector('.essay-lb-next');

        function draw() {
            const item = set[at];
            img.src = item.src;
            img.alt = item.label || '';
            /* Location plus position, so it's always clear where you are
               in the set and how much is left. */
            cap.textContent = (item.label ? item.label + '  ·  ' : '') + (at + 1) + ' / ' + set.length;
            const many = set.length > 1;
            prevBtn.hidden = !many;
            nextBtn.hidden = !many;
        }
        function go(d) {
            if (!set.length) return;
            at = (at + d + set.length) % set.length;
            draw();
        }
        function show(list, i) {
            set = list; at = i; open = true;
            lastFocus = document.activeElement;
            el.hidden = false;
            document.body.classList.add('essay-lb-open');
            draw();
            el.querySelector('.essay-lb-close').focus();
        }
        function hide() {
            open = false;
            el.hidden = true;
            document.body.classList.remove('essay-lb-open');
            img.src = '';
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        el.querySelector('.essay-lb-close').addEventListener('click', hide);
        prevBtn.addEventListener('click', () => go(-1));
        nextBtn.addEventListener('click', () => go(1));
        /* Clicking the backdrop closes; clicking the photo or a button
           must not. */
        el.addEventListener('click', e => { if (e.target === el) hide(); });

        document.addEventListener('keydown', e => {
            if (!open) return;
            if (e.key === 'Escape') { e.preventDefault(); hide(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
            else if (e.key === 'Tab') {
                /* Keep focus inside the dialog. */
                const f = [...el.querySelectorAll('button')].filter(b => !b.hidden);
                const i = f.indexOf(document.activeElement);
                const n = e.shiftKey ? (i - 1 + f.length) % f.length : (i + 1) % f.length;
                e.preventDefault(); f[n].focus();
            }
        });

        let sx = 0, sy = 0;
        el.addEventListener('touchstart', e => {
            sx = e.changedTouches[0].clientX; sy = e.changedTouches[0].clientY;
        }, { passive: true });
        el.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - sx;
            const dy = e.changedTouches[0].clientY - sy;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1);
            else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) hide();  /* swipe down to dismiss */
        }, { passive: true });

        document.body.appendChild(el);
        return { show, hide, isOpen: () => open };
    })();

    /* Delegated so it covers every gallery on the page. */
    root.addEventListener('click', e => {
        const btn = e.target.closest('.essay-gallery-open');
        if (!btn) return;
        const grid = btn.closest('.essay-gallery');
        const list = galleries[Number(grid.dataset.gallery)];
        if (list) lightbox.show(list, Number(btn.dataset.index) || 0);
    });

    /* ── Paragraph stepper: swipe, arrow keys, and buttons jump card to card ── */
    /* The index is a screen in its own right, and it matches neither
       .essay-chapter-heading nor .essay-block — leaving it out of this list
       is what let the stepper buttons, arrow keys and swipes jump straight
       over it. Query from root so everything lands in document order.
       On the paged layout each scene is one full screen, so step screen to
       screen; scrolling essays still step card to card. */
    const stops = paged
        ? [...root.querySelectorAll('.essay-scene')]
        : [hero,
           ...root.querySelectorAll('.essay-index, .essay-chapter-heading, .essay-block'),
           end];

    function nearestStop() {
        const mid = window.scrollY + window.innerHeight / 2;
        let best = 0, bestDist = Infinity;
        stops.forEach((el, i) => {
            const r = el.getBoundingClientRect();
            const center = window.scrollY + r.top + r.height / 2;
            const d = Math.abs(center - mid);
            if (d < bestDist) { bestDist = d; best = i; }
        });
        return best;
    }

    /* While a smooth scroll is animating, base the next step on the target
       we're heading to — reading live scrollY mid-flight compounds steps. */
    let stepTarget = null, stepTime = 0;
    function step(dir) {
        const base = (stepTarget !== null && Date.now() - stepTime < 1200)
            ? stepTarget
            : nearestStop();
        const i = Math.max(0, Math.min(stops.length - 1, base + dir));
        stepTarget = i;
        stepTime = Date.now();
        /* Full-screen scenes align to the top; cards inside a scrolling
           essay read better centred. */
        stops[i].scrollIntoView({ behavior: 'smooth', block: paged ? 'start' : 'center' });
    }

    window.addEventListener('keydown', e => {
        /* The lightbox owns the arrow keys while it's open, or paging the
           photo would also page the chapter behind it. */
        if (lightbox.isOpen()) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    let touchStartX = 0, touchStartY = 0;
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', e => {
        if (lightbox.isOpen()) return;   /* same reason as the keydown guard */
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        /* horizontal swipe = next/prev card; vertical stays native scroll */
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            step(dx < 0 ? 1 : -1);
        }
    }, { passive: true });

    const stepper = document.createElement('div');
    stepper.className = 'essay-stepper';
    const arrowSvg = dir =>
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
        (dir < 0 ? 'M12 19V6m-6 6l6-6 6 6' : 'M12 5v13m-6-6l6 6 6-6') +
        '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const upBtn = document.createElement('button');
    upBtn.innerHTML = arrowSvg(-1);
    upBtn.setAttribute('aria-label', 'Previous paragraph');
    const downBtn = document.createElement('button');
    downBtn.innerHTML = arrowSvg(1);
    downBtn.setAttribute('aria-label', 'Next paragraph');
    upBtn.addEventListener('click', () => step(-1));
    downBtn.addEventListener('click', () => step(1));
    stepper.appendChild(upBtn);
    stepper.appendChild(downBtn);
    root.appendChild(stepper);

    /* ── Progress (top bar + vertical rail) ── */
    function updateProgress() {
        /* The timeline is finished once the last chapter fills the screen —
           the end card that follows is the outro, so measuring against full
           document height left the reader at ~90% on the final chapter. */
        const lastChapter = flow.querySelector('.essay-chapter:last-of-type');
        const readEnd = lastChapter
            ? lastChapter.getBoundingClientRect().top + window.scrollY
            : document.documentElement.scrollHeight - window.innerHeight;
        const max = Math.max(1, readEnd);
        const frac = Math.min(1, window.scrollY / max);
        const pct = (frac * 100).toFixed(1);
        progress.style.width = pct + '%';
        railFill.style.height = pct + '%';
        railThumb.style.top = pct + '%';
    }

    /* The rail is a long-read aid — only show it once the page is tall enough
       that a reader benefits from knowing how far they've come. */
    function updateRailVisibility() {
        const tall = document.documentElement.scrollHeight > window.innerHeight * 2.5;
        rail.classList.toggle('is-visible', tall);
    }

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', () => { updateProgress(); updateRailVisibility(); }, { passive: true });
    /* Images load after first paint and grow the page — re-check once they're in. */
    window.addEventListener('load', updateRailVisibility);
    updateProgress();
    updateRailVisibility();

    /* First paint */
    showScene(hero);
})();
