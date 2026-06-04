# Photo Workflow

How new images get onto mikekilcoyne.com, end to end.

## The model

Every photo shown on the site is an entry in the `qwestData` array in
`js/script.js`. Each entry is `{ src, pos, isNew, hidden }`:

- `src` — path under `photos_web/NN_CITY/`
- `pos` — CSS object-position for framing (set visually in /admin)
- `isNew` — shows the NEW badge
- `hidden` — kept in the array but not shown

There are two tools:

- **`manage.js`** (local CLI) — gets raw images *in*: optimize, file, register.
- **`/admin`** (web panel) — fine-tunes what's already in: framing, hide/show.
  It commits `script.js` to GitHub and auto-deploys via Netlify.

## Adding photos (the normal flow)

1. In `_inbox/`, make a folder named exactly as the city should read,
   e.g. `_inbox/Denver, CO/`. Drop the raw photos in (JPG/PNG/HEIC ok).
2. New city? Add `_inbox/Denver, CO/meta.json` → `{ "country": "Europe" }`
   so it lands in the location picker. Country = a `COUNTRY_GROUPS` label
   (North America, Japan, Europe).
3. Preview: `node manage.js --dry`
4. Run for real: `node manage.js`
   - Resizes to max 2000px, JPEG q80, converts HEIC/PNG → JPG (macOS `sips`).
   - Copies into the right `photos_web/NN_CITY/` folder.
   - Appends entries to `qwestData` with `isNew: true`.
   - Moves processed originals to `_inbox/_done/`.
5. Open `/admin`, drag each new photo to frame it, hit **Save + Deploy**
   (or commit `script.js` yourself).
6. Commit the new image files + script.js:
   `git add -A && git commit -m "photos: ingest new images" && git push`

## Flags

- `--dry` — preview, write nothing
- `--max=NNNN` — max pixel dimension (default 2000)
- `--q=NN` — JPEG quality 0–100 (default 80)

## Notes

- `_inbox/` raw drops are gitignored — only the tool and folder structure
  are tracked. Don't commit unoptimized originals.
- `manage.js` never pushes; it only edits local files. You stay in control
  of the commit.
