import { forwardRef, useCallback, useEffect, useId, useRef } from 'react';
import type { MouseEvent, ReactNode, RefObject, SyntheticEvent } from 'react';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/cn';
import {
  dialogCardVariants,
  dialogCloseVariants,
  dialogScrimVariants,
  dialogSectionVariants,
  dialogShellVariants,
  dialogTitleVariants,
  dialogWarningIconVariants,
} from './dialogVariants';

type DialogMatrix = VariantProps<typeof dialogCardVariants>;

export type DialogSize = NonNullable<DialogMatrix['size']>;
export type DialogTone = 'default' | 'warning';

export interface DialogProps {
  /**
   * Whether the dialog is showing. **Controlled only** — there is deliberately no
   * `defaultOpen`.
   *
   * A modal's open state is owned by the application: a route, a mutation result, a
   * confirmation flow. An uncontrolled dialog needs a trigger to own, which forces a
   * compound `Dialog.Trigger` API, and the Figma page draws no trigger anywhere. A
   * `defaultOpen` dialog is also a strange object — open on mount, and impossible for
   * the consumer to reopen.
   */
  open: boolean;
  /**
   * Called with `false` when the dialog asks to close — Escape, the close control, or a
   * click on the scrim.
   *
   * It is a *request*, not a notification: nothing closes until `open` changes. That is
   * what makes "are you sure?" possible without the component inventing an API for it.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * The visible title, and the accessible name via `aria-labelledby`. **Required.**
   *
   * Typed as a required `string` so a nameless dialog does not compile — the same
   * guardrail as `Input`'s `label` and `IconButton`'s `aria-label`. It is wired by id
   * rather than duplicated into an `aria-label`, so a screen-reader user and a sighted
   * user are given the same words and they cannot drift apart.
   */
  title: string;
  /** 400 / 600 / 900px. Changes the WIDTH only — every other measure is size-invariant. */
  size?: DialogSize;
  /**
   * `warning` renders the amber glyph and switches the role to `alertdialog`.
   *
   * The two travel together because the design ships them together, and the page prose
   * is what makes it a semantic difference rather than a colour: "Warning dialog is an
   * urgent interruption that informs users about a situation, and users need to
   * acknowledge it to close dialog box." Acknowledgement is also why
   * `closeOnBackdropClick` defaults to `false` for this tone.
   */
  tone?: DialogTone;
  /** Rules above the footer and below the header. Re-spaces the dialog — see dialogVariants.ts. */
  dividers?: boolean;
  /**
   * The actions. The component owns the LAYOUT — right-aligned, 8px apart, which every
   * one of the twelve Figma components draws identically — and the consumer owns the
   * content, because the labels are not a specification: the file uses Cancel/Confirm,
   * Cancel/Delete, Disagree/Agree and Cancel/Save.
   *
   * Owning the actions instead (`confirmLabel`, `onConfirm`, …) would mean
   * re-implementing `Button` as props — loading, disabled, icons, tone — which is the
   * `IconButton`-not-`iconOnly` argument in reverse.
   */
  footer?: ReactNode;
  /** The body. Also the `aria-describedby` target. */
  children?: ReactNode;
  /** Accessible name for the close control. Name *what* closes where you can. */
  closeLabel?: string;
  /**
   * Whether clicking the scrim closes. Defaults to `true`, and to **`false`** when
   * `tone="warning"`, because that variant's whole point is that it is acknowledged
   * rather than dismissed.
   */
  closeOnBackdropClick?: boolean;
  /**
   * Where focus should land on open. Defaults to the first focusable element that is
   * *not* the close control — see the note on `Dialog` below.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Merged onto the card, not the shell — the card is the thing a consumer means. */
  className?: string;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
      <path d="M3 3l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5v4M8 11.2v.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Elements that can receive focus. `aria-disabled` is deliberately NOT excluded: this
 * system's `Button` disables with `aria-disabled` precisely so the control stays
 * reachable and announces itself, and skipping it here would undo that.
 */
// Written as one literal rather than an array `.join(',')`, which reads better but is a
// CALL EXPRESSION AT MODULE SCOPE — the exact construct that broke tree-shaking across
// this library once already (docs/decisions.md). A bundler cannot prove `.join` is
// side-effect-free, so the constant is retained, and retaining it retains what it is
// reachable from. Measured: the array form cost a Button-only import 440 bytes of Dialog.
const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Page scroll lock, ref-counted so nested dialogs do not release it early.
 *
 * `showModal()` makes the page inert but NOT unscrollable — the wheel still moves it
 * behind the scrim. Locking with `overflow: hidden` removes the scrollbar, and removing
 * a scrollbar reflows the page by its width, so the gutter is paid back as padding.
 * Measured, not assumed: probing a scrolled page put `window.innerWidth` at 1350 and
 * `documentElement.clientWidth` at 1335.
 */
let scrollLockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

function lockPageScroll() {
  if (scrollLockCount++ > 0) return;
  const root = document.documentElement;
  const scrollbarWidth = window.innerWidth - root.clientWidth;
  previousOverflow = root.style.overflow;
  previousPaddingRight = root.style.paddingRight;
  root.style.overflow = 'hidden';
  if (scrollbarWidth > 0) root.style.paddingRight = `${scrollbarWidth}px`;
}

function unlockPageScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount > 0) return;
  const root = document.documentElement;
  root.style.overflow = previousOverflow;
  root.style.paddingRight = previousPaddingRight;
}

