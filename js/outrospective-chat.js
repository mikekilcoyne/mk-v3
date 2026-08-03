/* ── MIK-AI-LE — rudimentary scripted chat ────────────────────────────
   A fixed, linear script — no real branching logic, just canned beats:
   name -> purpose (always deflected once, then accepted) -> a "wanna see
   the teaser?" choice that pushes back once on "no" -> the Play Teaser
   button lands as the final card in the same log. No backend. Markup/
   mechanics adapted from Clubby (Breakfast Club International's chat app):
   avatar + bubble rows, quick-reply chips, a bordered "card" for the final
   beat. Starts the first time "The Series" slide becomes active. */
(function () {
    'use strict';

    var slide = document.querySelector('.slide[data-label="The Series"]');
    var log   = document.getElementById('mikaileLog');
    var form  = document.getElementById('mikaileForm');
    var input = document.getElementById('mikaileInput');
    var chat  = document.getElementById('mikaile');
    var tmpl  = document.getElementById('teaserRevealTemplate');
    if (!slide || !log || !form || !input || !chat || !tmpl) return;

    var state = { step: 0 };
    var busy = false;

    /* One line of the exchange — no bubbles, just big display type.
       Speaker is signalled by color + indent (see .mikaile-line--*). */
    function row(who) {
        var l = document.createElement('div');
        l.className = 'mikaile-line mikaile-line--' + who;
        log.appendChild(l);
        log.scrollTop = log.scrollHeight;
        return l;
    }

    /* Typewriter for AI lines (with a blinking cursor while it types);
       instant render for the user's own echoed reply. */
    function type(text, who, cb) {
        var b = row(who);
        if (who === 'user') { b.textContent = text; if (cb) setTimeout(cb, 300); return b; }
        var cursor = document.createElement('span');
        cursor.className = 'mikaile-cursor';
        var i = 0;
        (function tick() {
            b.textContent = text.slice(0, i);
            b.appendChild(cursor);
            log.scrollTop = log.scrollHeight;
            i++;
            if (i <= text.length) { setTimeout(tick, 18); }
            else {
                cursor.remove();
                if (cb) setTimeout(cb, 450);
            }
        })();
        return b;
    }

    /* A row of quick-reply chips, sibling to the lines. Clicking one echoes
       it back as a user line, then fires cb(value). */
    function choices(options, cb) {
        var wrap = document.createElement('div');
        wrap.className = 'mikaile-choices';
        options.forEach(function (opt) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mikaile-choice';
            btn.textContent = opt.label;
            btn.addEventListener('click', function () {
                wrap.remove();
                type(opt.label, 'user', function () { cb(opt.value); });
            });
            wrap.appendChild(btn);
        });
        log.appendChild(wrap);
        log.scrollTop = log.scrollHeight;
    }

    function setInputEnabled(on, placeholder) {
        input.disabled = !on;
        form.querySelector('.mikaile-send').disabled = !on;
        if (placeholder) input.placeholder = placeholder;
        if (on) input.focus();
    }

    function finish() {
        setInputEnabled(false);
        form.style.display = 'none';
        /* Move (not clone) the series line + Play Teaser button in as the
           final block — keeps the whole thing one conversation, and
           preserves the #teaser-trigger click listener outrospective.js
           already bound to this exact node. */
        var r = document.createElement('div');
        r.className = 'mikaile-final';
        r.style.opacity = '0';
        r.style.transform = 'translateY(10px)';
        while (tmpl.firstChild) r.appendChild(tmpl.firstChild);
        tmpl.remove();
        log.appendChild(r);
        log.scrollTop = log.scrollHeight;
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                r.style.transition = 'opacity .5s ease, transform .5s ease';
                r.style.opacity = '1';
                r.style.transform = 'none';
                log.scrollTop = log.scrollHeight;
            });
        });
    }

    /* ── Boot sequence ── */
    function boot(cb) {
        var lines = [
            'Loading OutroSpective Life Purpose Articulation Platform',
            'Calibrating existential parameters',
            'Ready.'
        ];
        var i = 0;
        (function next() {
            if (i >= lines.length) { setTimeout(cb, 500); return; }
            var el = document.createElement('div');
            el.className = 'mikaile-boot';
            el.textContent = lines[i];
            log.appendChild(el);
            log.scrollTop = log.scrollHeight;
            i++;
            setTimeout(next, i === lines.length ? 700 : 900);
        })();
    }

    /* ── Script ── */
    function step0() {
        setInputEnabled(false);
        boot(function () {
            type('I’m a Chat Bot. Everyone’s gotta chat bot these days, isn’t that fun…?', 'ai', function () {
                type('What’s your name?', 'ai', function () {
                    setInputEnabled(true, 'Your name…');
                    state.step = 1;
                });
            });
        });
    }
    function step1(val) {
        type(val, 'user');
        setInputEnabled(false);
        type('Strong name. Nice to e-meet you, ' + val + '.', 'ai', function () {
            type('Now, onto the bigger question: what’s your purpose? If you need a gentle suggestion, just ask for one.', 'ai', function () {
                setInputEnabled(true, 'Your purpose…');
                state.step = 2;
            });
        });
    }
    function step2(val) {
        /* First answer always gets the same deflection — it's a bit, not a
           real filter — then a second, real answer is accepted outright. */
        type(val, 'user');
        setInputEnabled(false);
        type('Sorry, I don’t really know you, so without any of that context, kinda hard… Seriously, what’s your purpose…?', 'ai', function () {
            setInputEnabled(true, 'Your purpose…');
            state.step = 3;
        });
    }
    function step3(val) {
        type(val, 'user');
        setInputEnabled(false);
        type('Cool, cool. Same, same.', 'ai', askTeaser);
    }

    function askTeaser() {
        type('Lastly, I put together this brief “Teaser” for this series, wanna see it…?', 'ai', function () {
            choices([
                { label: 'Watch it', value: 'yes' },
                { label: 'Nah', value: 'no' }
            ], function (val) {
                if (val === 'no' && !state.nudged) {
                    state.nudged = true;
                    type('No…? C’mon.', 'ai', function () {
                        choices([
                            { label: 'Fine, watch it', value: 'yes' },
                            { label: 'Still no', value: 'no' }
                        ], function () {
                            type('Ok, good.', 'ai', finish);
                        });
                    });
                } else {
                    type('Ok, good.', 'ai', finish);
                }
            });
        });
    }

    /* The deck binds Enter/arrows for slide nav at the document level — stop
       keystrokes inside the chat from reaching it, or typing steals focus and
       Enter jumps a slide instead of submitting. */
    ['keydown', 'keyup', 'keypress'].forEach(function (ev) {
        chat.addEventListener(ev, function (e) { e.stopPropagation(); });
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (busy || input.disabled) return;
        var val = input.value.trim();
        if (!val) return;
        input.value = '';
        busy = true;
        setInputEnabled(false);
        if (state.step === 1) step1(val);
        else if (state.step === 2) step2(val);
        else if (state.step === 3) step3(val);
        setTimeout(function () { busy = false; }, 50);
    });

    /* Kick off the first time this slide is actually shown. */
    var started = false;
    function maybeStart() {
        if (started || !slide.classList.contains('is-active')) return;
        started = true;
        step0();
    }
    new MutationObserver(maybeStart).observe(slide, { attributes: true, attributeFilter: ['class'] });
    maybeStart(); /* in case it's already the active slide on load */
})();
