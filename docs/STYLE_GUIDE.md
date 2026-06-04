# mikekilcoyne.com — Style Guide

The single, plain-English reference for how the site should look and behave.
All visual values live as **design tokens** in `:root` (top of `css/style.css`).
Change a token once; it updates everywhere.

---

## 1. Design tokens

| Token | Value | Use |
|---|---|---|
| `--font-ui` | Helvetica Neue / Arial | All UI text, labels, buttons |
| `--ls-ui` | `2px` | Default UI letter-spacing |
| `--ls-label` | `3px` | Small uppercase labels (e.g. speaker tags) |
| `--fw-ui` | `700` | UI weight |
| `--c-text` | `#ffffff` | Primary text |
| `--c-text-dim` | `rgba(255,255,255,0.5)` | Resting / inactive text |
| `--c-accent` | `#FFDD66` | Highlight yellow (karaoke, active states) |
| `--c-scrim` | `rgba(0,0,0,0.18)` | Caption/overlay scrim behind text |
| `--glow-accent` | soft yellow glow | Active-state glow — lighter than before |

---

## 2. Colors

- **Base text is white** (`--c-text`), dimmed to `--c-text-dim` when resting.
- **One accent only: yellow** (`--c-accent`). No pink. Yellow signals "active / now / highlight."
- Glows are **soft** (`--glow-accent`) — present but never blinding.

---

## 3. Typography

- **UI / titles / buttons:** `--font-ui`, uppercase, `--ls-ui`, weight `--fw-ui`.
- **Display ("Let's Play", captions):** `NCL Neo Vibes`.
- Titles must stay **legible and clean** — drop shadow for contrast, never an empty outline.
- Body/labels never smaller than ~0.9rem effective.

---

## 4. Captions (karaoke)

- Filled **white**, dimmed at rest (`--c-text-dim`).
- Active word turns **yellow** (`--c-accent`) with the soft `--glow-accent`.
- Same treatment everywhere — Let's Play **and** the "Making Friends" (Cory) overlay are identical.
- Sit in a centered scrim box (`--c-scrim`, blurred) at the lower third; text wraps, never clipped.

---

## 5. Layout

- **Home hero:** headline + CTAs are one stack, **vertically centered** in the viewport.
- **Photo overlays (Adventure Flipbook):** full-bleed image; controls live at the **bottom**, not over the subject.
- No page should feel busy. Whitespace is a feature.

---

## 6. Imagery & framing

- Every photo: subject **in-frame and centered** on mobile, iPad, and desktop.
- Full-bleed via `object-fit: cover` + per-photo `object-position` (the `pos` field in `qwestData`).
- **Baseline is `50% 50%` (centered)** for every photo. Hand-tune `pos` only for the few shots whose subject sits off-center — never bulk-shift.
- **Eye-line consistency:** the viewer's gaze should not jump between photos. Aim to keep each subject's eyes/face at a similar height across the set.
- Tune framing in **`/admin`**: click the subject's eyes on a photo to set the focal point; the Phone + Desktop previews show the real full-bleed crop at each breakpoint. Save + Deploy writes the new `pos` to `qwestData`.
- Goal: **consistent framing across the board** — no askew subjects.
- New photos are ingested via `manage.js` (see `docs/PHOTO_WORKFLOW.md`).

---

## 7. Buttons & wayfinding

- Every button states **what happens and where it goes** — no mystery labels.
- Page text should make clear **where you are**.
- Use attention-grabbers (`New`, `CTA` badges) **sparingly**. One per view, max.

---

## 8. Principles

1. One accent color. One job for it.
2. Legible everywhere, every breakpoint.
3. Center the subject — text and image both.
4. Quiet by default; highlight on purpose.
