// `cypress/react` (Cypress 13) mounts through the legacy ReactDOM.render, which
// React 19 removed — the mount then silently produces an empty AUT rather than
// erroring. `cypress/react18` mounts through createRoot, which is still React 19's
// API. Until the Cypress 15 bump, this is the adapter that actually works.
//
// Worth naming: this was invisible while the only spec imported the barrel and
// asserted on exports. The gate was green because nothing had ever been mounted.
import { mount } from 'cypress/react18';

import '@testing-library/cypress/add-commands';
import 'cypress-axe';
// Cypress's own `.type('{enter}')` dispatches synthetic key events, which do not
// trigger a control's NATIVE behaviour: no click follows Enter on a button, a focused
// button does not swallow Space, and there is no Tab traversal at all. real-events
// drives the browser through CDP, so the keyboard assertions test what a keyboard
// user actually gets. Chromium-family only — which is what we run.
import 'cypress-real-events';
import '../../src/styles/index.css';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);
