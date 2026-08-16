import type { RunOptions, Spec } from 'axe-core';

/**
 * Shared axe configuration for **both** runners — Storybook's a11y panel and the Cypress
 * component specs. It lives at the repository root rather than in `src/` so it is neither
 * emitted into `dist` by `tsconfig.build.json` nor counted by Jest's coverage, and it is
 * picked up by the root TypeScript program through the `*.config.ts` include.
 *
 * The point of one file is that the two runners cannot state the same fact in two
 * different ways. A rule turned off in Storybook with one reason and in Cypress with
 * another is two truths to keep in sync, which is the problem this exists to prevent.
 *
 * ────────────────────────────────────────────────────────────────────────────────────
 * There are TWO kinds of thing in here and they are deliberately not interchangeable:
 *
 *   1. `PAGE_STRUCTURE_RULES_NOT_APPLICABLE` — rules that are **inapplicable**, declared
 *      once, globally. Not an accessibility decision.
 *   2. `acceptedContrast(…)` — a real, measured accessibility **exemption**, which can
 *      only be created by naming its ratio, its register row and its reason.
 *
 * Both would otherwise be written `{ enabled: false }`, and that shared spelling is what
 * makes an exemption look like configuration. Keeping them structurally different is the
 * whole design.
 * ────────────────────────────────────────────────────────────────────────────────────
 */

/**
 * Rules that evaluate the structure of a **page**, and therefore have no subject when a
 * component is rendered in isolation. Storybook and Cypress both mount a component into
 * a bare container: there is no `<main>` to find, no `<h1>` to require, and no landmark
 * for content to sit inside. The rules are not being overridden — they have nothing to
 * evaluate.
 *
 * **What qualifies for this list.** A rule belongs here only if it asks a question about
 * page composition that an isolated component cannot answer *even when the component is
 * perfect*. If turning it off would hide a defect in the component itself, it does not
 * belong here — it belongs in `acceptedContrast` (or nowhere).
 *
 * That test is the reason to keep the list short and to be suspicious of additions. The
 * next person's question will not be "is this rule off?" but "does mine belong here?",
 * and the criterion above is the answer.
 */
export const PAGE_STRUCTURE_RULES_NOT_APPLICABLE: RunOptions = {
  rules: {
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
    region: { enabled: false },
  },
};

/**
 * Marks a **region** as carrying an accepted contrast exemption. Put it on a wrapper in a
 * story or spec — never inside a component, because the exemption is ours and would
 * otherwise ship into a consumer's DOM, where it might not even be true after they
 * re-theme.
 */
export const ACCEPTED_CONTRAST_ATTRIBUTE = 'data-a11y-accepted-contrast';

/**
 * Rows of the register in `docs/design-fidelity.md`. Typed as a union rather than
 * `number` so an exemption pointing at a row that no longer exists fails to compile.
 *
 * This is the cheap half of "make the link checkable": it cannot verify that row 4 still
 * says what the exemption claims, but it does guarantee the row exists. Parsing the
 * Markdown to assert the text as well was judged more machinery than the risk warrants.
 */
export type FidelityRegisterRow = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface AcceptedContrastExemption {
  /** The measured ratio, e.g. `4.21`. Required — an exemption without a number is a guess. */
  ratio: number;
  /** The row in docs/design-fidelity.md that records this decision. */
  registerRow: FidelityRegisterRow;
  /** Why the ratio is accepted rather than fixed. */
  reason: string;
  /**
   * CSS selector for the exempt nodes — required, so every exemption states its own
   * blast radius instead of inheriting a default.
   *
   * Use `[${ACCEPTED_CONTRAST_ATTRIBUTE}]` on a wrapper where the whole region is exempt.
   * Where the node lives inside a component and cannot be wrapped, name it structurally
   * (`[data-slot="error"]`). Do **not** widen this to cover a component whole — the point
   * is that everything else in the story stays checked.
   */
  exemptSelector: string;
}

/**
 * **The register of accepted contrast exemptions.** Currently one.
 *
 * Keeping the decision here rather than at each call site means every runner cites the
 * same ratio and the same reason, and the answer to "how many exemptions does this
 * project have?" is the length of this section rather than a grep with a growing count.
 * Each site supplies only its own `exemptSelector`, because the blast radius is local
 * even when the decision is not.
 */
