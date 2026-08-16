/**
 * ── CONTRAST CONTRACT ──────────────────────────────────────────────────────
 *
 * A design token can silently degrade contrast the day someone re-points it.
 * This file makes the accessibility decisions in docs/accessibility.md
 * machine-checkable, so a regression fails CI instead of shipping.
 *
 * It does two things a plain document cannot:
 *
 *  1. VIOLATIONS — every declared (foreground, surface) pair is measured, in
 *     both light and dark, against the WCAG level we committed to. A pair that
 *     drops below its bar fails. A pair we *accepted* below the bar (a brand
 *     conflict, a transient state) that later climbs back above it also fails —
 *     a stale exemption is a lie we stop telling.
 *
 *  2. OMISSIONS — the set of colour tokens is read from the stylesheet (the
 *     source of truth), and every one must be ACCOUNTED FOR: named in a pair, or
 *     listed in IGNORED / SHARED_VALUE with a reason. Add a token and forget to
 *     decide where it lives, and the build goes red. The gap can't hide. A
 *     "shares another token's value" reason is itself asserted, not trusted.
 *
 * The one thing left to human judgement is the adjacency itself — which surface
 * a foreground legitimately sits on. A machine can't know that cyan-on-white is
 * intended and cyan-on-danger is nonsense. So PAIRS is a maintained list; the
 * rule "a new fg/surface token must be added here" is enforced by guard (2), not
 * merely written down. Scope note: this contract governs TEXT legibility (WCAG
 * 1.4.3) and the FOCUS indicator (1.4.11) — the two things a token-level check
 * can guarantee. Decorative/field border contrast is nuanced (a field is
 * identifiable by more than its border) and is verified in component tests.
 */

// ── WCAG 2.x maths ──────────────────────────────────────────────────────────

/** One sRGB channel (0–255) to its linear-light value. */
function linearizeChannel(channelValue: number): number {
  const normalized = channelValue / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/** Relative luminance of a `#rrggbb` colour, per WCAG. */
export function relativeLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return (
    0.2126 * linearizeChannel(red) +
    0.7152 * linearizeChannel(green) +
    0.0722 * linearizeChannel(blue)
  );
}

/** Contrast ratio between two `#rrggbb` colours (1–21), order-independent. */
export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Token resolution — read the stylesheet, resolve semantic → primitive ────

export type Mode = 'light' | 'dark';
export type ResolvedTheme = Record<Mode, Record<string, string>>;

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Body of the first `selector { ... }` block. Token blocks have no nesting. */
function blockBody(css: string, selector: string): string {
  const selectorIndex = css.indexOf(selector);
  if (selectorIndex === -1) return '';
  const openBrace = css.indexOf('{', selectorIndex);
  const closeBrace = css.indexOf('}', openBrace);
  return css.slice(openBrace + 1, closeBrace);
}

/** `--name: value;` declarations of a block, keyed without the leading `--`. */
function parseDeclarations(blockContents: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  const declarationPattern = /--([\w-]+)\s*:\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = declarationPattern.exec(blockContents)) !== null) {
    const [, tokenName, tokenValue] = match;
    // Collapse internal whitespace so a value Prettier wrapped across lines
    // (e.g. `var(\n  --neutral-700\n)`) still resolves.
    declarations[tokenName!] = tokenValue!.replace(/\s+/g, ' ').trim();
  }
  return declarations;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const CSS_VAR_REFERENCE = /^var\(\s*--([\w-]+)\s*\)$/;
const MAX_VAR_HOPS = 10;

/**
 * Parse `src/styles/tokens.css` into resolved `#rrggbb` values for every
 * `--color-*` semantic token, in both modes. Semantic tokens reference
 * primitives via `var(--x)`; this follows that chain to a concrete hex.
 */
