import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/cn';
import { buttonVariants } from './buttonVariants';

type ButtonMatrix = VariantProps<typeof buttonVariants>;

export type ButtonVariant = NonNullable<ButtonMatrix['variant']>;
export type ButtonTone = NonNullable<ButtonMatrix['tone']>;
export type ButtonSize = NonNullable<ButtonMatrix['size']>;

export interface ButtonProps
  // `disabled` is omitted and redeclared: we accept the familiar prop name but
  // never forward it to the DOM (see below).
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Renders `aria-disabled`, not the native attribute. Stays focusable. */
  disabled?: boolean;
  /** Announces `aria-busy`, swaps the leading icon for a spinner, blocks activation. */
  loading?: boolean;
  /** Text alternative for the spinner. Announced; never painted. */
  loadingLabel?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

/** Decorative by definition — the label carries the meaning, so it is hidden. */
function ButtonIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" data-slot="icon" className="inline-flex shrink-0 [&>svg]:size-full">
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <span aria-hidden="true" data-slot="icon" className="inline-flex shrink-0">
      <svg viewBox="0 0 24 24" fill="none" className="size-full motion-safe:animate-spin">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/**
 * The system's button.
 *
 * Three accessibility decisions are built in rather than left to the consumer,
 * because a consumer who forgets one ships a broken control:
 *
 * 1. **`type="button"` by default.** A bare `<button>` inside a form submits it.
 *    That is the most common accidental-submit bug in component libraries, and
 *    the fix belongs in the component, not in its documentation.
 *
 * 2. **`aria-disabled`, never the native `disabled`.** The native attribute
 *    removes the control from the tab order, so a keyboard or screen-reader user
 *    never discovers the control exists or why it is unavailable. Here it stays
 *    focusable and announced, and activation is suppressed instead. The trade-off
 *    is real and taken deliberately: a focusable disabled control can be
 *    activated with no result. The APG permits both; we take discoverability
 *    over silence.
 *
 * 3. **Icons are hidden from the accessible name.** The component wraps them
 *    itself, so a decorative glyph cannot leak into the name by accident.
 *
 * The consumer supplies only what the component cannot know — the label.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    tone,
    size,
    disabled = false,
    loading = false,
    loadingLabel = 'Loading',
    startIcon,
    endIcon,
    type = 'button',
    className,
    children,
    onClick,
    ...rest
  },
  ref
) {
  const inactive = disabled || loading;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (inactive) {
      // preventDefault matters beyond skipping onClick: `aria-disabled` does not
      // stop a `type="submit"` button from submitting its form, and Enter/Space
      // arrive here as clicks too, so this is also the keyboard guard.
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-disabled={inactive || undefined}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, tone, size }), className)}
      onClick={handleClick}
    >
      {loading ? <Spinner /> : startIcon ? <ButtonIcon>{startIcon}</ButtonIcon> : null}
      {children}
      {endIcon ? <ButtonIcon>{endIcon}</ButtonIcon> : null}
      {loading ? <span className="sr-only">{loadingLabel}</span> : null}
    </button>
  );
});
