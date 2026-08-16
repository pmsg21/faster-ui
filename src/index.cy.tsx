import * as api from './index';

// The Cypress twin of src/index.test.ts. It keeps the "Cypress component tests"
// gate honest about the package's entry point, which is the one thing every
// consumer touches regardless of which component they use.
describe('public entry point (smoke)', () => {
  it('imports without throwing', () => {
    // A function-call assertion (not `.to.exist`, a bare-property getter that
    // trips no-unused-expressions). Mirrors the Jest twin's `toBeDefined()`.
    expect(api).to.not.equal(undefined);
  });

  it('exports exactly the documented public surface', () => {
    expect(Object.keys(api).sort()).to.deep.equal(['Button', 'Dialog', 'IconButton', 'Input']);
  });
});
