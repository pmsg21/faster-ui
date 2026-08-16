import '@testing-library/jest-dom';

import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

/**
 * ── THE <dialog> SHIM, AND EXACTLY WHAT IT IS NOT ───────────────────────────
 *
 * `jest-environment-jsdom@29` resolves **jsdom 20.0.3**, where `showModal` and
 * `close` are `undefined` — mounting `Dialog` would throw. This makes it mount.
 * That is the whole of its ambition, and the limits matter more than the code.
 *
 * What it models:
 *   - `showModal()` / `close()` toggling the `open` property
 *   - a `close` event, so the component's own close path is exercised
 *
 * What it CANNOT model, and therefore what Jest asserts nothing about:
 *   - **modality** — there is no top layer here, so `showModal()` is
 *     indistinguishable from `<dialog open>`, which is the non-modal form
 *   - **background inertness** — the page behind stays fully focusable and
 *     clickable
 *   - **focus** — nothing is moved on open and nothing is restored on close
 *   - **Escape** — jsdom fires no `cancel` event, so the dismissal path that
 *     users reach for first is untested here
 *   - **`::backdrop`** — no pseudo-element, no painting at all
 *
 * All of the above is asserted in `Dialog.cy.tsx` against a real browser, which
 * carries a harness check that FAILS if this shim is ever what is under test —
 * because a green run that exercised the shim would be indistinguishable from
 * one that exercised a modal, and this repository has been caught by that shape
 * three times already (see docs/decisions.md).
 *
 * Read a passing Jest suite as covering roles, ARIA wiring, handlers and
 * rendering. Not modality.
 */
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
