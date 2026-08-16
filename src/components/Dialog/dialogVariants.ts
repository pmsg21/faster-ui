import { cva } from 'class-variance-authority';

/**
 * ── WHY EVERY `cva(…)` BELOW IS ANNOTATED `/* @__PURE__ *\/` ────────────────
 *
 * Same defect as the one `docs/decisions.md` records for `forwardRef`, one layer down.
 * `cva(…)` is a call expression at module scope, a bundler cannot prove a call is
 * side-effect-free, so the binding is retained — and retaining it retains the whole
 * class matrix even for a consumer who never imports this component.
 *
 * Measured, not theorised. With Dialog added to the barrel and these calls unannotated,
 * a `import { Button }`-only bundle grew from 9.59 kB to 10.03 kB — 440 bytes of a
 * component the consumer never named. Annotating recovered it. The same was then true of
 * `buttonVariants` and `inputVariants`, which had been leaking quietly since they shipped:
 * annotating all three took a Button-only import to 9.49 kB and a Dialog-only one from
 * 10.58 to 9.98.
 *
 * The `size-limit` budget is the only reason any of this was visible, which is the
 * argument for writing budgets as hard thresholds rather than tracked figures.
 */

/**
 * The class matrix for `Dialog`.
 *
 * Like `Input` this is barely a matrix, but for the opposite reason. `Input` had one
 * public axis because four of its five Figma axes were runtime state. Dialog has three
 * pieces of geometry — `size`, `dividers`, and a warning glyph — because its four
 * top-level Figma frames are NOT four values of one axis:
 *
 *  - `Basic` is the base.
 *  - `Warning` is a semantic difference, not a visual one: the page prose calls it
 *    "an urgent interruption … users need to acknowledge it to close dialog box",
 *    which is `role="alertdialog"` plus a destructive action. It ships as `tone`.
 *  - `Scrollable` is RUNTIME. Its prose is conditional — 若对话框内容溢出 ("**if** the
 *    dialog content overflows") — so it is a max-height and `overflow-y: auto`, not a
 *    prop. Same finding as Input's `Text Entered` axis: a design tool can only draw
 *    runtime state by drawing every state of it.
 *  - `With divider` is an author's choice for content-heavy dialogs, and it is NOT
 *    additive — see `dialogSectionVariants` below.
 *
 * The file is split from `Dialog.tsx` for the same reason as `Input`'s: the component
 * body is focus resolution, event synchronisation and scroll locking, and interleaving
 * that with class strings makes both harder to read.
 *
 * Measurements are from the four `Space` sections (`13:11552`, `13:12039`, `13:12565`,
 * `13:13040`). The single most useful thing they say is negative: **`size` changes the
 * width and nothing else.** Padding, gaps, the 26px title row, the 36px footer, the
 * 98px buttons, the 14px close glyph and the 16px warning icon are identical at
 * Small, Medium and Large. A reader assuming `size` is a uniform scale would ship the
 * wrong padding at both ends.
 */

/**
 * The `<dialog>` itself, which is deliberately NOT the visible card.
 *
 * It is a transparent, full-viewport shell, and the scrim is a real element inside it.
 * The obvious alternative — `::backdrop` with `bg-scrim` — is unusable: `::backdrop`
 * only began inheriting from its originating element in Chrome 122 / Firefox 120 /
 * Safari 17.4, while `showModal()` has worked since Safari 15.4 and Firefox 98. In that
 * two-year window a custom property is invisible to `::backdrop`, so
 * `background-color: var(--color-scrim)` is invalid at computed-value time and falls
 * back to `transparent` — a modal with no scrim at all, on browsers that otherwise
 * support it perfectly. See docs/decisions.md.
 *
 * `backdrop:bg-transparent` is the one ::backdrop rule left, and it compiles to a
 * literal rather than a `var()`, so it is safe everywhere `<dialog>` exists.
 */
export const dialogShellVariants = /* @__PURE__ */ cva([
  // The UA sheet gives a modal dialog `position: fixed`, `margin: auto` and a
  // max-width/height box. All of it is replaced, because the shell is now a viewport
  // cover rather than the thing the user sees.
  'fixed inset-0 m-0 size-full max-h-none max-w-none',
  'overflow-hidden border-0 bg-transparent p-0',
  'backdrop:bg-transparent',
]);

/**
 * The scrim — a real element, so it takes an ordinary token utility and an ordinary
 * click handler.
 *
 * Being an element rather than a pseudo also removes a measurement problem before it
 * exists: `getComputedStyle` on a pseudo-element is the instrument that already
 * misreported `::placeholder` for `Input` (see CLAUDE.md known-gaps), and a component
 * test can read this node directly.
 *
 * `p-4` is ours, not the design's. Figma draws each dialog on a fixed 700/1000px canvas
 * with no viewport to run out of; a 900px card on a 375px phone needs a gutter, and the
 * card's `w-full` below lets it shrink into one.
 */
export const dialogScrimVariants = /* @__PURE__ */ cva([
  'absolute inset-0 flex items-center justify-center p-4',
  'bg-scrim',
]);

