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

So `text-on-accent` maps to `neutral-700`. **The button will not look like the
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
| `text-secondary`         | neutral-500    | 3.28 ❌  | **neutral-600** | 8.72 ✅  |
| `text-info` (deferred)\* | info-600       | 3.68 ❌  | info-700        | 4.57 ✅  |

\* `text-info` is not shipped in this PR (info is primitives-only); the remap is
recorded for when a component needs it.

### Brand conflicts — flagged, not rebranded

These are the brand hue failing against white. Rebranding is a designer's call, not
an engineer's. We can't fix them in the mapping without abandoning the brand colour,
so each is **accepted with a reason** in the contract and **mitigated at component
level** — and, crucially, made impossible to ship _unknowingly_.

- **Cyan as foreground on white** (`text-accent`, links): 2.03–2.12:1 at every step.
  Mitigation: pair with an icon and neutral text, or place on a tinted surface.
  **Decision for ghost/link buttons:** the label uses a _neutral_ foreground
  (`text-primary`), not the cyan — cyan-on-white (2.12) and cyan-on-`accent-subtle`
  (2.02) both fail AA, and a button label must be legible. `text-accent` is reserved for
  genuine hyperlink text and non-text accent (icon, border, hover fill). The neutral
  label is verified: `text-primary` on `accent-subtle` is 15.67 (light) / 8.36 (dark).
- **Focus ring** (`border-focus`/`ring-focus` on white): 1.88–2.12:1 vs the 3.0 that
  SC 1.4.11 requires. Mitigation: the Input resolves focus visibility with a neutral
  offset/halo, not the cyan alone.
- **Danger text on white** (`text-danger`): 4.21:1 — `danger-700` is the darkest the
  ramp offers and still misses 4.5. Mitigation: icon + the red, or a tinted surface.
- **Danger pressed label** (`text-on-accent` on `danger-solid-active`): 3.91:1 — above
  the 3.0 non-text floor, below 4.5 for small text; accepted as a transient state.

What we'd propose to design: a darker brand step for text/focus use (a `primary-800`),
or an approved dark-on-cyan pattern (which we've already adopted for the button label).

## Every shipped pair, both modes

Generated from the tokens; ✅ = meets its bar (AA 4.5, or 3.0 for the focus
indicator), ⚠️ = an accepted exemption above. Dark mode passes everything, because
in dark the brand hues sit on dark surfaces, where they have contrast to spare.

| Foreground     | Background          | Light    | Dark     |
| -------------- | ------------------- | -------- | -------- |
| text-primary   | surface-base        | 15.79 ✅ | 15.79 ✅ |
| text-primary   | surface-raised      | 16.48 ✅ | 15.79 ✅ |
| text-primary   | accent-subtle       | 15.67 ✅ | 8.36 ✅  |
| text-secondary | surface-base        | 8.36 ✅  | 12.60 ✅ |
| text-secondary | surface-raised      | 8.72 ✅  | 12.60 ✅ |
| text-on-accent | accent-solid        | 7.78 ✅  | 7.78 ✅  |
| text-on-accent | accent-solid-hover  | 8.76 ✅  | 8.76 ✅  |
| text-on-accent | accent-solid-active | 5.89 ✅  | 5.89 ✅  |
| text-on-accent | danger-solid        | 4.75 ✅  | 4.75 ✅  |
| text-on-accent | danger-solid-hover  | 5.53 ✅  | 5.53 ✅  |
| text-on-accent | danger-solid-active | 3.91 ⚠️  | 3.91 ⚠️  |
| text-accent    | surface-base        | 2.03 ⚠️  | 10.44 ✅ |
| text-accent    | surface-raised      | 2.12 ⚠️  | 10.44 ✅ |
| text-danger    | surface-raised      | 4.21 ⚠️  | 11.63 ✅ |
| text-danger    | danger-subtle       | 3.85 ⚠️  | 6.16 ✅  |
| border-focus   | surface-raised      | 2.12 ⚠️  | 8.76 ✅  |
| ring-focus     | surface-raised      | 1.88 ⚠️  | 8.76 ✅  |

Disabled text (`text-disabled`) is WCAG-exempt and not tabled.

## Palette limitations worth naming

Two consequences of an 8-step, light-to-mid ramp. Both are recorded, not patched with
invented values.

**No dark chromatic tint.** There is no "danger surface for dark mode." So in dark, the
subtle brand surfaces (`accent-subtle`, `danger-subtle`) degrade to a neutral hover wash
(`neutral-600`); a ghost control's brand identity is then carried by its text and border,
not its fill.

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
