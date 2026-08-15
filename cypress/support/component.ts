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
