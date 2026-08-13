import { mount } from 'cypress/react';

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
