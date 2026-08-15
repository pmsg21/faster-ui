import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ALLOWED_PREFIX_COLLISIONS,
  colorTokens,
  contrastRatio,
  findBrokenSharedValueClaims,
  findCollidingTokenNames,
  findStaleReferences,
  findUnaccountedTokens,
  findViolations,
  parseTheme,
  relativeLuminance,
} from './contrast-contract';
import type { ResolvedTheme } from './contrast-contract';

const stylesheet = readFileSync(join(__dirname, 'index.css'), 'utf8');
const theme = parseTheme(stylesheet);

describe('WCAG maths', () => {
  it('pins the reference ratios', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    // Black on white is the maximum possible ratio; identical colours the minimum.
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#15c5ce', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#15c5ce'),
      10
    );
  });
});

describe('parseTheme', () => {
  const syntheticCss = `
    :root {
      --neutral-700: #1F1F1F;
      --white: #FFFFFF;
      --primary-600: #15C5CE;
      --loop-a: var(--loop-b);
      --loop-b: var(--loop-a);
    }
    @theme {
      --color-content-primary: var(--neutral-700);
      --color-surface-raised: var(--white);
      --color-accent-solid: var(--primary-600);
      --color-wrapped: var(
        --primary-600
      );
      --color-missing-ref: var(--does-not-exist);
      --color-cyclic: var(--loop-a);
      --text-h1: 1.875rem; /* non-colour token, must be skipped */
    }
    [data-theme='dark'] {
      --color-content-primary: var(--white);
    }
  `;
  const parsed = parseTheme(syntheticCss);

  it('resolves semantic tokens through the var() chain to hex', () => {
    expect(parsed.light['content-primary']).toBe('#1f1f1f');
    expect(parsed.light['surface-raised']).toBe('#ffffff');
    expect(parsed.light['accent-solid']).toBe('#15c5ce');
    // A value Prettier wrapped across lines must still resolve.
    expect(parsed.light['wrapped']).toBe('#15c5ce');
  });

  it('applies dark overrides and leaves un-overridden tokens at their light value', () => {
    expect(parsed.dark['content-primary']).toBe('#ffffff');
    expect(parsed.dark['surface-raised']).toBe('#ffffff');
  });

  it('drops tokens that cannot resolve to a colour (missing ref, cycle) and skips non-colour tokens', () => {
    expect(parsed.light['missing-ref']).toBeUndefined();
    expect(parsed.light['cyclic']).toBeUndefined();
    expect(colorTokens(parsed)).not.toContain('h1');
  });

  it('returns nothing for a stylesheet without the expected blocks', () => {
    const empty = parseTheme('/* no blocks here */');
    expect(colorTokens(empty)).toHaveLength(0);
  });
});

describe('the shipped stylesheet honours the contract', () => {
  it('has no contrast violations in either mode', () => {
    const violations = findViolations(theme);
    // Surface the offenders in the failure message so a red build reads clearly.
    const detail = violations
      .map((v) => `${v.foreground} on ${v.background} [${v.mode}]: ${v.message}`)
      .join('\n');
    expect(detail).toBe('');
  });

  it('accounts for every colour token (no undeclared tokens)', () => {
    expect(findUnaccountedTokens(theme)).toEqual([]);
  });

  it('has no contract entry referencing a token the theme dropped', () => {
    expect(findStaleReferences(theme)).toEqual([]);
  });

  it('holds every declared shared-value claim', () => {
    expect(findBrokenSharedValueClaims(theme)).toEqual([]);
  });

  it('names no token after a colour-utility prefix (no stuttering utilities)', () => {
    expect(findCollidingTokenNames(theme)).toEqual([]);
  });
});

describe('the guards actually bite', () => {
  const clone = (): ResolvedTheme => ({ light: { ...theme.light }, dark: { ...theme.dark } });

  it('flags a required pair that drops below its bar', () => {
    const broken = clone();
    broken.light['content-primary'] = '#cccccc'; // pale grey on near-white surface-base
    const hit = findViolations(broken).find(
      (v) =>
        v.foreground === 'content-primary' && v.background === 'surface-base' && v.mode === 'light'
    );
    expect(hit?.message).toMatch(/requires AA/);
  });

  it('flags a stale exemption that now passes', () => {
    const tightened = clone();
    tightened.light['content-accent'] = '#000000'; // black clears AA on surface-base
    const hit = findViolations(tightened).find(
      (v) =>
        v.foreground === 'content-accent' && v.background === 'surface-base' && v.mode === 'light'
    );
    expect(hit?.message).toMatch(/stale exemption/);
  });

  it('flags an unresolved token in a pair', () => {
    const missing = clone();
    delete missing.dark['content-primary'];
    const hit = findViolations(missing).find(
      (v) => v.foreground === 'content-primary' && v.mode === 'dark'
    );
    expect(hit?.message).toMatch(/unresolved token/);
  });

  it('flags a token named after a colour-utility prefix', () => {
    const stuttering = clone();
    // The exact mistake the first token layer shipped: this yields
    // `text-text-primary`, while the documented `text-primary` never exists.
    stuttering.light['text-primary'] = '#1f1f1f';
    expect(findCollidingTokenNames(stuttering)).toContain('text-primary');
  });

  it('does not flag a prefix collision that is allowed with a reason', () => {
    // accent-* collides with the accent-color utility, but we never author it.
    expect(Object.keys(ALLOWED_PREFIX_COLLISIONS)).toContain('accent');
    expect(findCollidingTokenNames(theme)).not.toContain('accent-solid');
  });

  it('flags an undeclared token added to the theme', () => {
    const extended = clone();
    extended.light['text-warning'] = '#fe9b0e';
    extended.dark['text-warning'] = '#fe9b0e';
    expect(findUnaccountedTokens(extended)).toContain('text-warning');
  });

  it('flags a contract reference the theme no longer defines', () => {
    const shrunk = clone();
    // Both modes — colorTokens unions them, so a token surviving in either is defined.
    delete shrunk.light['focus'];
    delete shrunk.dark['focus'];
    expect(findStaleReferences(shrunk)).toContain('focus');
  });

  it('flags a shared-value claim that no longer holds', () => {
    const diverged = clone();
    diverged.dark['surface-overlay'] = '#000000'; // no longer mirrors surface-raised
    expect(findBrokenSharedValueClaims(diverged).join('\n')).toMatch(/surface-overlay/);
  });

  it('catches a token defined only in the dark block (a hole in the guard)', () => {
    const darkOnly = parseTheme(`
      :root { --danger-700: #ec2d30; }
      @theme { --color-content-primary: #1f1f1f; }
      [data-theme='dark'] { --color-text-warning: var(--danger-700); }
    `);
    expect(colorTokens(darkOnly)).toContain('text-warning');
    expect(findUnaccountedTokens(darkOnly)).toContain('text-warning');
  });
});