/**
 * The visible card.
 *
 * `border-line-overlay` is load-bearing rather than decorative, and only in dark. In
 * light it resolves to white on a white card — invisible, exactly as Figma draws, with
 * separation carried by the scrim and `elevation-4`. In dark, `surface-base`,
 * `surface-raised` and `surface-overlay` all resolve to `#1F1F1F` and `elevation-4` over
 * that measures 1.045:1, so this border is the only thing separating the dialog from the
 * page. `line-subtle` would measure 1.89 there and fail SC 1.4.11; `line-overlay` is
 * neutral-500 at 5.03. The contrast contract pins both numbers.
 *
 * `max-h-full` (inside the scrim's `p-4`) rather than the drawn fixed height: the
 * Scrollable prose makes overflow the trigger, so short content hugs and long content
 * scrolls. `min-h-0` on the body below is what actually permits the scroll — a flex
 * child's default `min-height: auto` refuses to shrink below its content, which is the
 * classic reason an `overflow-y: auto` region silently never scrolls.
 */
export const dialogCardVariants = /* @__PURE__ */ cva(
  [
    'relative flex w-full flex-col',
    'max-h-full overflow-hidden',
    'rounded-control border border-line-overlay bg-surface-overlay shadow-elevation-4',
    'box-border font-sans text-left',
  ],
  {
    variants: {
      // The ONLY thing `size` changes. These are Tailwind's spacing scale (n x 0.25rem),
      // which states the drawn pixels less legibly than an arbitrary value would — so
      // the Figma numbers are written here, and `Dialog.cy.tsx` asserts the computed
      // width against them rather than against the class name.
      size: {
        sm: 'max-w-100', // 25rem   = 400px
        md: 'max-w-150', // 37.5rem = 600px
        lg: 'max-w-225', // 56.25rem = 900px
      },
    },
    defaultVariants: { size: 'md' },
  }
);

/**
 * Header, body and footer padding — one variant, because `dividers` RE-SPACES the
 * dialog rather than adding two rules to it.
 *
 * Basic runs 24 / 16 / 32 / 24 down the card; With divider runs a uniform 16 with the
 * rules full-bleed. That is why this is a real `cva` variant and not an `after:`
 * pseudo-element bolted onto the base: an `after:` rule could draw the lines but could
 * not move the padding, and the two would drift apart the first time either changed.
 *
 * Horizontal padding is 24 in both, at every size.
 */
export const dialogSectionVariants = /* @__PURE__ */ cva(['px-6'], {
  variants: {
    section: {
      header: 'flex shrink-0 items-start justify-between gap-2',
      // `min-h-0` is what lets this shrink inside the flex column and therefore scroll.
      body: 'min-h-0 flex-1 overflow-y-auto text-body text-content-secondary',
      // 8px between the actions, right-aligned; both are `Button size="md"`, whose
      // 98x36 minimum already matches the drawn Button Grid exactly.
      footer: 'flex shrink-0 flex-wrap items-center justify-end gap-2',
    },
    dividers: { true: '', false: '' },
  },
  compoundVariants: [
    // ── Basic rhythm: 24 top / 16 to body / 32 to footer / 24 bottom ──────────
    { section: 'header', dividers: false, class: 'pt-6 pb-4' },
    { section: 'body', dividers: false, class: '' },
    { section: 'footer', dividers: false, class: 'pt-8 pb-6' },

    // ── With divider: a uniform 16, rules edge to edge ────────────────────────
    // `line-subtle` (neutral-300) where Figma draws neutral-200. The system has no
    // neutral-200 border token that means "divider" — `line-disabled` is neutral-200
    // but means something else — and re-pointing a shared token for one consumer is
    // how a semantic layer stops being semantic (docs/tokens.md). One ramp step
    // darker is also strictly more visible, so nothing is lost.
    { section: 'header', dividers: true, class: 'border-b border-line-subtle py-4' },
    { section: 'body', dividers: true, class: 'py-4' },
    { section: 'footer', dividers: true, class: 'border-t border-line-subtle py-4' },
  ],
  defaultVariants: { section: 'body', dividers: false },
});

/** Title — Medium/Title 18/26, `Neutral/700`. */
export const dialogTitleVariants = /* @__PURE__ */ cva(['m-0 text-title text-content-primary']);

/**
 * The close control.
 *
 * The glyph is the drawn 14px, but the TARGET is floored at 24x24 for SC 2.5.8 — the
 * same decision `Button`'s link height and `Input`'s clear control already took, and for
 * the same reason: a Figma frame reports the size of the artwork, not a specification of
 * how big the thing you press should be. `-mr-1` pulls the enlarged box back so the
 * glyph still sits on the drawn 24px margin instead of the padding shifting it inwards.
 */
export const dialogCloseVariants = /* @__PURE__ */ cva([
  'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center',
  '-mr-1 rounded-control',
  'text-content-secondary hover:text-content-primary',
  'transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-strong',
  '[&>svg]:size-3.5',
]);

/**
 * The Warning glyph — 16x16, 8px from the text, `Warning/600`.
 *
 * It measures 1.87 on the dialog surface and no step of the warning ramp clears 3:1
 * (700 reaches only 2.12). That is accepted rather than fixed because the graphic is
 * DECORATIVE: SC 1.4.11 governs graphics required to understand the content, and the
 * meaning here is carried by the body text, the destructive action and
 * `role="alertdialog"`. The `aria-hidden` in `Dialog.tsx` is therefore the argument, not
 * an implementation detail, and it is asserted in `Dialog.test.tsx`.
 */
export const dialogWarningIconVariants = /* @__PURE__ */ cva([
  'mt-[0.1875rem] inline-flex size-4 shrink-0 text-content-warning [&>svg]:size-full',
]);
