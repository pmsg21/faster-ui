import { forwardRef } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Button } from '../Button/Button';
import type { ButtonProps } from '../Button/Button';
import { buttonVariants } from '../Button/buttonVariants';

/** No `link` — the Figma IconButton set has three variants, not four. */
export type IconButtonVariant = 'primary' | 'outline' | 'ghost';

/**
 * Round or square corners. The design carries this as prose and an instance
 * override rather than a variant property, and scopes it explicitly: "Only the
 * icon button can be set to a round button." So it lives here and not on `Button`.
 */
export type IconButtonShape = 'round' | 'square';

export interface IconButtonProps
  extends Omit<ButtonProps, 'variant' | 'tone' | 'startIcon' | 'endIcon' | 'children'> {
  variant?: IconButtonVariant;
  /** Corner treatment. Defaults to `round`, which is what the component set draws. */
  shape?: IconButtonShape;
  /** The glyph. Hidden from the accessible name — `aria-label` carries it. */
  icon: ReactNode;
  /**
   * REQUIRED. An icon-only control has no visible text, so without this it has no
   * accessible name at all. Making it required at the type level means a nameless
   * icon button does not compile — the same principle as primitives living outside
   * `@theme`: make incorrect use impossible rather than documenting that it is wrong.
   */
  'aria-label': string;
}

/**
 * A square, icon-only button.
 *
 * It **composes `Button`** rather than reimplementing it, so every behaviour that
 * must not drift between the two — `aria-disabled` handling, suppressed
 * activation, `type="button"`, loading, focus — is shared by construction rather
 * than by discipline. The glyph goes through `Button`'s own `startIcon` slot, so
 * it is wrapped and hidden from the accessible name by the same code path.
 *
 * The only difference is geometry, and that comes from the *same* `cva` via its
 * internal `shape` axis: the square classes are appended after `Button`'s own, and
 * `cn()`/`twMerge` resolves the overlap (radius, padding, min-width). No second
 * style map to keep in sync.
 *
 * What it does **not** share is the interaction model of `outline`. The icon sets
 * keep a neutral `line-subtle` rim in every state and wash the fill like a ghost
 * button, where the labelled `outline` turns its border cyan and leaves the fill
 * alone. That is a genuine difference in the source, not an oversight, and it was
 * inherited wrongly at first — see `buttonVariants.ts`.
 *
 * There is deliberately **no `tone`**: the Figma file has no danger IconButton,
 * and "someone will want it" is not evidence (see docs/decisions.md). The tokens
 * already exist, so adding it later breaks nobody.
 *
 * Note on `sm`: at 24×24 it sits exactly on the SC 2.5.8 floor with no margin, so
 * it is for pointer-dense UI (toolbars, table rows); `md`/`lg` are the touch
 * defaults. The floor is asserted in IconButton.cy.tsx, not merely documented.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'primary', size = 'md', shape = 'round', icon, className, ...rest },
  ref
) {
  return (
    <Button
      {...rest}
      ref={ref}
      variant={variant}
      size={size}
      startIcon={icon}
      className={cn(buttonVariants({ variant, size, shape, footprint: 'icon' }), className)}
    />
  );
});