/**
 * The system's modal dialog.
 *
 * **Built on the native `<dialog>` element and `showModal()`.** Focus trapping, focus
 * restoration to the trigger, Escape, top-layer rendering and — the one most often got
 * wrong — background inertness for pointer, keyboard and assistive technology at once,
 * all come from the platform rather than from us. It is the same choice `Button` made
 * in using a real `<button>` and `Input` in using the native `disabled` attribute, with
 * considerably more to buy here. A headless dependency would have roughly tripled a
 * 10.5 kB package for one component.
 *
 * **The `<dialog>` is not the card.** It is a transparent, full-viewport shell holding a
 * real scrim element, because `::backdrop` only started inheriting custom properties two
 * years after `showModal()` shipped — see docs/decisions.md. That also makes scrim
 * dismissal an identity check rather than a bounding-rect hit test.
 *
 * **Initial focus is resolved here, not left to the engine.** The close control is first
 * in DOM order because the design puts it in the title row, and landing there tells a
 * keyboard user only how to leave. So focus goes to `initialFocusRef`, else the first
 * focusable element that is not the close control, else the dialog itself — which is
 * focusable so that the title and description are announced rather than focus falling to
 * `<body>` and stranding the user, the same failure `Input`'s clear control had.
 *
 * **Escape is intercepted rather than obeyed.** The native `cancel` event is
 * `preventDefault`ed and `onOpenChange(false)` is requested instead, so a controlled
 * dialog cannot be closed behind its owner's back — the browser and the `open` prop can
 * never disagree.
 *
 * **What Jest can and cannot see.** jsdom 20 implements no modal behaviour at all, and
 * `jest.setup.ts` shims `showModal`/`close` only far enough to mount. In Jest this
 * component's modality, inertness, focus movement and Escape handling are NOT exercised;
 * they are asserted in `Dialog.cy.tsx` against a real browser, with a harness check that
 * fails if the shim is ever what is under test. See CLAUDE.md known-gaps.
 */
