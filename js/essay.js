/* ── Video Essay engine ──────────────────────────────────────────────
   Renders a scrollable photo essay from a window.ESSAY config:

   window.ESSAY = {
       kicker:  'A Video Essay',
       title:   '…',
       byline:  '…',
       cover:   { img: '…', pos: '50% 50%' },
       chapters: [
           { heading: '…',            // optional chapter title card
             img: '…', pos: '50% 40%',
             blocks: [ ['para', 'para'], ['para'] ] },
           …
       ],
       end: { title: '…', links: [ { label: '…', href: '…' } ] }
   };

   The background is a fixed layer with two stacked <img>s that
   crossfade whenever the chapter in view changes. Text blocks fade up
   as they enter the viewport. */
document.addEventListener('DOMContentLoaded', () => {
    const essay = window.ESSAY;
    if (!essay) return;

    const root = document.getElementById('essay-root');

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
    topbar.innerHTML = '<a href="../index.html">Michael Kilcoyne</a><span class="essay-chapter-label" id="essay-chapter-label"></span>';

    const hero = document.createElement('section');
    hero.className = 'essay-hero essay-scene';
    hero.dataset.img = essay.cover.img;
    hero.dataset.pos = essay.cover.pos || '50% 50%';
    hero.innerHTML =
        (essay.kicker ? '<p class="essay-kicker">' + essay.kicker + '</p>' : '') +
        '<h1 class="essay-title">' + essay.title + '</h1>' +
        (essay.byline ? '<p class="essay-byline">' + essay.byline + '</p>' : '') +
        '<span class="essay-scroll-hint">Scroll &darr;</span>';

    const flow = document.createElement('div');
    flow.className = 'essay-flow';

    essay.chapters.forEach((ch, i) => {
        const section = document.createElement('section');
        section.className = 'essay-chapter essay-scene';
        section.dataset.img = ch.img;
        section.dataset.pos = ch.pos || '50% 50%';
        section.dataset.label = ch.label || ch.heading || '';
        if (ch.heading) {
            const h = document.createElement('h2');
            h.className = 'essay-chapter-heading';
            h.innerHTML = ch.heading + '<span class="rule"></span>';
            section.appendChild(h);
        }
        ch.blocks.forEach(paras => {
            const block = document.createElement('div');
            block.className = 'essay-block';
            block.innerHTML = paras.map(p => '<p>' + p + '</p>').join('');
            section.appendChild(block);
        });
        flow.appendChild(section);
    });

    const end = document.createElement('section');
    end.className = 'essay-end essay-scene';
    end.dataset.img = essay.end.img || essay.cover.img;
    end.dataset.pos = essay.end.pos || '50% 50%';
    end.innerHTML =
        '<h2 class="essay-end-title">' + essay.end.title + '</h2>' +
        '<div class="essay-end-links">' +
        essay.end.links.map(l => '<a href="' + l.href + '">' + l.label + '</a>').join('') +
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
        if (src === currentSrc) return;
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
});
