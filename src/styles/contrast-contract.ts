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
 *  2. OMISSIONS — the set of colour tokens is read from the compiled stylesheet
 *     (the source of truth), and every one must be ACCOUNTED FOR: named in a
 *     pair, or listed in IGNORED with a reason. Add a token and forget to decide
 *     where it lives, and the build goes red. The gap can't hide.
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
 * Parse `src/styles/index.css` into resolved `#rrggbb` values for every
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
  for (const [declarationName, lightValue] of Object.entries(semanticTokens)) {
    if (!declarationName.startsWith('color-')) continue;
    const tokenName = declarationName.slice('color-'.length);
    const resolvedLight = resolveToHex(lightValue);
    if (resolvedLight) lightValues[tokenName] = resolvedLight;
    const resolvedDark = resolveToHex(darkOverrides[declarationName] ?? lightValue);
    if (resolvedDark) darkValues[tokenName] = resolvedDark;
  }
  return { light: lightValues, dark: darkValues };
}

/** Every semantic colour token defined by the theme (both modes share keys). */
export function colorTokens(theme: ResolvedTheme): string[] {
  return Object.keys(theme.light);
}

// ── The contract ────────────────────────────────────────────────────────────

/** WCAG thresholds. LARGE and UI are both 3.0 but named for the reason they apply. */
export const LEVEL = { AA: 4.5, LARGE: 3.0, UI: 3.0 } as const;
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
  'brand cyan focus ring is below SC 1.4.11 on white; focus visibility is completed at Input time with a neutral offset/halo';
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
    foreground: 'text-primary',
    background: 'surface-base',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'text-primary',
    background: 'surface-raised',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'text-secondary',
    background: 'surface-base',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'text-secondary',
    background: 'surface-raised',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },

  // Disabled text — WCAG explicitly exempts disabled controls.
  {
    foreground: 'text-disabled',
    background: 'surface-raised',
    light: exemptWith(DISABLED_EXEMPT),
    dark: exemptWith(DISABLED_EXEMPT),
  },
  {
    foreground: 'text-disabled',
    background: 'surface-muted',
    light: exemptWith(DISABLED_EXEMPT),
    dark: exemptWith(DISABLED_EXEMPT),
  },

  // Label on the accent (primary) fill, across button states.
  {
    foreground: 'text-on-accent',
    background: 'accent-solid',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'text-on-accent',
    background: 'accent-solid-hover',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'text-on-accent',
    background: 'accent-solid-active',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },

  // Label on the danger fill. The pressed (active) state is the one residual:
  // it clears the 3.0 non-text floor but misses 4.5 for small text.
  {
    foreground: 'text-on-accent',
    background: 'danger-solid',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'text-on-accent',
    background: 'danger-solid-hover',
    light: requireLevel('AA'),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'text-on-accent',
    background: 'danger-solid-active',
    light: acceptBelow('AA', TRANSIENT_PRESSED),
    dark: acceptBelow('AA', TRANSIENT_PRESSED),
  },

  // Brand-hue foregrounds — fail on white (accepted, mitigated), pass on dark.
  {
    foreground: 'text-accent',
    background: 'surface-base',
    light: acceptBelow('AA', BRAND_FOREGROUND_ON_WHITE),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'text-accent',
    background: 'surface-raised',
    light: acceptBelow('AA', BRAND_FOREGROUND_ON_WHITE),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'text-danger',
    background: 'surface-raised',
    light: acceptBelow('AA', BRAND_FOREGROUND_ON_WHITE),
    dark: requireLevel('AA'),
  },
  {
    foreground: 'text-danger',
    background: 'danger-subtle',
    light: acceptBelow('AA', BRAND_FOREGROUND_ON_WHITE),
    dark: requireLevel('AA'),
  },

  // Focus indicator (SC 1.4.11, non-text 3.0) — brand cyan on white is below
  // the bar (accepted, mitigated at Input); on dark it clears it.
  {
    foreground: 'border-focus',
    background: 'surface-raised',
    light: acceptBelow('UI', BRAND_FOCUS_RING),
    dark: requireLevel('UI'),
  },
  {
    foreground: 'ring-focus',
    background: 'surface-raised',
    light: acceptBelow('UI', BRAND_FOCUS_RING),
    dark: requireLevel('UI'),
  },
];

/**
 * Colour tokens the text-contrast contract deliberately does not police, each
 * with the reason. Every semantic colour token must appear here or in PAIRS —
 * that completeness is enforced by `findUnaccountedTokens`.
 */
export const IGNORED: Record<string, string> = {
  'surface-overlay':
    'shares surface-raised’s value; dialog text is covered by the surface-raised pairs',
  'surface-sunken':
    'recessed fill; only ever seats text-primary, which clears contrast on it by a wide margin',
  'surface-hover': 'transient hover fill; the text on it is unchanged from its resting surface',
  'surface-muted': 'covered as a surface in the text-disabled pairs',
  'accent-subtle':
    'tinted background with no text token paired to it yet (add one when a component renders text on it)',
  'accent-solid-disabled': 'disabled fill; any label on it is text-disabled, which WCAG exempts',
  'danger-solid-disabled': 'disabled fill; any label on it is text-disabled, which WCAG exempts',
  'border-subtle':
    'field/divider border; non-text contrast is verified at component level (1.4.11 nuance)',
  'border-default': 'field border; non-text contrast is verified at component level',
  'border-disabled': 'disabled field border; WCAG exempts disabled controls',
  'border-danger': 'invalid-field border; non-text contrast is verified at component level',
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

/** Colour tokens present in the theme but neither paired nor ignored. */
export function findUnaccountedTokens(theme: ResolvedTheme): string[] {
  const accountedFor = new Set<string>(Object.keys(IGNORED));
  for (const pair of PAIRS) {
    accountedFor.add(pair.foreground);
    accountedFor.add(pair.background);
  }
  return colorTokens(theme)
    .filter((token) => !accountedFor.has(token))
    .sort();
}

/** Contract entries that reference a token the theme no longer defines. */
export function findStaleReferences(theme: ResolvedTheme): string[] {
  const definedTokens = new Set(colorTokens(theme));
  const referencedTokens = new Set<string>(Object.keys(IGNORED));
  for (const pair of PAIRS) {
    referencedTokens.add(pair.foreground);
    referencedTokens.add(pair.background);
  }
  return [...referencedTokens].filter((token) => !definedTokens.has(token)).sort();
}