export const CONTENT_DANGER_ON_WHITE = {
  ratio: 4.21,
  registerRow: 4,
  reason:
    'Red carries meaning on a destructive control and on an error message, and `danger-700` ' +
    'is the darkest step the ramp offers — there is no compliant red available. Neutralising ' +
    'it would remove the signal from the people most likely to depend on it.',
} as const satisfies Omit<AcceptedContrastExemption, 'exemptSelector'>;

function exemptionNote({ ratio, registerRow, reason }: AcceptedContrastExemption): string {
  return (
    `**Accepted contrast exemption — ${ratio}:1.** ${reason} ` +
    `Recorded as row ${registerRow} of [docs/design-fidelity.md](https://github.com/pmsg21/faster-ui/blob/main/docs/design-fidelity.md), ` +
    `and pinned by the contrast contract, which fails if the ratio drifts in **either** direction. ` +
    `\`color-contrast\` stays **on** for this story; only the marked region is excluded, so any ` +
    `other contrast failure here is still reported.`
  );
}

/**
 * The axe `Spec` that narrows `color-contrast` to everything outside a marked region.
 *
 * `color-contrast` ships with no `selector` of its own (it filters through
 * `matches: 'color-contrast-matches'`), so supplying one restricts which nodes are
 * considered without disturbing how the rule decides. The rule therefore stays enabled —
 * which is the entire reason for preferring this over `{ enabled: false }`. Turning the
 * rule off would hide any *future* contrast failure in the same story; this hides exactly
 * one known pair and keeps watching everything else.
 */
export function acceptedContrastSpec({ exemptSelector }: AcceptedContrastExemption): Spec {
  return {
    rules: [
      {
        id: 'color-contrast',
        selector: `*:not(${exemptSelector}):not(${exemptSelector} *)`,
      },
    ],
  };
}

/**
 * Storybook `parameters` for a **Design Fidelity** story.
 *
 * A third kind, distinct from both of the above and worth keeping distinct. These stories
 * exist precisely to render the values the token layer rejected, side by side with what
 * ships — the "As drawn in Figma" column is non-compliant *on purpose*, and a story whose
 * subject is a rejected value cannot also be asked to pass.
 *
 * It is still a **narrowing, not a disable**: only cells marked with
 * `ACCEPTED_CONTRAST_ATTRIBUTE` are excluded, so the "Shipped" column beside them is still
 * checked. A contrast regression in the version we actually publish would still be caught
 * by the very story that documents why it looks that way.
 *
 * No ratio is required because this is not one measured pair — each row carries its own,
 * and they are tabulated in docs/design-fidelity.md rather than here.
 */
export function storyRendersFigmaAsDrawn(storyDescription?: string) {
  return {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            selector: `*:not([${ACCEPTED_CONTRAST_ATTRIBUTE}]):not([${ACCEPTED_CONTRAST_ATTRIBUTE}] *)`,
          },
        ],
      } satisfies Spec,
      options: PAGE_STRUCTURE_RULES_NOT_APPLICABLE,
    },
    docs: {
      description: {
        story: [
          storyDescription,
          '**The "As drawn in Figma" column deliberately fails contrast** — that is what it is ' +
            'for. `color-contrast` is narrowed to exclude those cells only; the "Shipped" column ' +
            'is still checked, so a regression in what we publish would be caught here. Every ' +
            'ratio is tabulated in ' +
            '[docs/design-fidelity.md](https://github.com/pmsg21/faster-ui/blob/main/docs/design-fidelity.md).',
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    },
  };
}

/**
 * Storybook `parameters` for a story containing an accepted contrast exemption.
 *
 * Returns the axe configuration **and** the docs text from one call, so the exemption and
 * its explanation cannot drift apart — the reason a reviewer reads is generated from the
 * same object that configures the rule.
 */
export function storyAcceptedContrast(
  exemption: AcceptedContrastExemption,
  storyDescription?: string
) {
  return {
    a11y: {
      config: acceptedContrastSpec(exemption),
      options: PAGE_STRUCTURE_RULES_NOT_APPLICABLE,
    },
    docs: {
      description: {
        story: [storyDescription, exemptionNote(exemption)].filter(Boolean).join('\n\n'),
      },
    },
  };
}
