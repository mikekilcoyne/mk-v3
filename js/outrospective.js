/* ── Outrospective — deck controller ─────────────────────────────────
   A horizontal slide deck. Move between slides with swipe, arrow keys,
   the on-screen arrows, the progress dots, or a horizontal/vertical wheel
   gesture. Plus the teaser: tap to open a fullscreen stage, prompt a
   rotate on portrait phones, and cue "turn back" when the film ends. */
(function () {
    'use strict';

    var deck    = document.getElementById('deck');
    var track   = document.getElementById('slides');
    var slides  = Array.prototype.slice.call(track.querySelectorAll('.slide'));
    var prevBtn = document.getElementById('deck-prev');
    var nextBtn = document.getElementById('deck-next');
    var progress = document.getElementById('deck-progress');
    var swipeHint = document.getElementById('deck-swipe-hint');
    /* Single-page mode: pin to the title slide and skip all nav wiring.
       The teaser setup further down still runs. */
    var single = deck.classList.contains('deck--single');
    if (single) {
        slides.forEach(function (s, i) { s.classList.toggle('is-active', i === 0); });
        track.style.transform = 'translateX(0)';
    }

    var count = slides.length;
    var idx = 0;

    /* ── Progress dots ── */
    var dots = single ? [] : slides.map(function (s, i) {
        var d = document.createElement('button');
        d.className = 'deck-dot';
        d.setAttribute('aria-label', 'Go to ' + (s.dataset.label || ('slide ' + (i + 1))));
        d.addEventListener('click', function () { goTo(i); });
        progress.appendChild(d);
        return d;
    });

    function render() {
        track.style.transform = 'translateX(' + (-idx * 100) + 'vw)';
        slides.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i === idx); });
        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) nextBtn.disabled = idx === count - 1;
        if (swipeHint) swipeHint.classList.toggle('hide', idx > 0);
    }

    function goTo(i) {
        i = Math.max(0, Math.min(count - 1, i));
        if (i === idx) return;
        idx = i;
        render();
    }
    function next() { goTo(idx + 1); }
    function prev() { goTo(idx - 1); }

    if (!single) {
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);

    /* ── Keyboard ── */
    document.addEventListener('keydown', function (e) {
        if (!stage.hidden) return;                 /* let the teaser own keys */
        if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
        else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
        else if (e.key === 'End') { e.preventDefault(); goTo(count - 1); }
    });

    /* ── Wheel: horizontal trackpad OR vertical wheel both advance ── */
    var wheelLock = false;
    deck.addEventListener('wheel', function (e) {
        if (!stage.hidden) return;
        var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (Math.abs(d) < 18) return;
        e.preventDefault();
        if (wheelLock) return;
        wheelLock = true;
        setTimeout(function () { wheelLock = false; }, 620);
        if (d > 0) next(); else prev();
    }, { passive: false });

    /* ── Touch swipe (horizontal) ── */
    var startX = 0, startY = 0, swiping = false;
    deck.addEventListener('touchstart', function (e) {
        if (!stage.hidden) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        swiping = true;
    }, { passive: true });
    deck.addEventListener('touchend', function (e) {
        if (!swiping) return;
        swiping = false;
        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            if (dx < 0) next(); else prev();
        }
    }, { passive: true });

    render();
    }   /* end !single */

    /* ═══ Teaser ═══════════════════════════════════════════════════ */
    var stage    = document.getElementById('teaser-stage');
    var frame    = document.getElementById('teaser-frame');
    var trigger  = document.getElementById('teaser-trigger');
    var closeBtn = document.getElementById('teaser-close');
    var portraitMQ = window.matchMedia('(orientation: portrait)');
    var isPhone    = window.matchMedia('(max-width: 900px)').matches;
    var ended = false;

    function syncOrientationUI() {
        if (stage.hidden) return;
        stage.classList.toggle('show-rotate', isPhone && portraitMQ.matches && !ended);
        stage.classList.toggle('show-unrotate', ended && isPhone && portraitMQ.matches);
    }

    function buildPlayer() {
        var iframe = document.createElement('iframe');
        iframe.src = stage.dataset.embed;
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.setAttribute('allowfullscreen', '');
        iframe.title = 'Outrospective teaser';
        frame.appendChild(iframe);
        if (window.Vimeo && window.Vimeo.Player) {
            try {
                var player = new window.Vimeo.Player(iframe);
                player.on('ended', function () {
                    ended = true;
                    syncOrientationUI();
                    showOutro();
                });
                /* Backup: 'ended' can be missed if the viewer scrubs or the
                   tab is backgrounded. Arm a timer from the real duration
                   rather than guessing a length. */
                player.getDuration().then(function (secs) {
                    clearTimeout(outroTimer);
                    outroTimer = setTimeout(showOutro, (secs + 1.5) * 1000);
                }).catch(function () { /* no duration, rely on 'ended' */ });
            } catch (err) { /* no end-cue if the API is blocked */ }
        }
    }

    function openTeaser() {
        ended = false;
        stage.hidden = false;
        if (!frame.childElementCount) buildPlayer();
        syncOrientationUI();
    }
    /* End-of-film CTA. Also fires on a fallback timer, because the Vimeo
       Player API is optional — without it there's no 'ended' event at all. */
    var outro = document.getElementById('teaserOutro');
    var outroTimer = null;
    function showOutro() {
        if (!outro) return;
        clearTimeout(outroTimer);
        outro.hidden = false;
        requestAnimationFrame(function () { outro.classList.add('is-in'); });
    }
    function hideOutro() {
        if (!outro) return;
        clearTimeout(outroTimer);
        outro.classList.remove('is-in');
        outro.hidden = true;
    }
    var dismissOutro = document.getElementById('teaserOutroDismiss');
    if (dismissOutro) dismissOutro.addEventListener('click', function () { closeTeaser(); });

    function closeTeaser() {
        stage.hidden = true;
        stage.classList.remove('show-rotate', 'show-unrotate');
        frame.innerHTML = '';   /* stop playback */
        hideOutro();
    }

    if (trigger) trigger.addEventListener('click', openTeaser);
    /* The title slide has its own Play Teaser button. */
    var triggerTitle = document.getElementById('teaser-trigger-title');
    if (triggerTitle) triggerTitle.addEventListener('click', openTeaser);
    if (closeBtn) closeBtn.addEventListener('click', closeTeaser);

    /* Fullscreen the whole stage (iframe included). Falls back to the
       webkit-prefixed call for older Safari. */
    var fsBtn = document.getElementById('teaserFullscreen');
    if (fsBtn) fsBtn.addEventListener('click', function () {
        var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (fsEl) {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else {
            var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
            if (req) req.call(stage);
        }
    });
    function syncFsLabel() {
        if (!fsBtn) return;
        var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
        fsBtn.textContent = on ? 'Exit Fullscreen' : 'Fullscreen';
    }
    document.addEventListener('fullscreenchange', syncFsLabel);
    document.addEventListener('webkitfullscreenchange', syncFsLabel);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !stage.hidden) closeTeaser();
    });

    if (portraitMQ.addEventListener) portraitMQ.addEventListener('change', syncOrientationUI);
    else if (portraitMQ.addListener) portraitMQ.addListener(syncOrientationUI);
    window.addEventListener('orientationchange', function () { setTimeout(syncOrientationUI, 120); });

    /* Vimeo Player API — optional; only needed for the "turn back" end cue. */
    var api = document.createElement('script');
    api.src = 'https://player.vimeo.com/api/player.js';
    document.head.appendChild(api);
})();