export function parseTheme(css: string): ResolvedTheme {
  const withoutComments = stripComments(css);
  const primitives = parseDeclarations(blockBody(withoutComments, ':root'));
  const semanticTokens = parseDeclarations(blockBody(withoutComments, '@theme'));
  const darkOverrides = parseDeclarations(blockBody(withoutComments, "[data-theme='dark']"));

  const resolveToHex = (value: string): string | null => {
    let current = value;
    for (let hop = 0; hop < MAX_VAR_HOPS; hop++) {
      if (HEX_COLOR.test(current)) return current.toLowerCase();
      const varMatch = CSS_VAR_REFERENCE.exec(current);
      if (!varMatch) return null;
      const referencedValue = primitives[varMatch[1]!];
      if (referencedValue === undefined) return null;
      current = referencedValue.trim();
    }
    return null;
  };

  const lightValues: Record<string, string> = {};
  const darkValues: Record<string, string> = {};
  // Union both blocks so a token defined ONLY in [data-theme='dark'] is not
  // invisible to the completeness guard — its job is catching holes, and a
  // dark-only token would otherwise be one.
  const colorDeclarations = new Set(
    [...Object.keys(semanticTokens), ...Object.keys(darkOverrides)].filter((name) =>
      name.startsWith('color-')
    )
  );
  for (const declarationName of colorDeclarations) {
    const tokenName = declarationName.slice('color-'.length);
    const lightValue = semanticTokens[declarationName];
    if (lightValue !== undefined) {
      const resolvedLight = resolveToHex(lightValue);
      if (resolvedLight) lightValues[tokenName] = resolvedLight;
    }
    const darkValue = darkOverrides[declarationName] ?? semanticTokens[declarationName];
    if (darkValue !== undefined) {
      const resolvedDark = resolveToHex(darkValue);
      if (resolvedDark) darkValues[tokenName] = resolvedDark;
    }
  }
  return { light: lightValues, dark: darkValues };
}

/** Every semantic colour token defined by the theme, in either mode. */
export function colorTokens(theme: ResolvedTheme): string[] {
  return [...new Set([...Object.keys(theme.light), ...Object.keys(theme.dark)])].sort();
}

// ── The contract ────────────────────────────────────────────────────────────

/** WCAG thresholds in play. AA is small-text 1.4.3; UI is the 3.0 of 1.4.11. */
export const LEVEL = { AA: 4.5, UI: 3.0 } as const;
export type LevelName = keyof typeof LEVEL;

export type Expectation =
  | { kind: 'require'; level: LevelName }
  | { kind: 'accept'; level: LevelName; reason: string }
  | { kind: 'exempt'; reason: string };

const requireLevel = (level: LevelName): Expectation => ({ kind: 'require', level });
const acceptBelow = (level: LevelName, reason: string): Expectation => ({
  kind: 'accept',
  level,
  reason,
});
const exemptWith = (reason: string): Expectation => ({ kind: 'exempt', reason });

export interface Pair {
  foreground: string;
  background: string;
  light: Expectation;
  dark: Expectation;
}

const BRAND_FOREGROUND_ON_WHITE =
  'brand hue as foreground fails on white at every ramp step; mitigated at component level (icon + neutral text, or a tinted surface)';
const BRAND_FOCUS_RING =
  'brand cyan is below SC 1.4.11 on white; it is the decorative INNER border of a focused field, and focus-strong (required, below) is the indicator that carries the criterion';
const TRANSIENT_PRESSED = 'transient pressed state; above the 3.0 non-text floor';
const DISABLED_EXEMPT = 'WCAG exempts disabled controls';

/**
 * The declared adjacency. Foregrounds are listed against the surfaces they
 * legitimately sit on — not the full product (cyan-on-danger is nonsense).
 * Kept deliberately small: if this needs dozens of entries to stay green, the
 * semantic set has grown ahead of use, not the contract too strict.
 */
