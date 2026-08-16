import { cva } from 'class-variance-authority';

/**
 * The shared class matrix for `Button` and `IconButton`.
 *
 * Two axes come from the Figma file and are deliberately kept ORTHOGONAL:
 * `variant` is emphasis (primary / outline / ghost / link) and `tone` is intent
 * (accent / danger). The file draws them as two parallel frames — `Button` and
 * `Danger Button`, each holding the same four variant sets — which reads as a
 * flat list only because a Figma variant property cannot span component sets.
 * Flattening them here would mean eight values today and sixteen the day a
 * `warning` tone arrives.
 *
 * The two axes are NOT independent, though, which is why the colours live in
 * `compoundVariants` rather than on `tone` alone: at rest the accent outline is
 * neutral (`line-subtle` border, `content-secondary` label) while the danger
 * outline is already coloured, and the accent ghost wash is neutral where the
 * danger one is tinted. Danger is not a hue swap of accent.
 *
 * Where the shipped colours differ from the file — no cyan on text, the label
 * pinned to `content-danger`, the underline on link — the reasoning and the
 * measured ratios are in docs/design-fidelity.md.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex cursor-pointer items-center justify-center gap-1',
    // box-border fixes nothing today — browsers already give form controls
    // border-box in their user-agent sheet. It is here because the published
    // stylesheet ships no reset, so without it the control would be *borrowing*
    // that guarantee from an environment we do not control. A consumer whose reset
    // says `* { box-sizing: content-box }` — plenty of older codebases do — would
    // silently break the min-width arithmetic taken from Figma (106/98/62 include
    // padding and border). One class, no behaviour change, one fewer assumption.
    'box-border',
    'font-sans whitespace-nowrap select-none',
    'transition-colors',
    // Focus is an ADDITION: the Figma file draws no focus state. It cannot be the
    // brand cyan, which measures 1.88–2.12 against the 3.0 SC 1.4.11 requires, so
    // the ring is neutral (>=15.79 on every surface a button sits on).
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-strong',
    // aria-disabled, never the native attribute — see Button.tsx. Pointer events
    // stay live so the cursor still communicates, and a wrapping tooltip can
    // still explain WHY the control is unavailable.
    'aria-disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        primary: 'border border-transparent font-medium',
        outline: 'border bg-surface-raised font-normal',
        ghost: 'border border-transparent bg-transparent font-normal',
        // Link has no box in the source: its frame height is just the line box.
        link: 'border-0 bg-transparent font-normal underline underline-offset-2',
      },
      tone: {
        accent: '',
        danger: '',
      },
      size: {
        // min-w comes from a named "Min Width" node in the source, so a row of
        // buttons lines up; it is a design decision, not a frame artefact.
        // Height is expressed as a minimum rather than the drawn fixed height so
        // a long label can wrap instead of overflowing.
        sm: 'min-h-6 min-w-[3.875rem] px-1 text-caption',
        md: 'min-h-9 min-w-[6.125rem] px-2 text-body',
        lg: 'min-h-10 min-w-[6.625rem] px-2 text-subtitle',
      },
      /**
       * Internal — never a public prop. What it distinguishes is the space the
       * control occupies: a box carrying a label, or a square holding one glyph.
       */
      footprint: {
        label: 'rounded-control',
        icon: 'p-0',
      },
      /**
       * PUBLIC on IconButton only. The design documents this in prose rather than
       * as a variant property — "Only the icon button can be set to a round
       * button" — which is why it is meaningless for a labelled button and is
       * applied through the compound entries below.
       */
      shape: {
        round: '',
        square: '',
      },
    },

    compoundVariants: [
      // ── Icon sizing, per size step (18 / 16 / 14 in the source) ────────────
      { size: 'sm', class: '[&_[data-slot=icon]]:size-3.5' },
      { size: 'md', class: '[&_[data-slot=icon]]:size-4' },
      { size: 'lg', class: '[&_[data-slot=icon]]:size-[1.125rem]' },

      // ── IconButton geometry: square footprint, no min-width, centred glyph ──
      { footprint: 'icon', size: 'sm', class: 'size-6 min-h-6 min-w-6' },
      { footprint: 'icon', size: 'md', class: 'size-9 min-h-9 min-w-9' },
      { footprint: 'icon', size: 'lg', class: 'size-10 min-h-10 min-w-10' },

      // ── The Fillet axis, icon footprint only ─────────────────────────────
      // Both radii already existed: `radius-full` for the circle the component
      // set draws by default, and `radius-control` — the exact radius Button
      // uses — for the square form the documentation describes.
      { footprint: 'icon', shape: 'round', class: 'rounded-full' },
      { footprint: 'icon', shape: 'square', class: 'rounded-control' },

      // ── Link geometry ────────────────────────────────────────────────────
      // A Figma frame height (18 / 22 / 24) is the text's bounding box, not a
      // target specification. Link has no background, so a 24px floor enlarges
      // the target without changing a visible pixel — SC 2.5.8 honoured, design
      // intent intact.
      { variant: 'link', class: 'min-h-6 min-w-0 px-0' },

      // ── Primary (solid fill) ─────────────────────────────────────────────
      // The label is `content-on-accent`, which maps to a near-black: white
      // fails AA on both ramps at every step (2.12 on cyan, 3.47 on red).
      {
        variant: 'primary',
        tone: 'accent',
        class: [
          'bg-accent-solid text-content-on-accent',
          'hover:bg-accent-solid-hover active:bg-accent-solid-active',
          'aria-disabled:bg-accent-solid-disabled aria-disabled:hover:bg-accent-solid-disabled',
        ],
      },
      {
        variant: 'primary',
        tone: 'danger',
        class: [
          'bg-danger-solid text-content-on-accent',
          'hover:bg-danger-solid-hover active:bg-danger-solid-active',
          'aria-disabled:bg-danger-solid-disabled aria-disabled:hover:bg-danger-solid-disabled',
        ],
      },

      // ── Outline ──────────────────────────────────────────────────────────
      // The accent border tracks the same ramp steps as the solid fill, so it
      // reuses those tokens rather than duplicating them as a parallel
      // `line-accent-*` set that would have to be kept in sync by hand — a
      // duplication the contrast contract could not police.
      // The label stays NEUTRAL and darkens on interaction: the source turns it
      // cyan (1.88 hover / 2.80 pressed), which no step of the ramp can fix.
      {
        variant: 'outline',
        tone: 'accent',
        class: [
          'border-line-subtle text-content-secondary',
          'hover:border-accent-solid-hover hover:text-content-primary',
          'active:border-accent-solid-active active:text-content-primary',
          'aria-disabled:border-line-disabled aria-disabled:text-content-disabled',
          'aria-disabled:hover:border-line-disabled aria-disabled:hover:text-content-disabled',
        ],
      },
      // Danger keeps its red — it is a warning, not brand decoration — pinned to
      // `content-danger` across the states so one already-accepted exemption
      // (4.21) covers it instead of three new ones.
      {
        variant: 'outline',
        tone: 'danger',
        class: [
          'border-danger-solid text-content-danger',
          'hover:border-danger-solid-hover active:border-danger-solid-active',
          'aria-disabled:border-line-disabled aria-disabled:text-content-disabled',
          'aria-disabled:hover:border-line-disabled',
        ],
      },

      // ── Ghost ────────────────────────────────────────────────────────────
      // The accent wash is NEUTRAL, not a brand tint — this is what proved
      // `accent-subtle` had no consumer and got it removed.
      {
        variant: 'ghost',
        tone: 'accent',
        class: [
          'text-content-secondary',
          'hover:bg-surface-hover hover:text-content-primary',
          'active:bg-surface-active active:text-content-primary',
          'aria-disabled:text-content-disabled aria-disabled:hover:bg-transparent',
          'aria-disabled:hover:text-content-disabled',
        ],
      },
      {
        variant: 'ghost',
        tone: 'danger',
        class: [
          'text-content-danger',
          'hover:bg-danger-subtle active:bg-danger-subtle-active',
          'aria-disabled:text-content-disabled aria-disabled:hover:bg-transparent',
          'aria-disabled:hover:text-content-disabled',
        ],
      },

      // ── Link ─────────────────────────────────────────────────────────────
      // Underlined in EVERY state, not just hover: the source distinguishes a
      // link by colour alone, which SC 1.4.1 does not allow, and a link that
      // only underlines on hover is still colour-only at rest.
      {
        variant: 'link',
        tone: 'accent',
        class: [
          'text-content-secondary',
          'hover:text-content-primary active:text-content-primary',
          'aria-disabled:text-content-disabled aria-disabled:hover:text-content-disabled',
        ],
      },
      {
        variant: 'link',
        tone: 'danger',
        class: [
          'text-content-danger',
          'aria-disabled:text-content-disabled aria-disabled:hover:text-content-disabled',
        ],
      },

      // ── Icon footprint: interaction differs from the labelled button ──────
      // These come last so they win the twMerge, and they exist because the icon
      // sets are NOT the labelled sets in a square box — extracting them showed a
      // different interaction model that we had been inheriting incorrectly:
      //
      //  - Outline's border stays `line-subtle` in EVERY state. It never turns
      //    cyan. Instead the fill washes exactly like ghost, so an icon outline
      //    button reads as a ghost button that happens to have a rim.
      //  - The glyph stays `content-secondary` throughout. The labelled button
      //    darkens its label on interaction, but that was OUR substitute for the
      //    design's cyan hue shift; the icon sets never had a hue shift to
      //    replace, and neutral-600 already clears AA on both washes (8.00 on
      //    surface-hover, 6.67 on surface-active). Restating the design here costs
      //    no contrast.
      {
        footprint: 'icon',
        variant: 'outline',
        class: [
          'hover:border-line-subtle hover:bg-surface-hover hover:text-content-secondary',
          'active:border-line-subtle active:bg-surface-active active:text-content-secondary',
        ],
      },
      {
        footprint: 'icon',
        variant: 'ghost',
        class: ['hover:text-content-secondary', 'active:text-content-secondary'],
      },
    ],

    defaultVariants: {
      variant: 'primary',
      tone: 'accent',
      size: 'md',
      footprint: 'label',
      // Round, because that is what the component set draws; square is the
      // documented alternative, not the base.
      shape: 'round',
    },
  }
);
