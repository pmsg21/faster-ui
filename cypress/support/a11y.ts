import { acceptedContrastSpec, PAGE_STRUCTURE_RULES_NOT_APPLICABLE } from '../../a11y.config';
import type { AcceptedContrastExemption } from '../../a11y.config';

/**
 * The Cypress half of the shared axe configuration. Both the rules and the reasons come
 * from `a11y.config.ts`, which Storybook reads too — a rule must not be able to be off in
 * one runner for a reason the other has never heard of.
 *
 * Note one thing this file cannot promise. Cypress injects
 * `node_modules/axe-core/axe.min.js` (the pinned 4.9.1, same engine `jest-axe` resolves),
 * while `@storybook/addon-a11y` imports its own `axe-core` and resolves 4.13.0. The
 * *configuration* is shared; the *engine* is not. Recorded in CLAUDE.md.
 */

/**
 * Runs axe with the page-structure rules switched off, printing offending rules and nodes
 * to the CI log rather than reporting only a count.
 *
 * Takes **no options on purpose.** It used to accept an overrides bag, which is how
 * `{ 'color-contrast': { enabled: false } }` got written inline at two call sites without
 * anyone stating a ratio. An accessibility exemption now has exactly one door —
 * `checkA11yWithAcceptedContrast` — and that door asks for the number.
 */
export function checkA11y() {
  cy.injectAxe();
  cy.checkA11y(undefined, PAGE_STRUCTURE_RULES_NOT_APPLICABLE, (violations) => {
    cy.task('logA11yViolations', violations, { log: false });
  });
}

/**
 * Runs axe with `color-contrast` still **enabled**, narrowed to exclude one named region.
 *
 * This is the only supported way to accept a contrast failure, and it takes the ratio, the
 * register row and the reason as required arguments — so an exemption cannot be added
 * without stating what it costs, and `grep -r acceptedContrast` gives a stable count.
 *
 * Deliberately NOT `{ 'color-contrast': { enabled: false } }`: switching the rule off to
 * hide one known pair also hides every future failure in the same story. That is the same
 * shape as a stale exemption in the contrast contract, which is already solved by making
 * it fail once it stops being necessary.
 */
export function checkA11yWithAcceptedContrast(exemption: AcceptedContrastExemption) {
  cy.injectAxe();
  cy.configureAxe(acceptedContrastSpec(exemption));
  cy.checkA11y(undefined, PAGE_STRUCTURE_RULES_NOT_APPLICABLE, (violations) => {
    cy.task('logA11yViolations', violations, { log: false });
  });
}
