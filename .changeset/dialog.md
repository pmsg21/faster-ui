---
'@pmsg21/faster-ui': minor
---

Add `Dialog`, built on the native `<dialog>` element and `showModal()` — focus trapping,
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

**Browser support note:** `Dialog` requires `<dialog>` + `showModal()` — Safari 15.4 and
Firefox 98 (both March 2022). No other component in the package has a floor.
