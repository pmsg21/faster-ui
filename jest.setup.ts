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

/**
 * ── THE ResizeObserver STUB, AND WHAT IT COSTS ──────────────────────────────
 *
 * jsdom implements no `ResizeObserver` at all, and `Dialog` uses one to decide whether
 * its body has become a scrolling region and therefore needs a tab stop.
 *
 * This stub does **nothing** — it never fires. That is honest rather than lazy: jsdom
 * performs no layout, so `scrollHeight` and `clientHeight` are both `0` and no
 * measurement taken here could be true. The consequence is that **Jest cannot test the
 * scrolling body's tab stop in either direction**; `Dialog.cy.tsx` asserts it in a real
 * browser, including that the region is absent from the tab order when the content is
 * short and present once it overflows.
 *
 * It is a stub rather than a guard inside the component on purpose. The component's
 * browser baseline (Safari 15.4) has had `ResizeObserver` since Safari 13.1, so a
 * `typeof` check in shipped code would exist solely to serve this test environment —
 * which is how a test concern quietly becomes a consumer's runtime branch.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
