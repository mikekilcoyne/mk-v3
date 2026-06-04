# mikekilcoyne.com — Punch List

Running list of what we still need to sort out. Add items freely; we'll work them down.

---

## 1. Cohesive styles across the board + framing

**Goal:** one consistent visual system everywhere, and every photo framed so the subject reads clearly.

- [ ] Audit all overlays/pages against [STYLE_GUIDE.md](STYLE_GUIDE.md) — confirm colors (white text + single yellow accent), typography, captions, and scrims match.
- [ ] Eye-line framing pass in `/admin`: click each subject's eyes, keep the gaze at a consistent height across every photo (city by city). Save + Deploy per city.
- [ ] Pick the target eye-line height (e.g. upper third) and apply it consistently so the gaze doesn't jump photo-to-photo.
- [ ] Verify framing holds on mobile, iPad, and desktop (the Phone/Desktop previews in admin should match the live crop).
- [ ] Flag any shots that can't be framed well at both breakpoints — may need a re-crop or to be hidden.

---

## 2. Photo upload + ingest — where do new photos land?

**Current state (already built):** drop photos into `_inbox/<City>/`, run `node manage.js` locally — it optimizes them (via `sips`), files them into `photos_web/NN_CITY/`, and registers them in `qwestData` as `isNew: true`. Full process in [PHOTO_WORKFLOW.md](PHOTO_WORKFLOW.md). Framing/visibility is then tuned in `/admin`.

**Open questions to decide:**
- [ ] Is the local `manage.js` flow the long-term answer, or do we want upload to happen somewhere more convenient (e.g. straight from the admin panel, or a phone)?
- [ ] Should new photos pull from a recurring source — a **weekly newsletter**, a shared album, a folder? Or stay a manual "when I have shots" drop?
- [ ] What's the cadence? (Weekly? Per trip? Ad hoc?) This shapes whether automation is worth building.

---

## 3. CTA + end-goal — what is this site *for*?

**The north-star question:** what outcome should the site drive, so it doesn't become "making + doing stuff with no intended goal"?

- [ ] **Define the end-goal.** Pick the primary outcome the site exists to produce (e.g. grow a newsletter audience / book paid work / build a personal brand / sell something / just a portfolio). Everything else flows from this.
- [ ] **Decide the single primary CTA.** Right now CTAs are scattered ("Let's Play" → email, etc.). One clear ask per page.
- [ ] **Newsletter question:** do we want to drive people to a newsletter? If yes —
  - [ ] How consistent will the cadence realistically be? (Be honest — an inconsistent newsletter hurts more than no newsletter.)
  - [ ] Does the newsletter connect back to the photos (item 2)? (e.g. newsletter = the weekly photo drop.)
- [ ] **Measure of success:** how do we know it's working? (subscribers, replies, bookings, etc.)

> Decide #3 first — it determines the CTA, which determines whether the newsletter exists, which may determine the photo cadence in #2.

---

## Backlog

_(add new items here)_
