---
'@pmsg21/faster-ui': minor
---

Add `Input`, and fix tree-shaking across the whole library.

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
