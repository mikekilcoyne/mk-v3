# Photo Essay Workflow

How a written piece + a folder of photos becomes a page on mikekilcoyne.com.

## The model

Every essay is one JSON file in `content/essays/<slug>.json`. That file is the
single source of truth — the page, the framing, the share text, everything.
The site reads it at runtime; nothing is hardcoded in JS.

Three pieces work on it:

- **`manage-essays.js`** (local CLI) — gets writing + photos *in*: optimizes
  images, parses the text into chapters and cards, generates the page.
- **`/admin/essays.html`** (web panel) — fine-tunes what's already in: which
  photo goes with which chapter, focal points, labels, published state.
  Commits to GitHub and auto-deploys via Netlify.
- **`js/essay.js`** (the engine) — renders the JSON as a scrollytelling page.

An essay lives at `mikekilcoyne.com/<slug>` (e.g. `/the-incident`).

## Adding an essay (the normal flow)

1. Make a folder named exactly the URL you want:
   `_inbox/essays/how-to-be-happy/`
2. Drop in the writing as `essay.md` (or `.txt`) and the photos (JPG/PNG/HEIC).
   Name photos so they sort roughly into story order — the tool assigns them
   in filename order as a starting point.
3. Preview: `node manage-essays.js --dry`
4. Run for real: `node manage-essays.js`
   - Resizes to max 1920px, JPEG q82, into `photos_web/essays/<slug>/`
   - Parses the text into chapters + text cards
   - Writes `content/essays/<slug>.json` and `<slug>/index.html`
   - Registers it in `content/essays/index.json`
   - Moves originals to `_inbox/essays/_done/<slug>/`
5. Open `/admin/essays.html`, click through each scene: pick the right photo
   from the strip, click the subject to set the focal point, name the chapter
   label. Hit **Save + Deploy**.
6. Commit the new image files:
   `git add -A && git commit -m "essays: add <slug>" && git push`

### Fixing the writing later

Put the folder back in `_inbox/essays/<slug>/` with the corrected `essay.md`
and re-run. **Photo assignments, focal points, and labels are preserved** —
only the text is refreshed. Fixing a typo never costs you the framing work.

If you only changed the title or description, `node manage-essays.js --rebuild`
regenerates the pages and index from the JSON without touching photos.

## essay.md format

```markdown
---
title: How to Be Happy
byline: By Michael Kilcoyne · Kyoto
description: One line for search results and link previews.
---

Opening paragraph. Blank lines separate paragraphs.
Paragraphs stack into one floating text card.

---                       <- forces a new card

# Chapter Heading         <- starts a new chapter (new photo, title card)

Text under that chapter. *Italics* with asterisks.
```

- Frontmatter is optional; `title` falls back to the first `#` heading.
- A card holds up to 4 paragraphs, then splits automatically (`--per-block=N`).
- `&`, `<`, `>` are escaped, straight quotes are curled, `--` becomes an em
  dash. Text is inserted as HTML, so `*italics*` is the way to emphasize.

## The JSON schema

```jsonc
{
  "slug": "the-incident",
  "title": "…",              // shown on the title screen
  "kicker": "A Photo Essay",  // small yellow line above the title
  "byline": "By Michael Kilcoyne · Istanbul",
  "description": "…",         // meta description + link preview
  "published": true,          // false hides it from Next Essay
  "date": "2026-07-21",
  "photoDir": "photos_web/essays/the-incident",
  "photos": ["…"],            // every photo available to the admin picker
  "cover":    { "img": "DSC01320.jpg", "pos": "50% 50%" },
  "chapters": [
    {
      "heading": "",          // optional centered title card
      "label": "Last Call",   // shown top-right while reading
      "img": "P1014916.jpg",
      "pos": "60% 50%",       // CSS object-position focal point
      "blocks": [ ["paragraph", "paragraph"] ]   // one array = one card
    }
  ],
  "end": {
    "title": "That's how to be happy.",
    "img": "…", "pos": "…",
    "shareSubject": "…",
    "shareBody": "… {url}"    // {url} is replaced with the live link
  }
}
```

`img` values are bare filenames resolved against `photoDir`, so the whole set
can be relocated by editing one field.

## Reader-facing behavior

- Photos are a fixed background layer; two `<img>`s crossfade on chapter change.
- Text cards fade up as they enter the viewport.
- Navigation: normal scroll, horizontal swipe on mobile, arrow keys, or the
  two round buttons bottom-right — each advances exactly one card.
- The end card links to the **next published essay** (wrapping around) and a
  **Share With a Friend** mailto built from `shareSubject` / `shareBody`.

## Notes

- `_inbox/` raw drops are gitignored — don't commit unoptimized originals.
- `manage-essays.js` never pushes; it only edits local files.
- The admin panel writes only `content/essays/*.json`. Anything else is
  rejected server-side in `netlify/functions/admin.js`.
- A `/essays` landing page listing everything is the natural next step once
  there are a handful; `content/essays/index.json` already has the data.
