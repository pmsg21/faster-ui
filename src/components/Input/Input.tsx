import { forwardRef, useCallback, useId, useRef, useState } from 'react';
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/cn';
import {
  inputAffixVariants,
  inputClearVariants,
  inputControlVariants,
  inputIconVariants,
  inputLabelVariants,
  inputMessageVariants,
  inputVariants,
} from './inputVariants';

type InputMatrix = VariantProps<typeof inputVariants>;

export type InputSize = NonNullable<InputMatrix['size']>;

export interface InputProps
  // Two omissions, both collisions rather than choices:
  //
  //  - `size` on an `<input>` is a NATIVE attribute meaning "width in characters".
  //    Ours is the design system's sm/md/lg step.
  //  - `prefix` is on React's `HTMLAttributes` for every element — it is an RDFa
  //    attribute, and nothing about the name suggests it is already taken.
  //
  // Neither surfaces until the type error does, which is why docs/patterns.md now
  // carries the rule: redeclaring a prop means checking what it shadows.
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  /**
   * The visible label. **Required**, and deliberately not optional.
   *
   * An input with no programmatic label is the single most common form accessibility
   * failure, and every library that makes the label optional ships consumers who omit
   * it. Typing it as a required `string` means a nameless field does not compile —
   * the same guardrail as `IconButton`'s required `aria-label`.
   *
   * A **placeholder is not a label.** It disappears the moment the user types, which
   * fails SC 3.3.2, and it is the substitution people reach for when a label feels
   * inconvenient. Use `labelHidden` if the label must not be seen.
   */
  label: string;
  /**
   * Hides the label visually while keeping it in the accessibility tree.
   *
   * For fields whose purpose is already obvious from context — a toolbar search, a
   * filter row above a table. Not a way to keep a layout tidy: a visible label is the
   * only version that also works for voice-control users, who speak what they see, and
   * for readers who need the name present *while* typing rather than only before.
   */
  labelHidden?: boolean;
  size?: InputSize;
  /** Guidance shown below the field. Announced before `error`, so the rule precedes the breach. */
  hint?: ReactNode;
  /** Error message. Its presence alone sets `aria-invalid` and the danger border. */
  error?: ReactNode;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  /** Inline affix before the value — a unit or symbol (`¥`), not a filled addon segment. */
  prefix?: ReactNode;
  /** Inline affix after the value (`CNY`). */
  suffix?: ReactNode;
  /** Shows a clear control while the field holds a value. */
  clearable?: boolean;
  /** Called when the clear control is activated. Required for a controlled field to empty. */
  onClear?: () => void;
  /**
   * Accessible name for the clear control. Name *what* is being cleared where you can:
   * "Clear" alone tells a screen-reader user nothing in a form of six fields.
   * Defaults to `Clear ${label}`.
   */
  clearLabel?: string;
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.25" />
      <path
        d="M5.5 5.5l5 5m0-5l-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The system's text field.
 *
 * **One public axis.** The Figma page is 237 components across seven sets, but only
 * `Size` is a prop: `State`, `Typing`, `Text Entered` and `State 2` are all runtime,
 * and a design tool can only express runtime state by drawing every combination of it.
 * See docs/decisions.md.
 *
 * **Disabled uses the native attribute**, which is a deliberate departure from
 * `Button`'s `aria-disabled`. Two reasons, and the first is decisive: under
 * `aria-disabled` the value still submits with the form, which is a data bug rather
 * than an accessibility inconvenience. And the argument that motivated `aria-disabled`
 * on `Button` — that a disabled control leaving the tab order is a control nobody
 * discovers — does not hold here, because a field always has a visible label, so it is
 * discoverable by traversing the form and announces as unavailable when reached. A
 * design system that applies one solution everywhere regardless of context is applying
 * a habit, not a principle.
 *
 * **Description order is hint, then error.** A user hears the rule and then how they
 * broke it, which is the useful order; reversed, the correction arrives before the
 * thing it corrects.
 *
 * **The error region is always mounted** with `role="alert"`, and only its content
 * toggles. Screen readers announce a live region's *content changes* reliably; whether
 * they announce a region that appears already-populated varies by product and version,
 * so mounting it up front removes the variance rather than betting on it. It collapses
 * to zero height while empty (`empty:mt-0` on a block with no line box), so an
 * error-free field is not paying for the space.
 */
