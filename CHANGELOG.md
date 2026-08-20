# @pmsg21/faster-ui

## 0.4.0

### Minor Changes

- 3a05b3a: Change the value of the `--color-accent-solid` from `var(--primary-600);` to `var(--primary-700);`

## 0.3.0

### Minor Changes

- 10830e7: Add `Dialog`, built on the native `<dialog>` element and `showModal()` — focus trapping,
  focus restoration, Escape, top-layer stacking and background inertness come from the
  platform rather than from a runtime dependency.

  One presentation axis (`size`, which changes the width only — 400/600/900), one semantic
  axis (`tone="warning"`, which renders `role="alertdialog"` and does not dismiss on a
  backdrop click), and a `dividers` boolean. Scrolling is not a prop: content that overflows
  scrolls, and the header and footer stay fixed.

  Three new tokens: `--color-scrim`, `--color-content-warning`, and `--color-line-overlay` —
  the last discharges the dark-mode elevation obligation, where nothing but a border
  separates a dialog from the page behind it.

  Also fixes tree-shaking for every component: `cva(…)` calls are now annotated
  `/* @__PURE__ */`, without which importing one component retained the class matrices of
  others. A `{ Button }`-only import drops from 9.63 kB to 9.49 kB brotli.

  **Browser support:** the package floor is **Chrome 105 / Safari 15.4 / Firefox 121**, set
  by `:has()` in `Input` — not by `Dialog`, whose `showModal()` requirement (Chrome 37 /
  Safari 15.4 / Firefox 98) is the least binding of the three. This release does not raise
  the floor; it is the first release to state it.

## 0.2.0

### Minor Changes

- 1722389: Remove the `--color-focus` token and re-point `--color-surface-muted`.

  **`--color-focus` (primary-500) is removed.** It was reserved for the decorative cyan
  halo the design draws under a focused field. `Input` does not ship that halo — a
  16%-alpha cyan glow beneath a neutral 2px focus ring is invisible in practice, and
  keeping the token would advertise a focus affordance nothing consumes. The cyan is still
  present on a focused field as `--color-line-focus` on the inner border, and
  `--color-focus-strong` remains the focus indicator of record. **If you reference
  `var(--color-focus)` directly, switch to `--color-line-focus`** for a brand-coloured
  border or `--color-focus-strong` for anything that has to satisfy WCAG SC 1.4.11 — the
  former measures 2.12:1 on white and cannot carry a focus indicator on its own.

  **`--color-surface-muted` moves from `neutral-200` to `neutral-50`.** `Input` is its
  first consumer, and the design draws a disabled field as a `neutral-50` fill inside a
  `neutral-200` border — which is `--color-line-disabled`, unchanged. Dark mode is
  unaffected.

- 1722389: Add `Input`, and fix tree-shaking across the whole library.

  **`Input`** ships three sizes, the five runtime states the Figma file draws (default,
  hover, focus, error, disabled), `startIcon` / `endIcon`, inline `prefix` / `suffix`,
  `hint`, `error`, and a `clearable` control.

  `size` is the only public axis. The design models 237 components across seven sets, but
  `State`, `Typing`, `Text Entered` and `State 2` are all runtime state — a design tool can
  only express those by drawing every combination, and mirroring them as props would ship a
  modelling artefact as public API.

  Accessibility is built in rather than documented:

  - **`label` is required.** A nameless field does not compile. `labelHidden` moves the
    label `sr-only` while keeping it in the accessibility tree; a placeholder is never a
    label.
  - **`aria-describedby` lists the hint before the error**, so the rule is announced before
    the breach, and `aria-invalid` follows the presence of `error`.
  - **The error region is always mounted** with `role="alert"` and only its content toggles,
    which is the reliable way to have it announced. It collapses to zero height while empty.
  - **`disabled` uses the native attribute**, unlike `Button`'s `aria-disabled`. Under
    `aria-disabled` an input's value still submits with the form, which is a data bug rather
    than an accessibility inconvenience.
  - **The clear control** takes a 24×24 target regardless of glyph size, sits after the field
    in tab order, names what it clears, and returns focus to the field on activation.

  **Tree-shaking now works.** Every component is annotated `/* @__PURE__ */ forwardRef(…)`.
  Without it, a call expression at module scope cannot be proven side-effect-free, so every
  component was retained in every import — `import { Button }` previously cost within 200
  bytes of the entire library. It is now 9.59 kB against a 10.49 kB full bundle. No API
  change; consumers who import a single component simply get a smaller bundle.

## 0.1.0

### Minor Changes

- 8337cf3: Add `Button` and `IconButton`, and ship a compiled stylesheet.

  `Button` has orthogonal `variant` (primary / outline / ghost / link) and `tone`
  (accent / danger) axes, three sizes, and loading and disabled states.
  `IconButton` composes it, requires `aria-label` at the type level, and adds a
  `shape` axis for the round and square forms the design documents.

  Accessibility is built into the components rather than left to the consumer:
  `type="button"` by default, `aria-disabled` instead of the native attribute so a
  disabled control stays reachable and announced, `aria-busy` with a text
  alternative while loading, a focus ring that meets SC 1.4.11, and touch targets
  that meet SC 2.5.8 at every size.

  **New requirement for consumers:** import the stylesheet.

  ```js
  import '@pmsg21/faster-ui/styles.css';
  ```

  It carries the tokens and the component classes, works with or without Tailwind,
  and deliberately contains no CSS reset. Dark mode remains one attribute on the
  root element.

  **Why this is a minor and not a major.** Three colour token groups were renamed —
  `text-*` → `content-*`, `border-*` → `line-*`, `ring-focus*` → `focus*` — because
  the old names produced stuttering utilities (`--color-text-primary` yields
  `text-text-primary`, and the documented `text-primary` never existed at all).
  Renaming a public token is normally breaking. It is not here: `0.0.1` shipped no
  components, and its `./styles.css` export was withdrawn precisely because the
  build emitted no CSS, so no consumer could have referenced a token by name. This
  is the first release in which the token layer is reachable, which is also the
  last moment these names can change for free.

## 0.0.1

### Patch Changes

- 52f0918: Initial published release of Faster UI, the PUMA design system foundation. No public components yet — this release establishes the package on npm and the automated release pipeline; `Button`, `Input`, and `Dialog` follow.
