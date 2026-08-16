# mikekilcoyne.com — style guidelines

This file is the filter for every creative and technical decision on this site.
When a change is ambiguous, the rules here decide it. When a rule here conflicts
with a request, say so before building.

---

## 1. What the site is for

The site exists to make a potential collaborator — a creative director, director,
writer, animator, producer — look at it and think *"this is the guy I've been
looking for."*

That means the site must transmit three things: **the work, the voice, the vibe.**
Not a résumé. Not a portfolio grid. A person you'd want in the room.

**The North Star test.** Every change gets one question:

> Does this make MK's voice, personality, and style land faster or harder for
> someone deciding whether to work with him?

If the answer is no, don't ship it. "It looks cool" is not the answer.

**Who specifically.** Four avatars — Creative Director, Director, Artist/Performer,
Producer. Name the one a change serves before building it; see
[docs/avatars.md](docs/avatars.md).

---

## 2. One page, one outcome

**Every page, section, and screen has exactly one intended next action.** Name it
before building. If you can't name it in a sentence, the section isn't designed
yet.

Two or more competing CTAs on one screen is a bug. Cut to one.

The three legitimate outcomes, in order of the funnel:

| Outcome | When it's the right one | What it looks like |
|---|---|---|
| **Keep reading** | Engagement is building — they're mid-essay, mid-timeline | Next chapter, next essay, an inline link into a deeper piece |
| **Share** | They've finished something — end of an essay, end of the timeline | Share link on the end card |
| **Reach out** | They've consumed enough to have an opinion of him | The collaborate CTA (see §7) |

**Never put "reach out" in front of someone who hasn't read anything yet.** It
converts worse and it reads as needy. Earn it first.

---

## 3. The incense drawer principle

**The drawer of incense goes under the incense holder.**

The thing someone wants next should already be there, or within reach, and obvious.
Nobody should have to wonder where something is, how to get anywhere, or what
happens if they click. Discovery is not a feature. If a visitor has to explore to
find the thing they came for, the design failed — no matter how good it looks.

This outranks aesthetics. A beautiful screen that makes someone hunt loses to a
plain one that doesn't.

**What it forbids:**
- Content hidden behind an overlay or modal a visitor has no reason to open
- A label that doesn't land where it promises ("Photo Essays" must go to the essays,
  not to one essay)
- Any page with no visible way onward — every screen offers the next step
- Orphan pages: if a page exists, something links to it. Check after every reroute.
- Hover-to-reveal navigation, mystery-meat icons, "scroll to discover"
- Making someone go back to the home page to get anywhere else

**What it requires:**
- The next action sits where the eye already is when the want appears — at the end
  of the thing they just finished, not in a header they scrolled past
- Every destination is reachable in one click from where the desire for it forms
- Labels say exactly what happens. "Send me a Note" over "Get in touch"; "Next
  Essay →" over "More".

**The test:** hand the screen to someone who has never seen it and name a goal.
If they pause, the design is wrong — not the person.

---

## 4. Reading experience

**Headers are center-aligned.** Page titles, section headings, chapter headings,
end-card titles. Body copy stays left-aligned — centered paragraphs are hostile to
read.

**No one should ever have to scroll to finish reading a unit of text.** A chapter,
a card, a caption: whatever is on screen must be complete on screen, at both mobile
and desktop widths. If copy doesn't fit one viewport, the fix is to cut the copy or
split it into two screens — never to let it overflow and require a scroll to finish
the thought.

Scrolling to reach the *next* unit is correct and expected. Scrolling to finish the
*current* one is a failure.

**Test both.** 375×812 (mobile) and 1280×800 (desktop) before calling anything done.
Long words, long place names, and two-line headings are where this breaks.

---

## 5. Photography and legibility

Photos are the point. They are not wallpaper behind a text box.

**The image must stay readable as an image.** If the text plate covers the subject,
move the plate or change the crop (`pos`), don't dim the photo. A full-bleed scrim
that flattens a photo to grey defeats the reason the photo is there.

**Text plates use the glass treatment** — the Apple approach: a translucent panel
that blurs and saturates the photo *behind* it, so the plate takes its color from
the image rather than sitting on it as a foreign grey box. This is already the
`.essay-block` treatment in [css/essay.css](css/essay.css):

```css
background: rgba(16,16,18,0.42);
backdrop-filter: blur(22px) saturate(150%);
```

Rules for it:
- `saturate()` is what pulls the image's color into the plate. Don't drop it.
- Keep the fill translucent. Once opacity passes ~0.55 it stops being glass.
- Radius stays at 2px. Squared, not rounded — see §8.
- One hairline top highlight for the lit edge. No heavy borders.
- A plate that contains only a button gets no plate (`.essay-block--bare`) — a box
  inside a box reads badly.

**Body copy over a photo always sits on a plate.** Headlines and short kickers may
sit directly on the image with a hard drop-shadow, as on the hero.

---

## 6. Links and CTAs

**Default to hyperlinked text inside a sentence.** If a paragraph mentions
*OutroSpective*, the words "OutroSpective" are the link. This is the primary CTA
form on the site.

**Button-style CTAs are the exception,** reserved for the end card and for one
deliberate moment per page at most.

**Embeds earn their place by serving the sentence before them.** A livid.com embed
goes in when the copy has just described the thing and the reader would naturally
want to see it. An embed dropped in because a section felt empty is noise — cut it
or write the copy that earns it.

**No floating buttons, no sticky bars, no popups, no newsletter interstitials.**

---

## 7. The collaborate CTA (in progress)

The funnel's end goal is a direct message about working together. The current
placeholder across the site is `mailto:mike@mikekilcoyne.com` labeled
**"Send me a Note."**