export const PAIRS: Pair[] = [
  // Body / content text — must be legible on the page and card surfaces.
  {
    foreground: 'content-primary',
    background: 'surface-base',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'content-primary',
    background: 'surface-raised',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'content-secondary',
    background: 'surface-base',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'content-secondary',
    background: 'surface-raised',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },

  // Ghost/link control labels use a NEUTRAL foreground, not the brand cyan:
  // cyan on white measures 1.88–2.80 across the interaction states, and a label
  // must be legible. Cyan stays on the non-text affordance — the Outline border,
  // the icon — never on the text. The accent ghost label sits at content-secondary
  // when resting (covered by the surface-base/raised pairs above) and darkens to
  // content-primary on hover and press, which is what these two pairs verify.
  //
  // Note the wash is NEUTRAL, not a brand tint: extracting the Button showed the
  // accent ghost hover/press surfaces are surface-hover / surface-active. Only the
  // danger tone tints its wash, which is why there is no accent-subtle token.
  {
    foreground: 'content-primary',
    background: 'surface-hover',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'content-primary',
    background: 'surface-active',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },

  // Disabled text — WCAG explicitly exempts disabled controls.
  {
    foreground: 'content-disabled',
    background: 'surface-raised',
    light: exemptWith(DISABLED_EXEMPT),
    dark: exemptWith(DISABLED_EXEMPT),
  },
  {
    foreground: 'content-disabled',
    background: 'surface-muted',
    light: exemptWith(DISABLED_EXEMPT),
    dark: exemptWith(DISABLED_EXEMPT),
  },

  // Label on the accent (primary) fill, across button states.
  {
    foreground: 'content-on-accent',
    background: 'accent-solid',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'content-on-accent',
    background: 'accent-solid-hover',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'content-on-accent',
    background: 'accent-solid-active',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },

  // Label on the danger fill. The pressed (active) state is the one residual:
  // it clears the 3.0 non-text floor but misses 4.5 for small text.
  {
    foreground: 'content-on-accent',
    background: 'danger-solid',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'content-on-accent',
    background: 'danger-solid-hover',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'content-on-accent',
    background: 'danger-solid-active',
    light: acceptBelow('AA', TRANSIENT_PRESSED),
    dark: acceptBelow('AA', TRANSIENT_PRESSED),
  },

  // Brand-hue foregrounds — fail on white (accepted, mitigated), pass on dark.
  {
    foreground: 'content-accent',
    background: 'surface-base',
    light: acceptBelow('AA', BRAND_FOREGROUND_ON_WHITE),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'content-accent',
    background: 'surface-raised',
    light: acceptBelow('AA', BRAND_FOREGROUND_ON_WHITE),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'content-danger',
    background: 'surface-raised',
    light: acceptBelow('AA', BRAND_FOREGROUND_ON_WHITE),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'content-danger',
    background: 'danger-subtle',
    light: acceptBelow('AA', BRAND_FOREGROUND_ON_WHITE),
    dark: requireLevel('AA'),
  },
  // Danger ghost, pressed. The label is pinned to content-danger (danger-700) across
  // the interaction states rather than tracking 600/500/700, so the tone survives
  // on a destructive control while reusing the exemption class already accepted
  // for content-danger — one accepted exemption instead of three new ones.
  {
    foreground: 'content-danger',
    background: 'danger-subtle-active',
    light: acceptBelow('AA', BRAND_FOREGROUND_ON_WHITE),
    dark: requireLevel('AA'),
  },

  // Focus indicator (SC 1.4.11, non-text 3.0) — brand cyan on white is below
  // the bar (accepted, mitigated at Input); on dark it clears it. This is the
  // INNER border of a focused field, which is decorative: the neutral ring below
  // is what actually satisfies the criterion. The former `focus` (primary-500)
  // pair was removed with the token — see docs/decisions.md.
  {
    foreground: 'line-focus',
    background: 'surface-raised',
    light: acceptBelow('UI', BRAND_FOCUS_RING),
    dark: requireLevel('UI'),
  },

  // The focus indicator that actually carries SC 1.4.11. Unlike the cyan ring
  // above, this one is REQUIRED to clear the bar in both modes — it is the
  // indicator of record, and a control's focus state cannot rest on an exemption.
  // Measured against both surfaces a focused control sits on, because the ring is
  // drawn outside the control (2px offset), on the page rather than on the fill.
  {
    foreground: 'focus-strong',
    background: 'surface-base',
    light: requireLevel('UI'),
    dark: requireLevel('UI'),
  },
  {
    foreground: 'focus-strong',
    background: 'surface-raised',
    light: requireLevel('UI'),
    dark: requireLevel('UI'),
  },
];

