# Accessibility — the contrast record

The design gives us a brand palette; WCAG gives us a bar. Where the two disagree,
this file records the disagreement and what we did about it. The rule throughout:
**fix contrast in the semantic mapping, never in a primitive.** A primitive stays
exactly the Figma value (`primary-600` is always `#15C5CE`, traceable to source);
which token sits on top of it is our decision. Faithful to the design is not the
same as faithful to a design _defect_.

Every number below is computed by [`src/styles/contrast-contract.ts`](../src/styles/contrast-contract.ts)
from the shipped tokens, and enforced on every CI run — see [The contract](#the-contract).

## The headline decision: the primary button ships dark text, not white

The Figma primary button is a white label on the cyan fill. **White fails WCAG AA on
the primary ramp at every step** — the best case (`primary-700`) is 2.80:1, which
misses even the 3.0 large-text floor:

| White label on…       | Ratio   | Dark label (`neutral-700`) on… | Ratio       |
| --------------------- | ------- | ------------------------------ | ----------- |
| primary-500 (hover)   | 1.88 ❌ | primary-500                    | **8.76 ✅** |
| primary-600 (default) | 2.12 ❌ | primary-600                    | **7.78 ✅** |
| primary-700 (active)  | 2.80 ❌ | primary-700                    | **5.89 ✅** |

So `content-on-accent` maps to `neutral-700`. **The button will not look like the
mock — dark text on cyan, not white.** That is a deliberate, measured improvement,
not a transcription error, and it is the first thing to raise in a design review.
(For reference: _pure black_ on primary-600 is 9.90:1; our darkest neutral primitive
is `#1F1F1F`, so the shipped token measures 7.78:1. The table reflects what ships.)

## The two kinds of failure

Not every contrast miss is the same problem, so they get different treatment.

### Free fixes — remapped, because a neutral is not brand identity

A grey that fails when a neighbouring grey passes costs nothing to fix.

| Token                    | Source implied | Measured | Shipped         | Measured |
| ------------------------ | -------------- | -------- | --------------- | -------- |
| `content-secondary`      | neutral-500    | 3.28 ❌  | **neutral-600** | 8.72 ✅  |
| `text-info` (deferred)\* | info-600       | 3.68 ❌  | info-700        | 4.57 ✅  |

\* `text-info` is not shipped in this PR (info is primitives-only); the remap is
recorded for when a component needs it.

### Brand conflicts — flagged, not rebranded

These are the brand hue failing against white. Rebranding is a designer's call, not
an engineer's. We can't fix them in the mapping without abandoning the brand colour,
so each is **accepted with a reason** in the contract and **mitigated at component
level** — and, crucially, made impossible to ship _unknowingly_.

- **Cyan as foreground on white** (`content-accent`, links): 2.03–2.12:1 at every step.
  Mitigation: pair with an icon and neutral text, or place on a tinted surface.
  **Decision for every non-solid button label:** the label uses a _neutral_
  foreground, never the cyan. Extracting Button showed the design puts cyan on white
  across the interaction states — Outline hover 1.88, Outline pressed 2.80, Link
  2.12 / 1.88 / 2.80 — all far below AA, and a button label must be legible.
  `content-accent` is reserved for genuine hyperlink text and non-text accent (icon,
  border, hover fill). The shipped label is `content-secondary` at rest and darkens to
  `content-primary` on hover and press (8.72 → 15.12/12.60); the design's hue shift
  becomes a lightness shift, measured at ΔE 20.1 so the state stays perceptible.
- **Focus ring** (`line-focus`/`focus` on white): 1.88–2.12:1 vs the 3.0 that
  SC 1.4.11 requires. Cyan cannot be the indicator of record, so it isn't:
  `focus-strong` (neutral) carries focus at 15.79–16.48 and is _required_ to
  clear the bar in both modes, while cyan `focus` stays available as a
  decorative inner ring. A control's focus state cannot rest on an exemption.
- **Danger text on white** (`content-danger`): 4.21:1 — `danger-700` is the darkest the
  ramp offers and still misses 4.5. Mitigation: icon + the red, or a tinted surface.
- **Danger pressed label** (`content-on-accent` on `danger-solid-active`): 3.91:1 — above
  the 3.0 non-text floor, below 4.5 for small text; accepted as a transient state.
- **Danger as a non-solid label.** Unlike cyan, red is _kept_. The design tracks the
  ramp per state (600 default / 500 hover / 700 pressed → 3.47 / 2.98 / 4.21); we pin
  the label to `content-danger` (`danger-700`, 4.21) across all three instead. That keeps
  one accepted exemption — the same 4.21 class already accepted for `content-danger` on
  white — rather than minting three new ones, which is precisely the dilution
  [decisions.md](decisions.md) warns against. The asymmetry with cyan is deliberate:
  cyan is brand, red is _warning_. Neutralising the label on a destructive control
  removes the signal from the people most likely to depend on it, and SC 1.4.1 is not
  at stake the way it is on Link — the label reads "Delete", so the text already
  carries the meaning and the red reinforces it. Because the label no longer shifts,
  the border and wash carry the whole state signal; both are measured perceptible
  (ΔE 22.7 default→hover, 33.9 hover→pressed).

What we'd propose to design: a darker brand step for text/focus use (a `primary-800`),
or an approved dark-on-cyan pattern (which we've already adopted for the button label).

## Every shipped pair, both modes

Generated from the tokens; ✅ = meets its bar (AA 4.5, or 3.0 for the focus
indicator), ⚠️ = an accepted exemption above. Dark mode passes everything, because
in dark the brand hues sit on dark surfaces, where they have contrast to spare.

| Foreground        | Background           | Light    | Dark     |
| ----------------- | -------------------- | -------- | -------- |
| content-primary   | surface-base         | 15.79 ✅ | 15.79 ✅ |
| content-primary   | surface-raised       | 16.48 ✅ | 15.79 ✅ |
| content-primary   | surface-hover        | 15.12 ✅ | 8.36 ✅  |
| content-primary   | surface-active       | 12.60 ✅ | 20.12 ✅ |
| content-secondary | surface-base         | 8.36 ✅  | 12.60 ✅ |
| content-secondary | surface-raised       | 8.72 ✅  | 12.60 ✅ |
| content-on-accent | accent-solid         | 7.78 ✅  | 7.78 ✅  |
| content-on-accent | accent-solid-hover   | 8.76 ✅  | 8.76 ✅  |
| content-on-accent | accent-solid-active  | 5.89 ✅  | 5.89 ✅  |
| content-on-accent | danger-solid         | 4.75 ✅  | 4.75 ✅  |
| content-on-accent | danger-solid-hover   | 5.53 ✅  | 5.53 ✅  |
| content-on-accent | danger-solid-active  | 3.91 ⚠️  | 3.91 ⚠️  |
| content-accent    | surface-base         | 2.03 ⚠️  | 10.44 ✅ |
| content-accent    | surface-raised       | 2.12 ⚠️  | 10.44 ✅ |
| content-danger    | surface-raised       | 4.21 ⚠️  | 11.63 ✅ |
| content-danger    | danger-subtle        | 3.85 ⚠️  | 6.16 ✅  |
| content-danger    | danger-subtle-active | 3.69 ⚠️  | 14.82 ✅ |
| line-focus        | surface-raised       | 2.12 ⚠️  | 8.76 ✅  |
| focus             | surface-raised       | 1.88 ⚠️  | 8.76 ✅  |
| focus-strong      | surface-base         | 15.79 ✅ | 15.79 ✅ |
| focus-strong      | surface-raised       | 16.48 ✅ | 15.79 ✅ |

Disabled text (`content-disabled`) is WCAG-exempt and not tabled.

### The danger ghost pressed wash

One row above is a value we changed rather than accepted. Figma draws the danger ghost
pressed surface as `danger-300`, which seats the pinned `danger-700` label at **2.97** —
under even the 3.0 non-text floor, and a worse exemption than the 4.21 class we are
reusing. The options were measured: `danger-300` 2.97 (as drawn), `danger-200` **3.69**,
`danger-100` 3.85 but ΔE 0 from the hover wash, i.e. no pressed state at all. So
`danger-subtle-active` maps to `danger-200` — one ramp step lighter than drawn, the
smallest change that avoids minting a sub-3.0 exemption, and still a perceptible press
(ΔE 3.7 from hover).

## Palette limitations worth naming

Two consequences of an 8-step, light-to-mid ramp. Both are recorded, not patched with
invented values.

**No dark chromatic tint.** There is no "danger surface for dark mode." So in dark, the
subtle brand surfaces (`accent-subtle`, `danger-subtle`) degrade to a neutral hover wash
(`neutral-600`); a ghost control's brand identity is then carried by its text and border,
not its fill.

**Pressed darkens in dark mode — the ramp forces it.** In light, a ghost control's press
goes one step deeper than its hover (`neutral-100` → `neutral-300`). In dark that
direction is unavailable: hover already occupies `neutral-600` (`#4B4B4B`) and the next
step up is `neutral-500` (`#8E8E8E`), which seats the `neutral-50` label at **3.14** and
the `danger-300` label at **2.31** — both fail. So `surface-active` and
`danger-subtle-active` resolve to **black** in dark, clearing at 20.12 / 14.82 and
reading as a deeper recess (ΔE 31.9 from hover). The press inverts direction between
modes; that is the shallow dark end of the neutral ramp again, the same limitation that
makes elevation a border below — not a stylistic preference.

**Dark elevation is a border, not a shadow.** The neutral ramp is shallow at the dark
end (nothing between `#1F1F1F` and `#4B4B4B`, which is too light to seat body text), so
`surface-base`, `surface-raised` and `surface-overlay` all resolve to `#1F1F1F`. The
elevation shadows are black at 6–12% alpha, and **over `#1F1F1F` that is imperceptible —
`elevation-4` measures ~1.05:1 against the surface.** So a dark-mode Dialog does not
separate from the page behind it by tint or shadow; **it must carry a visible border.**
That makes the border load-bearing in dark rather than decorative — an explicit
obligation on Dialog/popover, recorded in [CLAUDE.md](../CLAUDE.md) so the component
session sees it first.

## The contract

[`src/styles/contrast-contract.ts`](../src/styles/contrast-contract.ts) turns this
document into a CI gate, so a token change can't silently degrade contrast — the
failure mode that otherwise gets found by hand, late.

- **Violations** — every pair above is measured in both modes against its committed
  level. Drop below and the build fails. An _accepted_ pair that later climbs back
  above its bar also fails: a stale exemption is a lie we stop telling.
- **Omissions** — the token universe is read from the stylesheet, and every colour
  token must be _accounted for_ (named in a pair, or listed in `IGNORED` with a
  reason). Add a token and forget to place it, and the build fails. The gap can't hide.

The adjacency (which surface a foreground legitimately sits on) is human judgement and
stays a maintained list; the guard is what keeps that list honest. Both failure modes
are proven by provoking them — see the PR description.
