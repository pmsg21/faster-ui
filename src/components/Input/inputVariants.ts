import { cva } from 'class-variance-authority';

/**
 * The class matrix for `Input`.
 *
 * Unlike `buttonVariants` this is not really a matrix: `Input` has ONE public axis
 * (`size`) and no `variant`/`tone`, because the Figma file has none. What looks like
 * a five-axis component set — `Size`, `State`, `Typing`, `Text Entered`, `State 2`
 * across 237 components — is one axis plus four kinds of runtime state that a design
 * tool can only express by drawing every combination:
 *
 *  - `State` (Default / Hover / Pressed & Focus / Error / Disabled) is `:hover`,
 *    `:focus-visible`, the `error` prop and the `disabled` attribute.
 *  - `Text Entered` is whether the field has a value.
 *  - `Typing` is a focused field with a caret, which is when the clear button appears.
 *  - `State 2` (Clear Hover / Clear Pressed) is that button's own interaction state.
 *
 * Turning any of those into props would mirror a modelling artefact, so none of them
 * are here. See docs/decisions.md.
 *
 * The file is split from `Input.tsx` for the second of the two reasons in
 * docs/patterns.md: nothing composes it, but the component's own body is `useId`
 * wiring, `aria-describedby` assembly and focus management, and interleaving that
 * with class strings makes both harder to read.
 *
 * Every `cva(…)` below is annotated `/* @__PURE__ *\/` for the same reason the component
 * carries one: a call expression at module scope cannot be proven side-effect-free, so it
 * is retained along with everything it references. These seven had been leaking since
 * Input shipped; the defect was found by the size-limit budget while adding Dialog, and
 * the measurements are in dialogVariants.ts.
 */

/** Shared by every size step. Values transcribed from the `space` section (11:8099). */
const SIZE_STEPS = {
  sm: {
    // 24px tall, 8px padding, 4px gap, Caption 12/18 — the only step whose help text
    // does NOT match its field text (lg and md are both Body 14/22).
    field: 'min-h-6 gap-1 px-2 text-caption',
    icon: 'size-3.5', // 14px
    text: 'text-caption',
  },
  md: {
    field: 'min-h-9 gap-2 px-3 text-body',
    icon: 'size-4', // 16px
    text: 'text-body',
  },
  lg: {
    field: 'min-h-10 gap-2 px-3 text-subtitle',
    icon: 'size-[1.125rem]', // 18px
    text: 'text-body', // NOT text-subtitle — help text is Body at lg (11:7960)
  },
} as const;

/**
 * The bordered box. This is the element that carries every visual state, because the
 * `<input>` inside it is deliberately unstyled — a border on the control itself cannot
 * enclose the affixes and icons that sit beside it.
 *
 * State is driven by `data-*` rather than by relying on variant ordering. `hover:` and
 * `has-[…]:` have equal CSS specificity, so which one wins would come down to the order
 * Tailwind happens to emit them in; re-declaring `hover` inside each state attribute
 * makes the precedence explicit instead of emergent.
 */
export const inputVariants = /* @__PURE__ */ cva(
  [
    // `group` so the affixes and icons can read this box's disabled state; they cannot
    // use `peer-*` because a prefix sits BEFORE the input in the DOM.
    'group flex w-full items-center',
    'rounded-control border bg-surface-raised',
    // Same reasoning as Button: the published stylesheet ships no preflight, so the
    // component sets what it depends on rather than borrowing it from a user-agent
    // sheet we do not control.
    'box-border',
    'transition-colors',

    // ── Resting ──────────────────────────────────────────────────────────────
    'border-line-subtle',

    // ── Hover ────────────────────────────────────────────────────────────────
    // primary-500, exactly as drawn. Reuses the accent ramp rather than minting a
    // parallel `line-accent-hover`, the same choice Button's outline made.
    'hover:border-accent-solid-hover',

    // ── Focus ────────────────────────────────────────────────────────────────
    // Two things at once, and both are load-bearing:
    //   1. `line-focus` (cyan) on the border — what the design draws.
    //   2. `focus-strong` (neutral) as an offset outline — what actually satisfies
    //      SC 1.4.11. Cyan measures 2.12:1 on white against a 3.0 bar, so it cannot
    //      be the indicator of record. The design's other focus affordance, a
    //      16%-alpha cyan halo, is not shipped: it is invisible next to this ring.
    // Keyed on `input:focus-visible` specifically, NOT bare `:focus-visible` — the
    // clear button lives inside this box and carries its own ring, and without the
    // element qualifier focusing it would light up both.
    'has-[input:focus-visible]:border-line-focus',
    'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2',
    'has-[input:focus-visible]:outline-focus-strong',

    // ── Invalid ──────────────────────────────────────────────────────────────
    // Wins over hover and focus. An error outranks a transient pointer state, and
    // `line-danger` is the one field border that clears 3:1 unaided (3.47 light /
    // 5.53 dark), so an invalid field IS identifiable by its border. A resting one
    // is not — which is why the visible label is required rather than encouraged.
    'data-[invalid=true]:border-line-danger',
    'data-[invalid=true]:hover:border-line-danger',
    'data-[invalid=true]:has-[input:focus-visible]:border-line-danger',

    // ── Disabled ─────────────────────────────────────────────────────────────
    // neutral-50 fill inside a neutral-200 border, as drawn. `surface-muted` was
    // re-pointed 200 → 50 for this; `line-disabled` already matched.
    'data-[disabled=true]:border-line-disabled data-[disabled=true]:bg-surface-muted',
    'data-[disabled=true]:hover:border-line-disabled',
    'data-[disabled=true]:cursor-not-allowed',
  ],
  {
    variants: {
      size: {
        sm: SIZE_STEPS.sm.field,
        md: SIZE_STEPS.md.field,
        lg: SIZE_STEPS.lg.field,
      },
    },
    defaultVariants: { size: 'md' },
  }
);

