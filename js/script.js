document.addEventListener('DOMContentLoaded', () => {
    // --- Top Line Typing (types once, stays forever) ---
    const topLineEl   = document.querySelector('#top-line .typing-text');
    const cursorTop   = document.getElementById('cursor-top');
    const cursorBot   = document.getElementById('cursor-bottom');
    const bottomTextEl = document.getElementById('bottom-text');
    const topLineText  = "Hi, I'm Michael Kilcoyne, and I love...";
    const TYPE_SPEED   = 55;

    function typeTopLine(text, i, cb) {
        if (i < text.length) {
            topLineEl.innerHTML += text.charAt(i);
            setTimeout(() => typeTopLine(text, i + 1, cb), TYPE_SPEED);
        } else {
            // Hide top cursor — top line stays permanently
            setTimeout(() => { cursorTop.classList.add('hidden'); cb(); }, 400);
        }
    }

    // --- Bottom Line Phrase Typewriter (per-word styling) ---
    // Each phrase is an array of segments: { text, cls }
    const bottomPhrases = [
        // ADVENTURES — NCL Outline glow
        [{ text: "ADVENTURES", cls: "font-adventures" }],

        // MAKING (pink outline) MOVIES (NCL regular, blue glow)
        [
            { text: "MAKING ", cls: "font-adventures" },
            { text: "MOVIES",  cls: "font-blue-glow" }
        ],

        // BREAKFAST CLUB — Helvetica Neue Bold, white glow
        [{ text: "BREAKFAST CLUB", cls: "font-breakfast" }],

        // DREAMIN' BIG — BIG highlighted in yellow glow
        [
            { text: "DREAMIN' ", cls: "font-adventures" },
            { text: "BIG",       cls: "font-yellow-glow" }
        ]
    ];

    const PHRASE_TYPE_SPEED  = 70;
    const PHRASE_PAUSE       = 2600;
    const INTER_PHRASE_PAUSE = 180;

    let phraseIndex = 0;
    const bottomLine = document.getElementById('bottom-line');

    // Type segments one by one, each as its own <span> before the cursor
    // Segments with { br: true } insert a line break with no typing delay
    function typeSegments(segments, segIdx, charIdx) {
        if (segIdx >= segments.length) {
            setTimeout(() => deleteSegments(), PHRASE_PAUSE);
            return;
        }
        const seg = segments[segIdx];

        if (seg.br) {
            const br = document.createElement('br');
            br.dataset.seg = segIdx;
            bottomLine.insertBefore(br, cursorBot);
            setTimeout(() => typeSegments(segments, segIdx + 1, 0), PHRASE_TYPE_SPEED);
            return;
        }

        let span = bottomLine.querySelector(`[data-seg="${segIdx}"]`);
        if (!span) {
            span = document.createElement('span');
            span.className = seg.cls || '';
            span.dataset.seg = segIdx;
            bottomLine.insertBefore(span, cursorBot);
        }

        if (charIdx <= seg.text.length) {
            span.textContent = seg.text.slice(0, charIdx);
            setTimeout(() => typeSegments(segments, segIdx, charIdx + 1), PHRASE_TYPE_SPEED);
        } else {
            setTimeout(() => typeSegments(segments, segIdx + 1, 0), PHRASE_TYPE_SPEED);
        }
    }

    // Realistic backspace: char-by-char within each segment, with human-like pauses
    function deleteSegments() {
        const spans = [...bottomLine.querySelectorAll('[data-seg]')];
        if (spans.length === 0) {
            bottomLine.classList.remove('is-multiline');
            phraseIndex = (phraseIndex + 1) % bottomPhrases.length;
            setTimeout(() => startPhrase(), INTER_PHRASE_PAUSE);
            return;
        }
        deleteCharsFrom(spans, spans.length - 1);
    }

    function deleteCharsFrom(spans, spanIdx) {
        if (spanIdx < 0) {
            // all done
            bottomLine.classList.remove('is-multiline');
            phraseIndex = (phraseIndex + 1) % bottomPhrases.length;
            setTimeout(() => startPhrase(), INTER_PHRASE_PAUSE);
            return;
        }
        const el = spans[spanIdx];
        const text = el.textContent;
        if (text.length > 1) {
            // Realistic: vary speed slightly, occasional tiny pause mid-delete
            const baseSpeed = 55;
            const jitter = Math.random() < 0.15 ? 180 : Math.floor(Math.random() * 30);
            el.textContent = text.slice(0, -1);
            setTimeout(() => deleteCharsFrom(spans, spanIdx), baseSpeed + jitter);
        } else {
            // last char — remove element, brief pause before hitting previous segment
            el.remove();
            const pauseBeforeNext = spanIdx > 0 ? 120 + Math.floor(Math.random() * 80) : 40;
            setTimeout(() => deleteCharsFrom(spans, spanIdx - 1), pauseBeforeNext);
        }
    }

    function startPhrase() {
        const segs = bottomPhrases[phraseIndex];
        bottomLine.classList.toggle('is-multiline', segs.some(s => s.br));
        typeSegments(segs, 0, 0);
    }

    // Boot sequence
    setTimeout(() => {
        typeTopLine(topLineText, 0, () => {
            cursorBot.classList.remove('hidden');
            startPhrase();
        });
    }, 800);


    // --- UI Interactions ---
    const btnStory     = document.getElementById('btn-story');
    const btnQwest     = document.getElementById('btn-qwest');
    const videoOverlay = document.getElementById('video-overlay');
    const qwestOverlay = document.getElementById('qwest-overlay');

    btnStory.addEventListener('click', (e) => { e.preventDefault(); videoOverlay.classList.add('active'); });
    document.getElementById('close-video').addEventListener('click', () => videoOverlay.classList.remove('active'));

    btnQwest.addEventListener('click', (e) => {
        e.preventDefault();
        qwestOverlay.classList.add('active');
        // Reset to first visible city, photo 0 on fresh open
        currentLocationIndex = Math.max(0, qwestData.findIndex(d => !d.hidden));
        currentPhotoIndex = 0;
        isActiveElementA = true;
        loadQwestPhoto(true);
    });
    document.getElementById('close-qwest').addEventListener('click', () => {
        qwestOverlay.classList.remove('active');
        stopQwestRotation();
    });

    // Substack elements
    const substackOverlay = document.getElementById('substack-overlay');
    const closeSubstackBtn = document.getElementById('close-substack');
    // Work elements
    const workOverlay = document.getElementById('work-overlay');
    const closeWorkBtn = document.getElementById('close-work');
    const btnContact = document.getElementById('btn-contact');

    // Grid overlay — declared here to avoid TDZ crash in the overlays array below
    const gridOverlay = document.getElementById('flipbook-grid-overlay');

    // Navigation Links
    const navStory = document.getElementById('nav-story');
    if (navStory) {
        navStory.addEventListener('click', (e) => {
            e.preventDefault();
            btnStory.click();
        });
    }
    
    const navQwest = document.getElementById('nav-qwest');
    if (navQwest) {
        navQwest.addEventListener('click', (e) => {
            e.preventDefault();
            btnQwest.click();
        });
    }
    
    const navEssays = document.getElementById('nav-essays');
    if (navEssays) {
        navEssays.addEventListener('click', (e) => {
            e.preventDefault();
            substackOverlay.classList.add('active');
        });
    }


    closeSubstackBtn.addEventListener('click', () => {
        substackOverlay.classList.remove('active');
    });

    // Contact button (home page)
    if (btnContact) {
        btnContact.addEventListener('click', (e) => {
            e.preventDefault();
            workOverlay.classList.add('active');
        });
    }

    if (closeWorkBtn) {
        closeWorkBtn.addEventListener('click', () => {
            workOverlay.classList.remove('active');
        });
    }

    // Let's Play overlay + karaoke
    const letsplayOverlay = document.getElementById('letsplay-overlay');
    const btnLetsplay   = document.getElementById('btn-letsplay');
    const closeLetsplay = document.getElementById('close-letsplay');
    const WORD_MS       = 310;

    // ── Let's Play karaoke (loops) ────────────────────────────────────────────
    const karaokeWords = document.querySelectorAll('#karaoke-bar .karaoke-word');
    let karaokeTimer = null, karaokeIdx = 0;

    function karaokeStep() {
        karaokeWords.forEach(w => w.classList.remove('active'));
        karaokeWords[karaokeIdx].classList.add('active');
        karaokeIdx = (karaokeIdx + 1) % karaokeWords.length;
        const delay = karaokeIdx === 0 ? WORD_MS * 1.5 : WORD_MS;
        karaokeTimer = setTimeout(karaokeStep, delay);
    }
    function startKaraoke() { if (karaokeTimer) return; karaokeIdx = 0; karaokeStep(); }
    function stopKaraoke()  { clearTimeout(karaokeTimer); karaokeTimer = null; karaokeWords.forEach(w => w.classList.remove('active')); }

    btnLetsplay.addEventListener('click', (e) => { e.preventDefault(); letsplayOverlay.classList.add('active'); startKaraoke(); });
    closeLetsplay.addEventListener('click', () => { letsplayOverlay.classList.remove('active'); stopKaraoke(); });

    // ── Cory overlay karaoke (plays once, then stops) ─────────────────────────
    const coryOverlay    = document.getElementById('cory-overlay');
    const closeCory      = document.getElementById('close-cory');
    const coryWords      = document.querySelectorAll('#cory-karaoke-bar .karaoke-word');
    const coryCtaBlock   = document.getElementById('cory-cta-block');
    let coryTimer = null, coryIdx = 0;

    const coryBgOverlay = document.querySelector('#cory-overlay .letsplay-bg-overlay');

    function showCoryCta() {
        if (coryCtaBlock) coryCtaBlock.classList.add('visible');
        if (coryBgOverlay) coryBgOverlay.classList.add('visible');
    }
    function hideCoryCta() {
        if (coryCtaBlock) coryCtaBlock.classList.remove('visible');
        if (coryBgOverlay) coryBgOverlay.classList.remove('visible');
    }

    function coryKaraokeStep() {
        coryWords.forEach(w => w.classList.remove('active'));
        if (coryIdx >= coryWords.length) {
            coryIdx = 0;
            // Karaoke done — fade in the CTA after a short beat
            setTimeout(showCoryCta, 400);
            return;
        }
        coryWords[coryIdx].classList.add('active');
        coryIdx++;
        coryTimer = setTimeout(coryKaraokeStep, WORD_MS);
    }
    function startCoryKaraoke() {
        coryIdx = 0;
        hideCoryCta();
        coryWords.forEach(w => w.classList.remove('active'));
        coryKaraokeStep();
    }
    function stopCoryKaraoke() {
        clearTimeout(coryTimer);
        coryTimer = null;
        coryWords.forEach(w => w.classList.remove('active'));
        hideCoryCta();
    }

    if (closeCory) closeCory.addEventListener('click', () => { coryOverlay.classList.remove('active'); stopCoryKaraoke(); });

    function openCory() { coryOverlay.classList.add('active'); startCoryKaraoke(); }

    const makeFriendsPill = document.getElementById('make-friends-pill');
    if (makeFriendsPill) makeFriendsPill.addEventListener('click', openCory);

    // ── Shuffle button ────────────────────────────────────────────────────────
    const shuffleBtn = document.getElementById('qwest-shuffle');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            shuffleMode = !shuffleMode;
            shuffleBtn.classList.toggle('active', shuffleMode);
        });
    }

    // ── Backdrop click-to-close ───────────────────────────────────────────────
    const overlays = [videoOverlay, qwestOverlay, gridOverlay, substackOverlay, workOverlay, letsplayOverlay, coryOverlay];
    overlays.forEach(overlay => {
        if (!overlay) return;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                if (overlay === qwestOverlay)   stopQwestRotation();
                if (overlay === letsplayOverlay) stopKaraoke();
                if (overlay === coryOverlay)     stopCoryKaraoke();
            }
        });
    });

    // Background Video Loop (first 15s)
    const bgIframe = document.getElementById('bg-video');
    if (bgIframe && window.Vimeo) {
        const bgPlayer = new Vimeo.Player(bgIframe);
        bgPlayer.on('timeupdate', data => { if (data.seconds >= 15) bgPlayer.setCurrentTime(0); });
    }


    // --- Qwest Photo Roll ---
    // Photos can be a string path OR { src, isNew: true } for NEW badge
    const qwestData = [
        {
            "location": "Denver, CO",
            "photos": [
                { "src": "photos_web/01_DENVER_CO/P1001838.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/01_DENVER_CO/P1001839.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/01_DENVER_CO/P1001840.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/01_DENVER_CO/P1002001.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/01_DENVER_CO/P1002005.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/01_DENVER_CO/P1002002-2.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/01_DENVER_CO/P1006537.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/01_DENVER_CO/P1006587.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/01_DENVER_CO/P1006596.jpg", "pos": "50% 50%", "isNew": true }
            ]
        },
        {
            "location": "Istanbul, TR",
            "photos": [
                { "src": "photos_web/02_ISTANBUL_TY/P1015644.jpg", "pos": "31% 44%", "isNew": true },
                { "src": "photos_web/02_ISTANBUL_TY/P1015649.jpg", "pos": "62% 50%", "isNew": true },
                { "src": "photos_web/02_ISTANBUL_TY/P1015663.jpg", "pos": "64% 27%", "isNew": true },
                { "src": "photos_web/02_ISTANBUL_TY/P1018292.jpg", "pos": "50% 19%", "isNew": true },
                { "src": "photos_web/02_ISTANBUL_TY/P1018308.jpg", "pos": "49% 37%", "isNew": true },
                { "src": "photos_web/02_ISTANBUL_TY/P1018337.jpg", "pos": "51% 32%", "isNew": true },
                { "src": "photos_web/02_ISTANBUL_TY/P1018353.jpg", "pos": "57% 37%", "isNew": true }
            ]
        },
        {
            "location": "New York, NY",
            "photos": [
                { "src": "photos_web/03_NEW_YORK_NY/IMG_2921.jpg", "hidden": true },
                { "src": "photos_web/03_NEW_YORK_NY/P1000803.jpg", "hidden": true },
                { "src": "photos_web/03_NEW_YORK_NY/P1001261.jpg", "hidden": true },
                { "src": "photos_web/03_NEW_YORK_NY/P1001769-Enhanced.jpg", "hidden": true },
                { "src": "photos_web/03_NEW_YORK_NY/P1002488-Enhanced.jpg", "hidden": true },
                { "src": "photos_web/03_NEW_YORK_NY/P1002559.jpg", "hidden": true },
                { "src": "photos_web/03_NEW_YORK_NY/P1002496.jpg", "pos": "45% 78%", "isNew": true },
                { "src": "photos_web/03_NEW_YORK_NY/P1002499.jpg", "pos": "81% 80%", "isNew": true },
                { "src": "photos_web/03_NEW_YORK_NY/P1002503.jpg", "pos": "51% 83%", "isNew": true },
                { "src": "photos_web/03_NEW_YORK_NY/P1000804.jpg", "pos": "42% 31%", "isNew": true },
                { "src": "photos_web/03_NEW_YORK_NY/P1000805.jpg", "pos": "48% 30%", "isNew": true },
                { "src": "photos_web/03_NEW_YORK_NY/P1000803.jpg", "pos": "37% 33%", "isNew": true }
            ]
        },
        {
            "location": "East Hampton, NY",
            "photos": [
                { "src": "photos_web/04_EAST_HAMPTON_NY/P1010224.jpg", "pos": "47% 42%", "isNew": true },
                { "src": "photos_web/04_EAST_HAMPTON_NY/P1010235.jpg", "pos": "38% 41%", "isNew": true },
                { "src": "photos_web/04_EAST_HAMPTON_NY/P1010253.jpg", "pos": "34% 44%", "isNew": true },
                { "src": "photos_web/04_EAST_HAMPTON_NY/P1010266.jpg", "pos": "49% 46%", "isNew": true },
                { "src": "photos_web/04_EAST_HAMPTON_NY/P1010270.jpg", "pos": "48% 46%", "isNew": true },
                { "src": "photos_web/04_EAST_HAMPTON_NY/P1002360.jpg", "hidden": true },
                { "src": "photos_web/04_EAST_HAMPTON_NY/P1002348.jpg", "pos": "50% 50%", "hidden": true }
            ]
        },
        {
            "location": "Paris, FR",
            "photos": [
                { "src": "photos_web/05_PARIS_FR/P1002427.jpg", "pos": "51% 37%" },
                { "src": "photos_web/05_PARIS_FR/P1002507.jpg", "pos": "50% 41%" },
                { "src": "photos_web/05_PARIS_FR/P1002541.jpg", "pos": "19% 24%" },
                { "src": "photos_web/05_PARIS_FR/IMG_3445.jpg", "pos": "46% 42%" }
            ]
        },
        {
            "location": "Maastricht, NL",
            "photos": [
                { "src": "photos_web/06_MAASTRICTH_NL/P1001039.jpg" },
                { "src": "photos_web/06_MAASTRICTH_NL/P1001073.jpg" },
                { "src": "photos_web/06_MAASTRICTH_NL/P1001094.jpg" },
                { "src": "photos_web/06_MAASTRICTH_NL/P1001174.jpg" }
            ],
            "hidden": true
        },
        {
            "location": "Ireland",
            "photos": [
                { "src": "photos_web/07_IRELAND/P1000509-Edit.jpg", "pos": "70% 42%", "hidden": true },
                { "src": "photos_web/07_IRELAND/P1000656.jpg", "hidden": true },
                { "src": "photos_web/07_IRELAND/P1000545.jpg", "pos": "53% 30%", "isNew": true },
                { "src": "photos_web/07_IRELAND/P1000550.jpg", "pos": "50% 29%", "isNew": true },
                { "src": "photos_web/07_IRELAND/P1000552.jpg", "pos": "50% 32%", "isNew": true },
                { "src": "photos_web/07_IRELAND/P1000972.jpg", "pos": "43% 61%", "isNew": true },
                { "src": "photos_web/07_IRELAND/P1000975.jpg", "pos": "88% 48%", "isNew": true }
            ]
        },
        {
            "location": "London, UK",
            "photos": [
                { "src": "photos_web/08_LONDON_UK/P1001252.jpg" },
                { "src": "photos_web/08_LONDON_UK/P1001266.jpg" }
            ],
            "hidden": true
        },
        {
            "location": "Santa Monica, CA",
            "photos": [
                { "src": "photos_web/09_SANTA_MONICA_CA/P1001553.jpg" }
            ],
            "hidden": true
        },
        {
            "location": "West Village, NY",
            "photos": [
                { "src": "photos_web/10_WEST_VILLAGE_NY/P1002107.jpg", "pos": "51% 44%" },
                { "src": "photos_web/10_WEST_VILLAGE_NY/P1002140.jpg", "pos": "40% 42%" },
                { "src": "photos_web/10_WEST_VILLAGE_NY/P1002186.jpg", "pos": "76% 62%" }
            ]
        },
        {
            "location": "Rocky Mountain, CO",
            "photos": [
                { "src": "photos_web/11_ROCKYS_CO/P1005342.jpg" }
            ],
            "hidden": true
        },
        {
            "location": "Los Angeles, CA",
            "photos": [
                { "src": "photos_web/12_LOS_ANGELES_CA/P1014438.jpg", "pos": "45% 48%" },
                { "src": "photos_web/12_LOS_ANGELES_CA/P1014466-Enhanced.jpg", "pos": "62% 49%" },
                { "src": "photos_web/12_LOS_ANGELES_CA/P1014498-Enhanced.jpg", "pos": "56% 71%" },
                { "src": "photos_web/12_LOS_ANGELES_CA/P1014519-Enhanced.jpg", "pos": "46% 25%" },
                { "src": "photos_web/12_LOS_ANGELES_CA/P1014531-Enhanced.jpg", "pos": "39% 45%" },
                { "src": "photos_web/12_LOS_ANGELES_CA/P1019460.jpg", "hidden": true },
                { "src": "photos_web/12_LOS_ANGELES_CA/P1019569.jpg", "hidden": true }
            ]
        },
        {
            "location": "Iceland",
            "photos": [
                { "src": "photos_web/13_ICELAND/P1010846-Enhanced.jpg", "isNew": true }
            ],
            "hidden": true
        },
        {
            "location": "Japan",
            "photos": [
                { "src": "photos_web/14_JAPAN/P1007387.jpg", "isNew": true },
                { "src": "photos_web/14_JAPAN/P1012490.jpg", "isNew": true },
                { "src": "photos_web/14_JAPAN/P1012817-Enhanced.jpg", "isNew": true },
                { "src": "photos_web/14_JAPAN/P1013145.jpg", "isNew": true },
                { "src": "photos_web/14_JAPAN/P1014251.jpg", "isNew": true },
                { "src": "photos_web/14_JAPAN/P1014552.jpg", "isNew": true },
                { "src": "photos_web/14_JAPAN/P1014556.jpg", "isNew": true },
                { "src": "photos_web/14_JAPAN/P1014749.jpg", "isNew": true }
            ],
            "hidden": true
        },
        {
            "location": "Kyoto, JP",
            "photos": [
                { "src": "photos_web/22_KYOTO_JP/P1013155.jpg", "pos": "55% 38%", "isNew": true },
                { "src": "photos_web/22_KYOTO_JP/P1013156.jpg", "pos": "56% 41%", "isNew": true },
                { "src": "photos_web/22_KYOTO_JP/P1013158.jpg", "pos": "69% 31%", "isNew": true },
                { "src": "photos_web/22_KYOTO_JP/P1013721.jpg", "pos": "81% 26%", "isNew": true },
                { "src": "photos_web/22_KYOTO_JP/P1013720.jpg", "pos": "86% 21%", "isNew": true },
                { "src": "photos_web/22_KYOTO_JP/P1013943.jpg", "pos": "54% 42%", "isNew": true },
                { "src": "photos_web/22_KYOTO_JP/P1013940.jpg", "pos": "53% 44%", "isNew": true }
            ]
        },
        {
            "location": "Osaka, JP",
            "photos": [
                { "src": "photos_web/23_OSAKA_JP/P1014752.jpg", "pos": "49% 45%", "isNew": true },
                { "src": "photos_web/23_OSAKA_JP/P1014754.jpg", "pos": "51% 44%", "isNew": true },
                { "src": "photos_web/23_OSAKA_JP/P1014757.jpg", "pos": "51% 40%", "isNew": true }
            ]
        },
        {
            "location": "Kobe, JP",
            "photos": [
                { "src": "photos_web/16_KOBE_JP/P1014327.jpg", "isNew": true },
                { "src": "photos_web/16_KOBE_JP/P1014334.jpg" },
                { "src": "photos_web/16_KOBE_JP/P1014356.jpg" }
            ],
            "hidden": true
        },
        {
            "location": "Lower East Side, NY",
            "photos": [
                { "src": "photos_web/15_LES_NEW_YORK/IMG_2684.jpg", "pos": "51% 44%", "isNew": true },
                { "src": "photos_web/15_LES_NEW_YORK/IMG_2686.jpg", "pos": "48% 49%" },
                { "src": "photos_web/15_LES_NEW_YORK/IMG_2687.jpg", "pos": "46% 53%" }
            ]
        },
        {
            "location": "Phoenix, AZ",
            "photos": [
                { "src": "photos_web/17_PHOENIX_AZ/P1012017.jpg", "isNew": true },
                { "src": "photos_web/17_PHOENIX_AZ/P1012018.jpg" },
                { "src": "photos_web/17_PHOENIX_AZ/P1012019.jpg" },
                { "src": "photos_web/17_PHOENIX_AZ/P1012025.jpg" },
                { "src": "photos_web/17_PHOENIX_AZ/P1012027.jpg" }
            ],
            "hidden": true
        },
        {
            "location": "Breckenridge, CO",
            "photos": [
                { "src": "photos_web/21_BRECKENRIDGE_CO/P1003054.jpg", "pos": "37% 29%", "isNew": true },
                { "src": "photos_web/21_BRECKENRIDGE_CO/P1003017.jpg", "pos": "53% 37%", "isNew": true },
                { "src": "photos_web/21_BRECKENRIDGE_CO/P1003066.jpg", "pos": "23% 7%", "isNew": true }
            ]
        },
        {
            "location": "Vancouver, BC",
            "photos": [
                { "src": "photos_web/18_VANCOUVER_BC/P1009177.jpg", "pos": "54% 49%", "isNew": true },
                { "src": "photos_web/18_VANCOUVER_BC/P1009202.jpg", "pos": "48% 48%" },
                { "src": "photos_web/18_VANCOUVER_BC/P1009205.jpg", "pos": "46% 47%" }
            ]
        },
        {
            "location": "Encinitas, CA",
            "photos": [
                { "src": "photos_web/19_ENCINITAS_CA/P1008177.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/19_ENCINITAS_CA/P1008180.jpg", "pos": "50% 50%" },
                { "src": "photos_web/19_ENCINITAS_CA/P1008225.jpg", "pos": "50% 50%" },
                { "src": "photos_web/19_ENCINITAS_CA/P1008212.jpg", "pos": "50% 50%" }
            ]
        },
        {
            "location": "Smoky Mountains, TN",
            "photos": [
                { "src": "photos_web/20_SMOKIES_TN/P1005572.jpg", "isNew": true },
                { "src": "photos_web/20_SMOKIES_TN/P1005578.jpg" },
                { "src": "photos_web/20_SMOKIES_TN/P1005581.jpg" }
            ]
        },
        {
            "location": "Rotterdam, NL",
            "photos": [
                { "src": "photos_web/24_ROTTERDAM_NL/P1002629.jpg", "isNew": true },
                { "src": "photos_web/24_ROTTERDAM_NL/P1002627.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/24_ROTTERDAM_NL/P1002628.jpg", "isNew": true }
            ]
        },
        {
            "location": "Biarritz, FR",
            "photos": [
                { "src": "photos_web/25_BIARRITZ_FR/P1002476.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/25_BIARRITZ_FR/P1002478.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/25_BIARRITZ_FR/P1002485.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/25_BIARRITZ_FR/P1002504.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/25_BIARRITZ_FR/P1002486.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/25_BIARRITZ_FR/P1002488.jpg", "pos": "50% 50%", "isNew": true },
                { "src": "photos_web/25_BIARRITZ_FR/P1002492.jpg", "pos": "50% 50%", "hidden": true, "isNew": true },
                { "src": "photos_web/25_BIARRITZ_FR/P1002496.jpg", "pos": "50% 50%", "hidden": true, "isNew": true }
            ]
        }
        ];

    let currentLocationIndex = 0;
    let currentPhotoIndex = 0;
    let qwestRotationTimer = null;
    let isActiveElementA = true; // toggles between the two crossfade img elements

    const qwestLocationEl  = document.getElementById('qwest-location');
    const qwestPhotoActive = document.getElementById('qwest-photo-active');
    const qwestPhotoNext   = document.getElementById('qwest-photo-next');
    const newBadgeEl       = document.getElementById('new-badge');
    const locationPicker   = document.getElementById('location-picker');
    const locationList     = document.getElementById('location-list');

    function getVisiblePhotos(locIdx) {
        return qwestData[locIdx].photos.filter(p => !(typeof p === 'object' && p.hidden));
    }

    function getPhotoEntry(locIdx, photoIdx) {
        const p = getVisiblePhotos(locIdx)[photoIdx];
        return p === undefined ? { src: '', isNew: false } : (typeof p === 'string' ? { src: p, isNew: false } : p);
    }

    function loadQwestPhoto(instant = false) {
        const data  = qwestData[currentLocationIndex];
        const entry = getPhotoEntry(currentLocationIndex, currentPhotoIndex);

        qwestLocationEl.textContent = data.location;
        newBadgeEl.classList.toggle('visible', !!entry.isNew);

        const activeImg = isActiveElementA ? qwestPhotoActive : qwestPhotoNext;
        const loadingImg = isActiveElementA ? qwestPhotoNext : qwestPhotoActive;

        if (instant) {
            activeImg.src = entry.src;
            activeImg.style.objectPosition = entry.pos || '50% 50%';
            activeImg.classList.add('active');
            loadingImg.classList.remove('active');
            loadingImg.src = '';
        } else {
            loadingImg.src = entry.src;
            loadingImg.style.objectPosition = entry.pos || '50% 50%';
            loadingImg.onload = () => {
                loadingImg.classList.add('active');
                activeImg.classList.remove('active');
                isActiveElementA = !isActiveElementA;
                
                // Clear background image after transition is done to save browser resources
                setTimeout(() => {
                    if (!activeImg.classList.contains('active')) {
                        activeImg.src = '';
                    }
                }, 800);
            };
        }

        // Restart auto-rotation timer
        startQwestRotation();
    }

    function startQwestRotation() {
        stopQwestRotation();
        const len = getVisiblePhotos(currentLocationIndex).length;
        if (len <= 1) return;
        qwestRotationTimer = setTimeout(() => {
            nextQwestPhoto();
        }, 4000); // cycle photo every 4 seconds
    }

    function stopQwestRotation() {
        if (qwestRotationTimer) {
            clearTimeout(qwestRotationTimer);
            qwestRotationTimer = null;
        }
    }

    let shuffleMode = false;

    function nextVisibleLocationIndex(from) {
        for (let i = 1; i <= qwestData.length; i++) {
            const idx = (from + i) % qwestData.length;
            if (!qwestData[idx].hidden && getVisiblePhotos(idx).length > 0) return idx;
        }
        return from;
    }

    // "Next city" toast popup
    let nextCityPopupTimer = null;
    function showNextCityPopup(directionFn) {
        let popup = document.getElementById('next-city-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'next-city-popup';
            popup.innerHTML = `
                <span class="next-city-msg">Wanna see the next city? Just keep going.</span>
                <div class="next-city-actions">
                    <button id="next-city-yes">Next city →</button>
                    <button id="next-city-no">← Go back</button>
                </div>`;
            document.getElementById('qwest-overlay').appendChild(popup);
        }
        // Wire buttons each time (direction may differ)
        popup.querySelector('#next-city-yes').onclick = () => {
            hideNextCityPopup();
            directionFn();
        };
        popup.querySelector('#next-city-no').onclick = () => {
            hideNextCityPopup();
            // Go back to first photo of current city
            currentPhotoIndex = 0;
            loadQwestPhoto();
        };
        popup.classList.add('visible');
        clearTimeout(nextCityPopupTimer);
        nextCityPopupTimer = setTimeout(hideNextCityPopup, 5000);
    }
    function hideNextCityPopup() {
        const popup = document.getElementById('next-city-popup');
        if (popup) popup.classList.remove('visible');
        clearTimeout(nextCityPopupTimer);
    }

    function nextQwestPhoto(fromKeyboard = false) {
        const len = getVisiblePhotos(currentLocationIndex).length;
        if (shuffleMode) {
            // Pick a random different city + photo
            const nextLoc = nextVisibleLocationIndex(
                Math.floor(Math.random() * qwestData.length)
            );
            currentLocationIndex = nextLoc;
            currentPhotoIndex = Math.floor(Math.random() * getVisiblePhotos(nextLoc).length);
            loadQwestPhoto();
        } else if (currentPhotoIndex >= len - 1) {
            // Last photo in city — show popup if from keyboard, otherwise auto-advance
            if (fromKeyboard) {
                showNextCityPopup(() => {
                    currentLocationIndex = nextVisibleLocationIndex(currentLocationIndex);
                    currentPhotoIndex = 0;
                    loadQwestPhoto();
                });
            } else {
                currentLocationIndex = nextVisibleLocationIndex(currentLocationIndex);
                currentPhotoIndex = 0;
                loadQwestPhoto();
            }
        } else {
            hideNextCityPopup();
            currentPhotoIndex++;
            loadQwestPhoto();
        }
    }

    function prevQwestPhoto(fromKeyboard = false) {
        const len = getVisiblePhotos(currentLocationIndex).length;
        if (currentPhotoIndex <= 0 && fromKeyboard) {
            // At the first photo — ask about going to prev city
            showNextCityPopup(() => {
                const prevLoc = prevVisibleLocationIndex(currentLocationIndex);
                currentLocationIndex = prevLoc;
                currentPhotoIndex = getVisiblePhotos(prevLoc).length - 1;
                loadQwestPhoto();
            });
        } else {
            hideNextCityPopup();
            currentPhotoIndex = (currentPhotoIndex - 1 + len) % len;
            loadQwestPhoto();
        }
    }

    function prevVisibleLocationIndex(from) {
        for (let i = 1; i <= qwestData.length; i++) {
            const idx = (from - i + qwestData.length) % qwestData.length;
            if (!qwestData[idx].hidden && getVisiblePhotos(idx).length > 0) return idx;
        }
        return from;
    }

    document.getElementById('qwest-next').addEventListener('click', () => nextQwestPhoto(false));
    document.getElementById('qwest-prev').addEventListener('click', () => prevQwestPhoto(false));

    document.addEventListener('keydown', e => {
        if (!qwestOverlay.classList.contains('active')) return;
        if (!locationPicker.classList.contains('hidden')) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); nextQwestPhoto(true); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); prevQwestPhoto(true); }
        if (e.key === 'Escape') hideNextCityPopup();
    });

    document.getElementById('qwest-change-loc').addEventListener('click', () => {
        locationPicker.classList.remove('hidden');
        stopQwestRotation();
    });
    document.getElementById('close-picker').addEventListener('click', () => {
        locationPicker.classList.add('hidden');
        startQwestRotation();
    });

    // Build location list — each country group gets its own isolated row/grid
    const NEW_CITIES = new Set(['Breckenridge, CO', 'Kyoto, JP', 'Osaka, JP']);
    const COUNTRY_GROUPS = [
        { label: 'North America', cities: ['Denver, CO','New York, NY','East Hampton, NY','West Village, NY','Lower East Side, NY','Santa Monica, CA','Los Angeles, CA','Encinitas, CA','Breckenridge, CO','Rocky Mountain, CO','Phoenix, AZ','Smoky Mountains, TN','Vancouver, BC'] },
        { label: 'Japan',  cities: ['Japan','Kyoto, JP','Osaka, JP','Kobe, JP'] },
        { label: 'Europe', cities: ['Paris, FR','Maastricht, NL','London, UK','Istanbul, TR','Ireland','Iceland','Rotterdam, NL','Biarritz, FR'] }
    ];

    function buildGroupSection(label, cities) {
        const section = document.createElement('li');
        section.className = 'location-group-section';

        const hdr = document.createElement('div');
        hdr.className = 'location-country-header';
        hdr.textContent = label;
        section.appendChild(hdr);

        const grid = document.createElement('ul');
        grid.className = 'location-group-cities';
        cities.forEach(name => {
            const idx = qwestData.findIndex(d => d.location === name);
            const item = document.createElement('li');
            const isNew = NEW_CITIES.has(name);
            item.innerHTML = name + (isNew ? ' <span class="list-new-dot">NEW</span>' : '');
            item.addEventListener('click', () => {
                currentLocationIndex = idx;
                currentPhotoIndex = 0;
                loadQwestPhoto(true);
                locationPicker.classList.add('hidden');
            });
            grid.appendChild(item);
        });
        section.appendChild(grid);
        locationList.appendChild(section);
    }

    COUNTRY_GROUPS.forEach(group => {
        const visibleCities = group.cities.filter(name => {
            const d = qwestData.find(d => d.location === name);
            return d && !d.hidden;
        });
        if (visibleCities.length) buildGroupSection(group.label, visibleCities);
    });

    // Fallback for cities not in any group
    const allGroupedCities = new Set(COUNTRY_GROUPS.flatMap(g => g.cities));
    const elsewhere = qwestData.filter(d => !d.hidden && !allGroupedCities.has(d.location));
    if (elsewhere.length) buildGroupSection('Other', elsewhere.map(d => d.location));

    const pickerSubstackCta = document.getElementById('picker-substack-cta');
    if (pickerSubstackCta) {
        pickerSubstackCta.addEventListener('click', () => {
            locationPicker.classList.add('hidden');
            qwestOverlay.classList.remove('active');
            // Open the Cory "how do you make friends" overlay
            if (coryOverlay) { coryOverlay.classList.add('active'); startCoryKaraoke(); }
            else substackOverlay.classList.add('active');
        });
    }

    // --- Grid View Logic ---
    const citiesGrid  = document.getElementById('cities-grid');
    const openGridBtn = document.getElementById('qwest-open-grid');
    const closeGridBtn = document.getElementById('close-grid');

    openGridBtn.addEventListener('click', () => {
        gridOverlay.classList.add('active');
        stopQwestRotation();
    });

    closeGridBtn.addEventListener('click', () => {
        gridOverlay.classList.remove('active');
        if (qwestOverlay.classList.contains('active')) {
            startQwestRotation();
        }
    });

    // Build the visual cities grid
    qwestData.forEach((data, index) => {
        const card = document.createElement('div');
        card.className = 'city-card';

        const firstPhoto = getPhotoEntry(index, 0);
        const hasNew = data.photos.some(p => typeof p === 'object' && p.isNew);
        
        card.innerHTML = `
            <img class="city-card-img" src="${firstPhoto.src}" alt="${data.location}">
            ${hasNew ? '<span class="city-card-badge">NEW</span>' : ''}
            <div class="city-card-info">
                <span class="city-card-name">${data.location}</span>
                <span class="city-card-count">${data.photos.length} Photo${data.photos.length > 1 ? 's' : ''}</span>
            </div>
        `;

        // Micro-slideshow on card hover
        let hoverTimer = null;
        let hoverIdx = 0;
        const imgEl = card.querySelector('.city-card-img');

        card.addEventListener('mouseenter', () => {
            if (data.photos.length <= 1) return;
            hoverTimer = setInterval(() => {
                hoverIdx = (hoverIdx + 1) % data.photos.length;
                const nextPhoto = getPhotoEntry(index, hoverIdx);
                
                imgEl.style.opacity = '0.5';
                setTimeout(() => {
                    imgEl.src = nextPhoto.src;
                    imgEl.style.opacity = '1';
                }, 150);
            }, 1800); // rotate card previews every 1.8 seconds on hover
        });

        card.addEventListener('mouseleave', () => {
            if (hoverTimer) {
                clearInterval(hoverTimer);
                hoverTimer = null;
            }
            hoverIdx = 0;
            imgEl.src = firstPhoto.src;
            imgEl.style.opacity = '1';
        });

        // Click to load city
        card.addEventListener('click', () => {
            currentLocationIndex = index;
            currentPhotoIndex = 0;
            loadQwestPhoto(true); // load instantly
            gridOverlay.classList.remove('active');
        });

        citiesGrid.appendChild(card);
    });

    loadQwestPhoto();
});