**Recommended direction — a dedicated page at `/work-with-me`,** with the button
labeled for the reader's intent rather than the mechanism. "Send me a Note" is
polite but says nothing about what happens next; a collaborator wants to know
they're not shouting into a void.

The page should carry: one line on what he's looking for, one line on what he
brings, and a single mailto with a pre-filled subject. No form — a form implies a
queue, a mailto implies a person.

Where it appears: the end card of every essay, once, after the share link. Nowhere
above the fold on any page.

**This is a proposal, not a decision. See the flagged list — MK's call on the
wording and whether it's a page or just a better-labeled mailto.**

---

## 8. Type and color

Site-wide consistency. **Only `/outrospective` is allowed its own visual identity**
— it's a pitch surface for a distinct project.

| Role | Face | Notes |
|---|---|---|
| Display / headings | **Clash Display Bold** | White on photos; `#FFDD66` for kickers and subheads, with a hard black drop-shadow |
| Body copy | **Gambetta** (Fontshare) | Times-ish with quirk. Georgia fallback |
| UI, labels, buttons | **Helvetica Neue** | Uppercase, ~3px tracking |
| Accent (home type-out only) | **Paquito** | The yellow emphasis word |

Yellow is `#FFDD66` (`#FFDD22` on the home type-out). It is the accent — one thing
per screen gets it. Everything else is white on photograph.

**Buttons:** uppercase Helvetica bold, 3px tracking, 4px radius, scrim background,
yellow glow on hover. **Plates and cards:** 2px radius. Don't mix these up.

**Cap-height matching.** Measured cap ÷ font-size: Clash Display 0.680, Paquito
0.717, Helvetica Neue 0.731. Paquito's caps are *taller* than Clash's — the
intuition runs backwards. To match heights across faces, scale to Clash's cap:
Paquito `0.948em`, Helvetica `0.930em`. Re-derive with canvas
`measureText('H').actualBoundingBoxAscent / fontSize` if a face changes.

---

## 9. Build mechanics — read before editing

- **Run the dev server with `node dev-server.js`** (or the `mk-site` launch config),
  never `python -m http.server`. It injects the annotation overlay so MK can circle
  things on the page; notes land in `notes/design-notes.json` for Claude to action.
- **Cache-bust after every CSS/JS edit.** Bump `?v=N` in `index.html` and in the
  `manage-essays.js` template. The browser caches the generated HTML too, so a
  stale asset will silently persist otherwise.
- **Essay pages are generated.** Edit `content/essays/<slug>.json`, then
  `node manage-essays.js --rebuild`. Don't hand-edit `<slug>/index.html`.
- **`rebuildPhotoManifest()` writes `content/photos.json`** — it must live at
  `content/`, not `content/essays/`. The rebuild loop treats every JSON in
  `content/essays/` as an essay and crashes.
- **Fonts load from Fontshare with `display: swap`.** Anything that animates text
  must wait on `document.fonts` before it starts, or the first frame renders in the
  fallback face and snaps. See the boot sequence in [js/script.js](js/script.js).
- **SEO is generated, not hand-written.** `node build-seo.js` writes `sitemap.xml`
  and `robots.txt` and injects canonical tags (plus `noindex` on unpublished essays
  and private areas) between `<!-- seo:start -->` / `<!-- seo:end -->` markers.
  Never hand-edit inside those markers — they're overwritten. It's idempotent and
  `manage-essays.js` chains it automatically, since regenerating an essay page
  would otherwise wipe its `<head>`. Site-specific values live in
  `seo.config.json`; that file plus `build-seo.js` port to breakfastclubbing.com
  unchanged apart from `site` and `name`.
- **Validate JSON before committing.** `node -e "JSON.parse(require('fs').readFileSync('content/essays/now.json','utf8'))"`.
  A stray bracket takes the whole page down with no error in the browser.

---

## 10. Definition of done for v1 — the 90% line

This version ships at **90%, not 99%.** The last 9% costs more than the first 90 and
is invisible to everyone except MK. The line is drawn here:

**In scope — v1 is not done until these are true:**
- Every page has one named outcome and an obvious next click
- No placeholder copy anywhere a visitor can reach
- Every photo is a deliberate pick, not a stand-in
- Headers centered; nothing needs scrolling to finish; works at 375 and 1280
- Link previews (title, description, OG image) are correct on every shared page
- One collaborate CTA, consistently worded, reachable from every essay end card

**Explicitly out of scope for v1 — do not spend time here:**
- Pixel-perfect parity between mobile and desktop. Close is done.
- Animation polish beyond what already exists. Static and correct beats animated
  and fragile — see the progress bars in [css/working-on.css](css/working-on.css).
- A CMS, a blog index, tags, search, or an archive
- Analytics beyond whatever is already wired
- Custom OG images per page. One good default per page is enough.
- Rewriting the published essays. They work. Leave them.
- Accessibility beyond the basics (visible focus, alt text, reduced-motion)

**The tiebreaker:** if a task would only be noticed by someone already convinced,
it's out. If it would be noticed by someone deciding, it's in.

---

## 11. Ship checklist

Before any page goes live:

- [ ] Name the page's one intended outcome in a sentence
- [ ] Every heading center-aligned; body copy left-aligned
- [ ] No text unit requires scrolling to finish — checked at 375px and 1280px
- [ ] Every photo still reads as a photo; subject not buried under a plate
- [ ] Text plates use glass (translucent + blur + saturate), 2px radius
- [ ] Links are inline text; at most one button-style CTA
- [ ] Every embed is earned by the sentence above it
- [ ] The next action is obvious without hunting
- [ ] Incense drawer: every label lands where it promises; nothing needed is behind
      an overlay; no orphan pages (re-check after any reroute); every screen offers
      a way onward
- [ ] JSON parses; assets cache-busted
- [ ] North Star test: does this land the voice faster?
