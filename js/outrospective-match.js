/* ── MEET THE MOMENT — moment/place matching game ─────────────────────
   4x4 board (8 pairs). Each pair is one MOMENT (a photograph of something
   happening) and one LANDSCAPE (the place it happened). Match them and the
   moment flips out to full-screen alongside its landscape.

   SWAP: edit PAIRS below — { place, moment, landscape }. `place` is the
   label shown on the reveal; the two images are what the player pairs up.
   Locations were verified against the city folders in /photos_web. */
(function () {
    'use strict';

    var BASE = '/photos_web/outrospective/';

    var PAIRS = [
        { place: 'Istanbul',   moment: 'moments/P1016768.jpg',            landscape: 'locations/P1003476.jpg' },
        { place: 'Istanbul',   moment: 'moments/P1018353.jpg',            landscape: 'locations/P1003478.jpg' },
        { place: 'Kyoto',      moment: 'moments/P1013156.jpg',            landscape: 'locations/P1003649.jpg' },
        { place: 'Arashiyama', moment: 'moments/P1003637.jpg',            landscape: 'locations/P1003640.jpg' },
        { place: 'Lisbon',     moment: 'moments/P1002876.jpg',            landscape: 'locations/P1003370.jpg' },
        { place: 'Tokyo',      moment: 'moments/P1012490.jpg',            landscape: 'locations/DSC01251.jpg' },
        { place: 'Tokyo',      moment: 'moments/P1013145.jpg',            landscape: 'locations/DSC01263.jpg' },
        { place: 'Japan',      moment: 'moments/P1012817-Enhanced.jpg',   landscape: 'locations/P1003642.jpg' }
    ];

    /* Epic backdrops — one is picked at random behind the board each game. */
    var BACKDROPS = [
        'locations/P1003058.jpg',
        'locations/P1003535-2.jpg',
        'locations/DSC01267.jpg',
        'locations/P1003073.jpg',
        'locations/P1003651-2.jpg'
    ];

    var slide   = document.querySelector('.slide--match');
    var grid    = document.getElementById('matchGrid');
    var elFound = document.getElementById('matchFound');
    var elTotal = document.getElementById('matchTotal');
    var elMoves = document.getElementById('matchMoves');
    var elWin   = document.getElementById('matchWin');
    var btnReset = document.getElementById('matchReset');
    var reveal   = document.getElementById('matchReveal');
    if (!grid || !slide) return;

    var first = null, lock = false, moves = 0, found = 0, pairs = 0;

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    function build() {
        /* 8 pairs = a 4x4 board. */
        var chosen = shuffle(PAIRS.slice()).slice(0, 8);
        pairs = chosen.length;

        var deck = [];
        chosen.forEach(function (p, i) {
            var key = 'p' + i;
            deck.push({ key: key, kind: 'moment',    place: p.place, src: p.moment,    pair: p });
            deck.push({ key: key, kind: 'landscape', place: p.place, src: p.landscape, pair: p });
        });
        shuffle(deck);

        /* New backdrop each game. */
        slide.style.setProperty('--match-bg', "url('" + BASE + BACKDROPS[Math.floor(Math.random() * BACKDROPS.length)] + "')");

        grid.innerHTML = '';
        deck.forEach(function (card) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'match-card';
            btn.dataset.key = card.key;
            btn.setAttribute('aria-label', 'Hidden card');
            btn._card = card;
            btn.innerHTML =
                '<span class="match-inner">' +
                  '<span class="match-face match-face--back">' +
                    '<span class="match-back-mark">' + (card.kind === 'moment' ? 'MOMENT' : 'PLACE') + '</span>' +
                  '</span>' +
                  '<span class="match-face match-face--front">' +
                    '<img src="' + BASE + card.src + '" alt="" loading="lazy">' +
                  '</span>' +
                '</span>';
            btn.addEventListener('click', function () { flip(btn); });
            grid.appendChild(btn);
        });

        first = null; lock = false; moves = 0; found = 0;
        elMoves.textContent = '0';
        elFound.textContent = '0';
        elTotal.textContent = String(pairs);
        elWin.hidden = true;
        if (reveal) reveal.hidden = true;
    }

    /* On a match: show the moment full-screen with its landscape beside it. */
    function showReveal(card) {
        if (!reveal) return;
        reveal.querySelector('.match-reveal-moment img').src = BASE + card.pair.moment;
        reveal.querySelector('.match-reveal-place img').src = BASE + card.pair.landscape;
        reveal.querySelector('.match-reveal-label').textContent = card.place;
        reveal.hidden = false;
        reveal.classList.add('is-in');
        clearTimeout(showReveal._t);
        showReveal._t = setTimeout(function () {
            reveal.classList.remove('is-in');
            setTimeout(function () { reveal.hidden = true; }, 400);
        }, 2600);
    }

    function flip(btn) {
        if (lock || btn.classList.contains('is-up') || btn.classList.contains('is-done')) return;
        btn.classList.add('is-up');

        if (!first) { first = btn; return; }

        moves++;
        elMoves.textContent = String(moves);

        if (first.dataset.key === btn.dataset.key) {
            var a = first, b = btn;
            first = null;
            found++;
            elFound.textContent = String(found);
            lock = true;
            setTimeout(function () {
                a.classList.add('is-done');
                b.classList.add('is-done');
                showReveal(b._card);
                lock = false;
                if (found === pairs) setTimeout(function () { elWin.hidden = false; }, 2400);
            }, 420);
        } else {
            lock = true;
            var x = first, y = btn;
            first = null;
            setTimeout(function () {
                x.classList.remove('is-up');
                y.classList.remove('is-up');
                lock = false;
            }, 800);
        }
    }

    if (btnReset) btnReset.addEventListener('click', build);
    if (reveal) reveal.addEventListener('click', function () {
        reveal.classList.remove('is-in');
        setTimeout(function () { reveal.hidden = true; }, 400);
    });

    build();
})();
