# MK / OutroSpective — Brand Guidelines

The title system built for *OutroSpective Goes to Breakfast*, and the basis for the wider MK identity.

Every value here is taken from the live production CSS (`css/outrospective.css`). The portable stylesheet is `css/mk-brand.css` — import that and the tokens below are already wired.

---

## 1. The Lockup

Two stacked words, **optically identical in width**, split by a yellow rule. The width match is the whole idea — it's what makes it read as a *mark* rather than as two lines of type.

```
        O U T R O
        ─────────        ← 3px accent rule
        SPECTIVE
    GOES TO BREAKFAST    ← kicker, same width
```

| Property | Value |
|---|---|
| Structure | OUTRO over SPECTIVE, centred, divided by a 3px accent rule |
| Weights | OUTRO **Bold 700** · SPECTIVE **Regular 400** — the contrast carries the hierarchy |
| Case | All caps, both lines |
| Canvas | `viewBox="0 0 300 122"`, baselines at `y=46` / `y=104` |
| Rule | `x=90 · y=57 · w=120 · h=3` — animates out from centre |
| Max width | `min(74vw, 440px)` |
| Shadow | `drop-shadow(0 4px 20px rgba(0,0,0,.55))` |

### ⚠️ The one technical rule

Equal width is enforced with SVG `textLength` + `lengthAdjust="spacing"`, which stretches the **gaps between letters** — never the letterforms.

**Never use `spacingAndGlyphs`.** It distorts the type.

Because `textLength` is an absolute number, **any change to the typeface, weight, case or wording means re-measuring:**

1. Render SPECTIVE with no `textLength`
2. Read `element.getComputedTextLength()`
3. Set that number as `textLength` on **OUTRO** *and* the **kicker**

Current value with Paquito: **184**

### Markup

```html
<div class="mk-wordmark">
  <svg class="mk-wm" viewBox="0 0 300 122" role="img"
       aria-label="OutroSpective" preserveAspectRatio="xMidYMid meet">
    <text class="mk-wm-line mk-wm-outro" x="150" y="46"
          textLength="184" lengthAdjust="spacing"
          text-anchor="middle">OUTRO</text>
    <rect class="mk-wm-rule" x="90" y="57" width="120" height="3"></rect>
    <text class="mk-wm-line mk-wm-spective" x="150" y="104"
          text-anchor="middle">SPECTIVE</text>
  </svg>
</div>

<svg class="mk-kicker" viewBox="0 0 300 22"
     preserveAspectRatio="xMidYMid meet"
     role="img" aria-label="Goes to Breakfast">
  <text x="150" y="17" textLength="184" lengthAdjust="spacing"
        text-anchor="middle">GOES TO BREAKFAST</text>
</svg>
```

---

## 2. Typefaces

Four faces, each with one job. **Paquito is the voice**; everything else supports it.

| Face | Role | Usage |
|---|---|---|
| **Paquito Bold** | Display · primary | The dominant half of the lockup (OUTRO) |
| **Paquito Regular** | Display · secondary | The lighter counterweight (SPECTIVE) |
| **Clash Display Bold** | Sub-header | The kicker, in accent yellow, 15px on the SVG canvas |
| **Helvetica Neue Bold** | UI · labels · headings | All caps, 2–3px tracking. Every label, button, eyebrow, section heading |
| **Georgia Italic** | Editorial body | The reflective register — long-form copy, anything meant to feel spoken |

Paquito and Clash Display are free from **Fontshare** (commercial use OK):

```
https://api.fontshare.com/v2/css?f[]=paquito@400,700&f[]=clash-display@700&display=swap
```

**Why Helvetica Neue matters:** it's the same face Breakfast Club International uses. Keeping it ties the two properties together.

### Stacks

```css
--font-display: 'Paquito', Georgia, serif;
--font-kicker:  'Clash Display', 'Helvetica Neue', sans-serif;
--font-ui:      'Helvetica Neue', Helvetica, Arial, sans-serif;
--font-body:    Georgia, 'Times New Roman', serif;
```

---

## 3. Colour

**One accent, one job.** Yellow means *active / now / highlight* — spend it on a single element per view and let everything else stay quiet.

| Token | Hex | Use |
|---|---|---|
| `--c-accent` | `#FFDD66` | The only accent. Rules, highlights, active states, sub-headers |
| `--c-text` | `#ffffff` | Primary type over imagery |
| `--c-text-dim` | `rgba(255,255,255,0.5)` | Resting / inactive text |
| `--c-ground` | `#060606` | Page ground, non-photographic panels |
| `--c-neon` | `#FF1D9C` | **Signature mark only.** Never a UI colour |
| `--c-scrim` | `rgba(0,0,0,0.45)` | Behind type over photography |

### Glow

Active accent elements carry a soft halo — present, never blinding:

```css
--glow-accent: 0 0 12px rgba(255,221,102,0.55),
               0 0 26px rgba(255,221,102,0.25);
```

---

## 4. The Signature

The neon-pink *Michael Kilcoyne* mark is the **authorship credit**. It appears once, at the end of a lockup — never as a logo in navigation.

| Property | Value |
|---|---|
| Placement | Beneath the lockup, under a small `CREATED BY` label |
| Label | Helvetica Neue Bold · 0.6rem · 3px tracking · white @ 60% |
| Width | `min(41vw, 200px)` |
| Opacity | 90% — it sits *in* the image, not on top of it |
| Variants | Neon pink (primary), plus white, black, yellow-shadow and 3D marks in the logo kit |

Asset: `assets/logo/mk-neon-pink.png` (full kit in `assets/Logos + No Backdrop/`)

---

## 5. Motion

The mark **assembles** rather than appears. One easing curve governs everything.

| Element | Behaviour |
|---|---|
| Easing | `cubic-bezier(0.76, 0, 0.24, 1)` |
| Lockup | Fade up 16px over 0.9s, delayed 0.15s |
| Rule | Scales out from centre over 0.8s, delayed 0.8s — **it lands last** |
| Reduced motion | All entrances resolve instantly; the rule renders at full width |

---

## 6. Using It

### ✅ Do

- Re-measure and re-match the widths after any type change
- Place it over photography with real negative space — sky, water, a wall
- Keep the yellow to one job per view
- Let the drop-shadow do the legibility work before reaching for a heavier scrim

### ❌ Don't

- Stretch the letterforms to force a width match
- Set both lines at the same weight
- Introduce a second accent colour
- Use the neon signature as a nav logo or UI accent
- Place the lockup over a busy subject — it needs a quiet field

---

## 7. Quick reference — all tokens

```css
:root {
    /* Type */
    --font-display: 'Paquito', Georgia, serif;
    --font-kicker:  'Clash Display', 'Helvetica Neue', sans-serif;
    --font-ui:      'Helvetica Neue', Helvetica, Arial, sans-serif;
    --font-body:    Georgia, 'Times New Roman', serif;
    --ls-ui:    2px;
    --ls-label: 3px;
    --fw-ui:    700;

    /* Colour */
    --c-text:     #ffffff;
    --c-text-dim: rgba(255,255,255,0.5);
    --c-accent:   #FFDD66;
    --c-neon:     #FF1D9C;
    --c-ground:   #060606;
    --c-scrim:    rgba(0,0,0,0.45);

    /* Effects */
    --glow-accent: 0 0 12px rgba(255,221,102,0.55),
                   0 0 26px rgba(255,221,102,0.25);
    --ease-brand:  cubic-bezier(0.76, 0, 0.24, 1);
}
```
