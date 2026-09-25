/* Thank-you pages (/jim, /tara, /sam). See css/thanks.css.

   The video loads on the tap, not with the page: browsers won't start a
   video with sound unprompted, and this one is nothing without sound. The
   tap is the play — same pattern as the story film on the home page — and
   the cover only holds until the embed has assembled itself. */
(function () {
    const stage = document.getElementById('thanks-stage');
    const cover = document.getElementById('thanks-cover');
    const frame = document.getElementById('thanks-video');
    if (!stage || !cover || !frame) return;

    function reveal() { cover.classList.add('is-hidden'); }

    stage.addEventListener('transitionend', (e) => {
        if (e.target === stage && e.propertyName === 'transform') {
            stage.classList.add('is-full');
        }
    });

    cover.addEventListener('click', () => {
        if (frame.src) return;
        frame.addEventListener('load', reveal, { once: true });
        frame.src = frame.dataset.src;
        stage.classList.add('is-playing');
        // Reduced motion: no transition runs, so no transitionend fires.
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
            stage.classList.add('is-full');
        }
        // Backstop — `load` on a cross-origin iframe isn't guaranteed, and a
        // cover stuck over a playing video is a dead end.
        setTimeout(reveal, 2200);
    });
}());