export const Input = /* @__PURE__ */ forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    labelHidden = false,
    size = 'md',
    hint,
    error,
    startIcon,
    endIcon,
    prefix,
    suffix,
    clearable = false,
    onClear,
    clearLabel,
    disabled = false,
    className,
    id,
    value,
    defaultValue,
    onChange,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const invalid = Boolean(error);

  // The clear control has to know whether there is anything to clear. A controlled
  // field answers that from its prop; an uncontrolled one only from what the user has
  // typed, so that case is tracked here rather than guessed at.
  const isControlled = value !== undefined;
  const [uncontrolledHasValue, setUncontrolledHasValue] = useState(
    () => String(defaultValue ?? '').length > 0
  );
  const hasValue = isControlled ? String(value).length > 0 : uncontrolledHasValue;
  const showClear = clearable && !disabled && hasValue;

  // A local handle is needed for focus restoration after clearing, and the consumer's
  // ref still has to work, so both are set from one callback.
  const controlRef = useRef<HTMLInputElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      controlRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!isControlled) setUncontrolledHasValue(event.target.value.length > 0);
    onChange?.(event);
  }

  function handleClear() {
    // An uncontrolled field has no prop to re-render from, so the DOM value is the
    // state and the component owns emptying it. A controlled one must not be touched
    // this way — the consumer's `onClear` is what moves it.
    if (!isControlled && controlRef.current) {
      controlRef.current.value = '';
      setUncontrolledHasValue(false);
    }
    onClear?.();

    // Focus is moved back deliberately. The control unmounts the instant the value
    // empties, and focus on a removed element falls to <body> — leaving the user
    // stranded mid-form with no way back except Tab from the top.
    controlRef.current?.focus();
  }

  // Assembled in announcement order, and omitted entirely when there is nothing to
  // describe: an empty string is still a valid attribute pointing at nothing.
  const describedBy = [hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('flex w-full flex-col font-sans', className)}>
      <label
        htmlFor={inputId}
        className={cn(inputLabelVariants({ size, hidden: labelHidden }), 'mb-1')}
      >
        {label}
      </label>

      <div
        className={inputVariants({ size })}
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        data-slot="field"
      >
        {prefix ? <span className={inputAffixVariants()}>{prefix}</span> : null}
        {startIcon ? (
          <span aria-hidden="true" data-slot="icon" className={inputIconVariants({ size })}>
            {startIcon}
          </span>
        ) : null}

        <input
          {...rest}
          ref={setRefs}
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy || undefined}
          className={inputControlVariants()}
          onChange={handleChange}
        />

        {/*
          After the input in the DOM, and before `endIcon` — which is the order the
          design draws (clear at right-38px, trailing icon at right-12px). It also
          means Tab reaches the field first and the clear second, so a keyboard user
          types and then clears without traversing backwards.
        */}
        {showClear ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label={clearLabel ?? `Clear ${label}`}
            className={inputClearVariants({ size })}
            data-slot="clear"
          >
            <ClearIcon />
          </button>
        ) : null}

        {endIcon ? (
          <span aria-hidden="true" data-slot="icon" className={inputIconVariants({ size })}>
            {endIcon}
          </span>
        ) : null}
        {suffix ? <span className={inputAffixVariants()}>{suffix}</span> : null}
      </div>

      {hint ? (
        <p id={hintId} className={inputMessageVariants({ size, tone: 'hint' })}>
          {hint}
        </p>
      ) : null}

      <p id={errorId} role="alert" className={inputMessageVariants({ size, tone: 'error' })}>
        {error}
      </p>
    </div>
  );
});
