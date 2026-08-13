import '@testing-library/jest-dom';

import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// jsdom does not implement the <dialog> element's modal behaviour.
// Real focus trapping and inert background are verified in Cypress.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
