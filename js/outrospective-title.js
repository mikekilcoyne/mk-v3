/* ── Title lockup — letter-by-letter pop ──────────────────────────────
   The wordmark is laid out as two <text> runs whose widths are forced
   equal with textLength. To animate each letter separately we can't just
   split the string — that would throw away the tracking. Instead we ask
   the browser where every glyph actually landed (getStartPositionOfChar)
   and re-emit each one as its own <text> at that exact position, so the
   lockup is pixel-identical and every letter becomes animatable.

   Runs after fonts load, because glyph positions depend on the face. */
(function () {
    'use strict';

    var svg = document.querySelector('.wm-svg');
    if (!svg) return;

    var STAGGER = 55;    /* ms between letters */
    var DUR     = 460;   /* ms for one letter's pop */

    function explode(runNode, startDelay) {
        var text = runNode.textContent;
        var pos = [];
        for (var i = 0; i < text.length; i++) {
            /* Measured mid-glyph so each letter scales about its own centre */
            var p = runNode.getStartPositionOfChar(i);
            var e = runNode.getExtentOfChar(i);
            pos.push({ ch: text[i], x: p.x + e.width / 2, y: p.y });
        }

        var frag = document.createDocumentFragment();
        pos.forEach(function (g, i) {
            var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', g.x);
            t.setAttribute('y', g.y);
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('class', runNode.getAttribute('class') + ' wm-glyph');
            t.textContent = g.ch;
            t.style.animationDelay = (startDelay + i * STAGGER) + 'ms';
            frag.appendChild(t);
        });

        runNode.parentNode.insertBefore(frag, runNode);
        runNode.remove();
        return pos.length;
    }

    function run() {
        var outro = svg.querySelector('.wm-svg-outro');
        var spec  = svg.querySelector('.wm-svg-spective');
        if (!outro || !spec) return;

        var n = explode(outro, 0);
        explode(spec, n * STAGGER);
        svg.classList.add('is-exploded');   /* hands styling to .wm-glyph */
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { requestAnimationFrame(run); });
    } else {
        window.addEventListener('load', run);
    }
})();