/**
 * Colour tokens the text-contrast contract deliberately does not police, each
 * with the reason. Every semantic colour token must appear here or in PAIRS —
 * that completeness is enforced by `findUnaccountedTokens`.
 */
export const IGNORED: Record<string, string> = {
  'surface-sunken':
    'recessed fill; only ever seats content-primary, which clears contrast on it by a wide margin',
  'surface-muted': 'covered as a surface in the content-disabled pairs',
  'accent-solid-disabled': 'disabled fill; any label on it is content-disabled, which WCAG exempts',
  'danger-solid-disabled': 'disabled fill; any label on it is content-disabled, which WCAG exempts',
  // The three field borders, each with a DIFFERENT reason — the earlier wording
  // lumped them together as "below 3:1, verified at component level", which is
  // measurably untrue of line-danger (3.47 light / 5.53 dark, i.e. it passes).
  'line-subtle':
    'resting field border, 1.31 light / 1.89 dark — below 3:1 in BOTH modes, so a resting field is never identifiable by its border alone; Input carries that with a required visible label and its fill (Input.test.tsx, Input.cy.tsx)',
  'line-default':
    'hover field border, 1.64 light / 5.03 dark — fails only in light, so the same component-level mitigation as line-subtle applies there',
  'line-disabled': 'disabled field border; WCAG exempts disabled controls',
  'line-danger':
    'invalid-field border, 3.47 light / 5.53 dark — CLEARS SC 1.4.11 unaided in both modes; ignored because the contract measures text pairs, not because it is exempt',
};

/**
 * Tokens accounted for by "shares another token's value." That is a claim a
 * comment cannot keep honest — it is true today and silently false the moment
 * someone re-points either side — so it is asserted instead (`findBrokenSharedValueClaims`).
 * `surface-overlay` (dialog) mirrors `surface-raised`, so the surface-raised
 * pairs cover its text; the guard makes that mirroring a fact, not a hope.
 */
export const SHARED_VALUE: Record<string, string> = {
  'surface-overlay': 'surface-raised',
};

// ── Checks ──────────────────────────────────────────────────────────────────

export interface Violation {
  foreground: string;
  background: string;
  mode: Mode;
  ratio: number;
  message: string;
}

const roundToHundredths = (value: number): number => Math.round(value * 100) / 100;

/** Measure every pair in both modes; return the ones that break the contract. */
export function findViolations(theme: ResolvedTheme): Violation[] {
  const violations: Violation[] = [];
  for (const pair of PAIRS) {
    for (const mode of ['light', 'dark'] as const) {
      const foregroundHex = theme[mode][pair.foreground];
      const backgroundHex = theme[mode][pair.background];
      if (foregroundHex === undefined || backgroundHex === undefined) {
        violations.push({
          foreground: pair.foreground,
          background: pair.background,
          mode,
          ratio: 0,
          message: `unresolved token (${mode})`,
        });
        continue;
      }
      const ratio = roundToHundredths(contrastRatio(foregroundHex, backgroundHex));
      const expectation = pair[mode];
      if (expectation.kind === 'require' && ratio < LEVEL[expectation.level]) {
        violations.push({
          foreground: pair.foreground,
          background: pair.background,
          mode,
          ratio,
          message: `requires ${expectation.level} (${LEVEL[expectation.level]}:1), got ${ratio}:1`,
        });
      } else if (expectation.kind === 'accept' && ratio >= LEVEL[expectation.level]) {
        violations.push({
          foreground: pair.foreground,
          background: pair.background,
          mode,
          ratio,
          message: `stale exemption — now meets ${expectation.level} (${ratio}:1 ≥ ${LEVEL[expectation.level]}:1); promote to require`,
        });
      }
    }
  }
  return violations;
}

