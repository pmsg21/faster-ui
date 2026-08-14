import * as api from './index';

// Cypress smoke spec — the component-test twin of src/index.test.ts. It keeps the
// "Cypress component tests" gate honest while there are no components, and turns
// into a real guard the moment the first component ships its own .cy.tsx spec.
describe('public entry point (smoke)', () => {
  it('imports without throwing', () => {
    // A function-call assertion (not `.to.exist`, a bare-property getter that
    // trips no-unused-expressions). Mirrors the Jest twin's `toBeDefined()`.
    expect(api).to.not.equal(undefined);
  });

  it('exports nothing yet', () => {
    expect(Object.keys(api)).to.have.length(0);
  });
});
