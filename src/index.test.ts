import * as api from './index';

// Smoke test for the public entry point. It guards two things:
//   1. `./index` imports without throwing.
//   2. The public surface is currently empty — the moment we export a
//      component (e.g. Button), this fails and forces a deliberate update
//      to the public API contract.
describe('public entry point', () => {
  it('imports without throwing', () => {
    expect(api).toBeDefined();
  });

  it('exports nothing yet', () => {
    expect(Object.keys(api)).toHaveLength(0);
  });
});