/** Every token the contract names, across PAIRS, IGNORED and SHARED_VALUE. */
function accountedTokens(): Set<string> {
  const accounted = new Set<string>([...Object.keys(IGNORED), ...Object.keys(SHARED_VALUE)]);
  for (const [alias, target] of Object.entries(SHARED_VALUE)) {
    accounted.add(alias);
    accounted.add(target);
  }
  for (const pair of PAIRS) {
    accounted.add(pair.foreground);
    accounted.add(pair.background);
  }
  return accounted;
}

/**
 * Tailwind utility prefixes that read from the `--color-*` namespace.
 *
 * A colour token whose NAME begins with one of these produces a stuttering
 * utility, because the utility prefix composes on top of the token name rather
 * than replacing it: `--color-text-primary` yields `text-text-primary`, and
 * `text-primary` simply does not exist. This is not hypothetical — the first
 * version of this token layer shipped `text-*`, `border-*` and `ring-focus*`
 * names, and `docs/tokens.md` documented utilities that were never generated.
 * Nothing caught it, because no component had consumed a token yet.
 */
const COLOR_UTILITY_PREFIXES = [
  'accent',
  'bg',
  'border',
  'caret',
  'decoration',
  'divide',
  'fill',
  'from',
  'outline',
  'placeholder',
  'ring',
  'shadow',
  'stroke',
  'text',
  'to',
  'via',
] as const;

/**
 * Prefixes we knowingly collide with, because we never author the utility that
 * would stutter. Same shape as `IGNORED`: an exception must carry a reason.
 */
export const ALLOWED_PREFIX_COLLISIONS: Record<string, string> = {
  accent:
    'the accent-color utility (native form-control tint) is never authored here; accent-* tokens are consumed as bg-accent-solid / border-accent-solid, which do not stutter',
};

/**
 * Colour tokens whose name starts with a colour-utility prefix, so the utility
 * they generate stutters. Cheap to check and easy to reintroduce by accident.
 */
export function findCollidingTokenNames(theme: ResolvedTheme): string[] {
  return colorTokens(theme)
    .filter((token) =>
      COLOR_UTILITY_PREFIXES.some(
        (prefix) => token.startsWith(`${prefix}-`) && !(prefix in ALLOWED_PREFIX_COLLISIONS)
      )
    )
    .sort();
}

/** Colour tokens present in the theme but neither paired nor ignored. */
export function findUnaccountedTokens(theme: ResolvedTheme): string[] {
  const accountedFor = accountedTokens();
  return colorTokens(theme)
    .filter((token) => !accountedFor.has(token))
    .sort();
}

/** Contract entries that reference a token the theme no longer defines. */
export function findStaleReferences(theme: ResolvedTheme): string[] {
  const definedTokens = new Set(colorTokens(theme));
  return [...accountedTokens()].filter((token) => !definedTokens.has(token)).sort();
}

/**
 * A `SHARED_VALUE` claim that no longer holds — the two tokens have diverged in
 * at least one mode. Turns "shares surface-raised’s value" from a comment that
 * rots into an assertion that fails.
 */
export function findBrokenSharedValueClaims(theme: ResolvedTheme): string[] {
  const broken: string[] = [];
  for (const [alias, target] of Object.entries(SHARED_VALUE)) {
    for (const mode of ['light', 'dark'] as const) {
      if (theme[mode][alias] !== theme[mode][target]) {
        broken.push(
          `${alias} claims to share ${target}, but they differ in ${mode} ` +
            `(${theme[mode][alias] ?? 'undefined'} vs ${theme[mode][target] ?? 'undefined'})`
        );
      }
    }
  }
  return broken;
}
