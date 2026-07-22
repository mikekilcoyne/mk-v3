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

    const topbar = document.createElement('div');
    topbar.className = 'essay-topbar';
    topbar.innerHTML = '<a href="/">Michael Kilcoyne</a><span class="essay-chapter-label" id="essay-chapter-label"></span>';

    const hero = document.createElement('section');
    hero.className = 'essay-hero essay-scene';
    hero.dataset.img = imgPath(essay.cover.img);
    hero.dataset.pos = essay.cover.pos || '50% 50%';
    hero.innerHTML =
        (essay.kicker ? `<p class="essay-kicker">${essay.kicker}</p>` : '') +
        `<h1 class="essay-title">${essay.title}</h1>` +
        (essay.byline ? `<p class="essay-byline">${essay.byline}</p>` : '') +
        '<span class="essay-scroll-hint">Scroll &darr;</span>';

    const flow = document.createElement('div');
    flow.className = 'essay-flow';

    essay.chapters.forEach(ch => {
        const section = document.createElement('section');
        section.className = 'essay-chapter essay-scene';
        section.dataset.img = imgPath(ch.img);
        section.dataset.pos = ch.pos || '50% 50%';
        section.dataset.label = ch.label || ch.heading || '';
        if (ch.heading) {
            const h = document.createElement('h2');
            h.className = 'essay-chapter-heading';
            h.innerHTML = ch.heading + '<span class="rule"></span>';
            section.appendChild(h);
        }
        (ch.blocks || []).forEach(paras => {
            const block = document.createElement('div');
            block.className = 'essay-block';
            block.innerHTML = paras.map(p => `<p>${p}</p>`).join('');
            section.appendChild(block);
        });
        flow.appendChild(section);
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
        '</div>';

    root.appendChild(bg);
    root.appendChild(progress);
    root.appendChild(topbar);
    root.appendChild(hero);
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

    /* ── Paragraph stepper: swipe, arrow keys, and buttons jump card to card ── */
    const stops = [hero,
        ...flow.querySelectorAll('.essay-chapter-heading, .essay-block'),
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
        stops[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    window.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    let touchStartX = 0, touchStartY = 0;
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', e => {
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

    /* ── Progress bar ── */
    function updateProgress() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    /* First paint */
    showScene(hero);
})();
