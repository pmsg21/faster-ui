---
'@pmsg21/faster-ui': minor
---

Remove the `--color-focus` token and re-point `--color-surface-muted`.

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