/**
 * The `<input>` itself — visually inert, so the box above can own every state.
 *
 * `[font:inherit]` is doing real work rather than tidying up. Form controls do not
 * inherit typography; a browser's user-agent sheet gives them their own font stack and
 * size. Preflight normally resets that, and we deliberately ship without preflight, so
 * without this one declaration the field would render in the UA's font at the UA's size
 * while the affixes beside it rendered in ours.
 */
export const inputControlVariants = /* @__PURE__ */ cva([
  'min-w-0 flex-1',
  '[font:inherit]',
  'border-0 bg-transparent p-0 outline-none',
  'text-content-primary',
  // Placeholder is one ramp step lighter than the value, never lighter than AA allows.
  // The design draws neutral-400 (1.64:1 — unreadable); both are shifted one step so the
  // empty/filled distinction survives at 8.72 and 16.48. See docs/design-fidelity.md.
  'placeholder:text-content-secondary',
  'disabled:cursor-not-allowed disabled:text-content-disabled',
  'disabled:placeholder:text-content-disabled',
]);

/**
 * The label. Always rendered, never omitted — `labelHidden` moves it out of sight but
 * leaves it in the accessibility tree, because the legitimate case (a toolbar search
 * whose purpose is obvious from context) still needs a programmatic name.
 */
export const inputLabelVariants = /* @__PURE__ */ cva(
  ['font-sans font-medium text-content-primary'],
  {
    variants: {
      size: { sm: SIZE_STEPS.sm.text, md: SIZE_STEPS.md.text, lg: SIZE_STEPS.lg.text },
      hidden: { true: 'sr-only', false: '' },
    },
    defaultVariants: { size: 'md', hidden: false },
  }
);

/**
 * Hint and error, 4px below the field (the yellow `4px` callout in `space`, which
 * measures field-bottom to help-text-top at every size).
 *
 * `empty:mt-0` matters more than it looks. The error node is always mounted so its
 * `role="alert"` announces content changes reliably, and an always-mounted node inside
 * a `gap`-spaced column would add 4px to every error-free field. A block element with
 * no content generates no line box, so with the margin suppressed it occupies nothing —
 * present in the accessibility tree, absent from the layout.
 */
export const inputMessageVariants = /* @__PURE__ */ cva(['mt-1 font-sans empty:mt-0'], {
  variants: {
    size: { sm: SIZE_STEPS.sm.text, md: SIZE_STEPS.md.text, lg: SIZE_STEPS.lg.text },
    tone: {
      hint: 'text-content-secondary',
      error: 'text-content-danger',
    },
  },
  defaultVariants: { size: 'md', tone: 'hint' },
});

/**
 * Prefix / suffix — the INLINE treatment (`Prefix & Suffix`, 11:10328), not the filled
 * addon segment the standalone `Prefix`/`Suffix` sets draw. Those are a different
 * component; see docs/decisions.md.
 *
 * The design colours these neutral-500, which measures 3.28:1 on white. That is the same
 * failure `content-secondary` was already remapped 500 → 600 to fix, so this reuses an
 * existing decision rather than adding a divergence row.
 */
export const inputAffixVariants = /* @__PURE__ */ cva([
  'shrink-0 select-none text-content-secondary',
  // Driven from the field's `group`, not `peer-disabled`. A prefix precedes the input
  // in the DOM and CSS sibling combinators only look forward, so `peer-*` would style
  // the suffix and silently skip the prefix.
  'group-data-[disabled=true]:text-content-disabled',
]);

/** Decorative glyphs. Hidden from the accessible name — the label carries it. */
export const inputIconVariants = /* @__PURE__ */ cva(
  [
    'inline-flex shrink-0 text-content-secondary [&>svg]:size-full',
    'group-data-[disabled=true]:text-content-disabled',
  ],
  {
    variants: {
      size: { sm: SIZE_STEPS.sm.icon, md: SIZE_STEPS.md.icon, lg: SIZE_STEPS.lg.icon },
    },
    defaultVariants: { size: 'md' },
  }
);

/**
 * The clear button. A real control nested inside another control, which is the only
 * instance of that shape in this library.
 *
 * The glyph follows the drawn 16/14/12, but the TARGET is floored at 24×24 for SC 2.5.8
 * — at `sm` that means the button is as tall as the field itself, which is correct
 * rather than an accident: a 12px hit area would fail the criterion outright.
 */
export const inputClearVariants = /* @__PURE__ */ cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center justify-center',
    'size-6 rounded-control', // 24px target floor, at every size
    'text-content-secondary hover:text-content-primary',
    'transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-strong',
  ],
  {
    variants: {
      // Written out rather than interpolated from SIZE_STEPS. Tailwind v4 scans source
      // files for LITERAL class strings, so `[&>svg]:${step.clear}` would compile, pass
      // review, and render an unsized glyph — the utility never gets generated because
      // the scanner never sees it spelled out.
      size: {
        sm: '[&>svg]:size-3', // 12px
        md: '[&>svg]:size-3.5', // 14px
        lg: '[&>svg]:size-4', // 16px
      },
    },
    defaultVariants: { size: 'md' },
  }
);
