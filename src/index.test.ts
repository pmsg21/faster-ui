import * as api from './index';

// The public surface is asserted exactly, not loosely. A design system's exports
// are its contract with consumers it will never meet: adding one is a promise to
// support it, removing one breaks a build somewhere. Pinning the list means
// neither can happen by accident — an incidental `export` in a component file
// that reaches the barrel turns this red, and a deliberate change has to be
// written down here, next to a changeset.
describe('public entry point', () => {
  it('imports without throwing', () => {
    expect(api).toBeDefined();
  });

  it('exports exactly the documented public surface', () => {
    expect(Object.keys(api).sort()).toEqual(['Button']);
  });
});