export const Dialog = /* @__PURE__ */ forwardRef<HTMLDialogElement, DialogProps>(function Dialog(
  {
    open,
    onOpenChange,
    title,
    size = 'md',
    tone = 'default',
    dividers = false,
    footer,
    children,
    closeLabel,
    closeOnBackdropClick,
    initialFocusRef,
    className,
  },
  ref
) {
  const generatedId = useId();
  const titleId = `dialog-${generatedId}-title`;
  const bodyId = `dialog-${generatedId}-body`;

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // Whether the pointer press that began this click landed on the scrim. Without it, a
  // text selection that starts inside the card and releases outside dismisses the
  // dialog — the click lands on the common ancestor, and the user loses their work for
  // dragging too far.
  const pressBeganOnScrim = useRef(false);
  // Whether THIS instance currently holds a page-scroll lock.
  //
  // Not derived from `dialogRef.current?.open`, and that is not a stylistic choice.
  // React detaches refs before passive-effect cleanup runs, so on unmount the ref is
  // already `null` and a cleanup that asks the element whether it is open silently does
  // nothing — leaving a consumer's page scroll-locked forever after a route change, with
  // nothing on screen to explain it. Owning the fact here makes the cleanup independent
  // of teardown ordering.
  const holdsScrollLock = useRef(false);

  const setRefs = useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  const dismissOnBackdrop = closeOnBackdropClick ?? tone !== 'warning';

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;

    if (open && !element.open) {
      element.showModal();
      lockPageScroll();
      holdsScrollLock.current = true;

      const explicit = initialFocusRef?.current;
      if (explicit) {
        explicit.focus();
      } else {
        const candidates = element.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        const firstNonClose = Array.from(candidates).find((node) => node !== closeRef.current);
        (firstNonClose ?? element).focus();
      }
    } else if (!open && element.open) {
      element.close();
      if (holdsScrollLock.current) {
        unlockPageScroll();
        holdsScrollLock.current = false;
      }
    }
    // `initialFocusRef` is intentionally not a dependency: it is read once, at the
    // moment of opening. Re-running focus resolution because a ref object identity
    // changed would yank focus out from under someone mid-interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Unmounting while open would otherwise leave the page permanently scroll-locked —
  // a dialog removed by a route change never runs its close path. The element itself
  // needs no `close()`: removing a modal `<dialog>` from the document takes it out of
  // the top layer already. Only the lock is ours to give back.
  useEffect(() => {
    return () => {
      if (holdsScrollLock.current) {
        unlockPageScroll();
        holdsScrollLock.current = false;
      }
    };
  }, []);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    // Escape. Prevented so the browser cannot close a controlled dialog on its own —
    // the request goes to the owner, and the effect above does the closing once `open`
    // actually changes. Without this the element and the prop drift apart, and the very
    // next render re-opens the dialog the user just dismissed.
    event.preventDefault();
    onOpenChange(false);
  }

  function handleScrimMouseDown(event: MouseEvent<HTMLDivElement>) {
    pressBeganOnScrim.current = event.target === event.currentTarget;
  }

  function handleScrimClick(event: MouseEvent<HTMLDivElement>) {
    if (!dismissOnBackdrop) return;
    if (!pressBeganOnScrim.current) return;
    if (event.target !== event.currentTarget) return;
    onOpenChange(false);
  }

  const body = (
    <div
      id={bodyId}
      data-slot="body"
      className={dialogSectionVariants({ section: 'body', dividers })}
    >
      {tone === 'warning' ? (
        <div className="flex gap-2">
          {/*
            aria-hidden is the ARGUMENT, not an implementation detail. The glyph measures
            1.87 on this surface and no step of the warning ramp clears 3:1, which is only
            acceptable because SC 1.4.11 governs graphics *required to understand the
            content* — and this one is not, since the text, the destructive action and
            role="alertdialog" all carry the meaning. Expose it to assistive technology
            and the criterion applies, so this is asserted in Dialog.test.tsx.
          */}
          <span aria-hidden="true" data-slot="icon" className={dialogWarningIconVariants()}>
            <WarningIcon />
          </span>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );

  return (
    <dialog
      ref={setRefs}
      // Focusable so it can be the focus of last resort. A dialog with no focusable
      // content still has to receive focus, or the user is left on <body> outside an
      // inert page with nothing to read.
      tabIndex={-1}
      // `dialog` is the element's implicit role, so it is only spelled out when it
      // changes. `aria-modal` is deliberately absent: showModal() conveys modality
      // natively, and asserting it by hand is how the two get to disagree.
      role={tone === 'warning' ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      aria-describedby={children ? bodyId : undefined}
      className={dialogShellVariants()}
      onCancel={handleCancel}
    >
      {/*
        Not an interactive control: it is a click *surface*. The dialog is dismissible by
        Escape and by the close button, both of which are reachable from the keyboard, so
        this needs no key handler and no role — adding one would put a spurious stop in
        the tab order for a behaviour that is already covered twice.
      */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions,jsx-a11y/click-events-have-key-events */}
      <div
        data-slot="scrim"
        className={dialogScrimVariants()}
        onMouseDown={handleScrimMouseDown}
        onClick={handleScrimClick}
      >
        <div data-slot="card" className={cn(dialogCardVariants({ size }), className)}>
          <div
            data-slot="header"
            className={dialogSectionVariants({ section: 'header', dividers })}
          >
            <h2 id={titleId} data-slot="title" className={dialogTitleVariants()}>
              {title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              data-slot="close"
              aria-label={closeLabel ?? `Close ${title}`}
              className={dialogCloseVariants()}
              onClick={() => onOpenChange(false)}
            >
              <CloseIcon />
            </button>
          </div>

          {body}

          {footer ? (
            <div
              data-slot="footer"
              className={dialogSectionVariants({ section: 'footer', dividers })}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  );
});
