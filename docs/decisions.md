# Architecture decisions

A record of the setup decisions made for Faster UI and the reasoning behind each.
Facts and reasoning only.

## Package manager: pnpm for development, npm CLI for publishing

Development installs use pnpm because its non-flat `node_modules` exposes only
packages that are explicitly declared, which prevents phantom dependencies —
importing a transitive package that was never listed in `package.json`. In an
application a phantom dependency is a local bug; in a published library it is
typically a missing `peerDependency` that breaks every consumer the moment a
transitive version shifts. Publishing runs through the npm CLI because OIDC
trusted publishing and provenance are reliable there. The release workflow
therefore installs with pnpm and publishes with npm.

## Design tokens: `@theme`, not `@theme inline`

Tokens are defined in Tailwind v4's `@theme` block in `src/styles/index.css`.
`@theme inline` bakes each token's value directly into the generated utility at
build time, which freezes it: a utility such as `bg-surface-base` would keep its
light-mode value even after `[data-theme='dark']` is applied. Plain `@theme`
keeps the `var()` indirection, so switching themes is a single attribute change
on the root element and no component re-renders differently. Raw primitives live
in `:root` and are immutable across modes; semantic tokens in `@theme` map to
those primitives and form the public token API. The dark override in
`[data-theme='dark']` re-points the semantic tokens, not the primitives — see
_Dark mode re-points the semantic layer_ below.

## Cypress has its own TypeScript program

Jest (`@types/jest`) and Cypress (Chai) each declare a global `expect` with
incompatible types — Jest's has `.extend`, Chai's does not. Compiling both
testing worlds in one `tsc` program collides the two globals, Chai's wins, and
`jest.setup.ts`'s `expect.extend` fails to type-check. `cypress/tsconfig.json`
gives the Cypress files (`cypress/**` plus `src/**/*.cy.tsx`) their own program
with the Cypress type set, while the root program excludes `**/*.cy.tsx`, so
every file belongs to exactly one program. ESLint points its parser at the
Cypress project for those files so type-aware linting continues to resolve
against the correct program.

## Two `tsc -p` invocations, not project references

`typecheck` runs `tsc -p tsconfig.json` and `tsc -p cypress/tsconfig.json` in
sequence. Project references would require `composite: true` on the Cypress
project, a `tsc --build` step, and `.tsbuildinfo` artifacts — machinery whose
payoff (incremental rebuilds, orchestrated build ordering) is realised in large
monorepos, not in a two-project repository. Two explicit invocations check each
program, read clearly in `package.json`, and fail loudly. The only cost is the
loss of cross-project incremental caching, which is negligible at this scale.

## `pre-push` runs typecheck and tests, not a full build

The `pre-push` hook runs `pnpm typecheck` and `pnpm test`. A full `pnpm build`
(the Vite library bundle plus declaration emit) catches the same class of error
but takes considerably longer, and that work belongs in CI, where latency does
not block a developer. Typecheck plus unit tests catch type and behaviour
regressions in a fraction of the time, keeping the push gate fast. The earlier
gates stay lighter still: `pre-commit` runs lint-staged, and `commit-msg` runs
commitlint.

## The Version Packages PR keeps a manual approval, deliberately

When a changeset lands on `main`, the Changesets action opens a "Version Packages"
PR authored by the `github-actions` bot. GitHub gates workflow runs on
bot-authored PRs behind a maintainer's "Approve and run", so that PR's required
checks do not start until a human approves them. We keep this step rather than
removing it.

The alternative is to author the PR with a GitHub App or a personal access token
so it runs as a trusted identity and CI triggers automatically. That was declined:
it trades one click per release for a standing identity holding permissions in the
repository. For a design system that releases perhaps once a sprint, a token's
permanent presence outweighs the friction it removes. The gate is also more than
friction — it is a second human checkpoint immediately before a version reaches
every consuming team, which in a system with distributed consumers is a feature,
not an obstacle.

The decision is orthogonal to how the package is published. The npm publish uses
OIDC trusted publishing and carries no `NPM_TOKEN`, and that holds whether the
Version Packages PR is approved by a human or created by a bot identity. Choosing
the manual gate does not weaken the token-free publish path.

## Dark mode re-points the semantic layer; primitives are immutable

Dark mode is a re-mapping, not a re-palette. Primitives never change — a primitive
is a fact, and `--neutral-50` means "the lightest step of the neutral ramp"
regardless of mode. If dark mode redefined it to a dark value, the name would lie
and nobody could reason about the ramp without first asking which mode they were in.
That would destroy the property that makes the primitive layer worth having: that
it is stable and mode-independent.

Absorbing the mode change is exactly what the semantic layer is for. `surface-base`
means "the default background"; which primitive that resolves to is a function of the
mode. So `[data-theme='dark']` re-points the `--color-*` semantic tokens at different
existing steps, and the primitives stay put. This is the model Figma Variables uses,
where each mode re-points the same token at different values.

The practical test is a third mode. Under a scheme that overrode primitives, adding
high-contrast or a regional brand would mean redefining the whole palette again.
Under this scheme it is one more column of mappings. The earlier working agreement
described primitives as living "in `:root` and the `[data-theme='dark']` override";
that wording was corrected (the override carries semantic tokens, not primitives) —
the rule was wrong, not the architecture.

Only colour is two-layered, because colour is what varies by mode and what carries
the accessibility decisions. Type and elevation have intrinsic intent and no mode
variance, so they are mapped once.

## Semantic tokens are added only against evidence

Every semantic token is permanent public debt. Adding one is cheap; removing one is
expensive, because it breaks consumers who are not in the room. So the semantic layer
exposes only intents that a component in scope actually consumes — neutral, primary
(as `accent`), and danger — and nothing else, no matter how complete a fuller palette
would feel.

This was decided in two steps, and the record keeps both because the movement is the
useful part. The first decision, made before the contrast contract existed, was that
`warning`/`success`/`info` should get a _minimal_ semantic set (solid + subtle + text)
rather than a full one with invented interaction states. The second decision revised
the first: once the contract was built, it could be measured that no in-scope component
touches those intents at all, and that most of the tokens they'd add would resolve to
accepted contrast _exemptions_. A contract where exemptions outnumber rules has stopped
meaning anything — it launders gaps into documented decisions. So "minimal against
evidence" resolved to "none yet": `warning`, `success` and `info` join `auxiliary` as
primitives-only. The earlier answer was not wrong; it was made on the information then
available, and building the tooling produced new information.

This is also the honest answer to "how do you detect unused tokens in a design system":
the best tooling is the one you don't need, because you didn't create the token. Every
semantic token here traces to an actual use in the design.

## Auxiliary stays primitives-only — the boundary working, not a gap

`auxiliary` (and now `warning`/`success`/`info`) are transcribed as primitives with no
semantic mapping and no consumer. That is not an omission; it is the architecture
handling a value gracefully — recorded and available the moment something needs it, and
unreachable by accident until then (no semantic token means no utility). "Auxiliary" is
itself the tell: Primary, Danger, Warning, Success and Info name what they are for;
"Auxiliary" names that someone had not decided yet. Exposing it as `accent-secondary`
would invent intent the design never expressed, and the semantic layer exists to
capture intent, not manufacture it. A primitive with no mapping and no consumer is the
clearest proof the layer boundary is real.

## Contrast is a contract, not a document

The accessibility decisions (which brand conflicts are accepted, which failures are
mitigated at component level) are encoded in `src/styles/contrast-contract.ts` and run
in CI, not left to a Markdown file that rots. The contract measures every declared
(foreground, surface) pair in both modes, fails on a regression, and _also_ fails on a
stale exemption that has climbed back above its bar. Separately it reads the token
universe from the stylesheet and fails on any colour token that is neither paired nor
explicitly ignored-with-reason, so a token added without a contrast decision cannot
hide. The adjacency — which surface a foreground legitimately sits on — is human
judgement and stays a maintained list; the completeness guard is what keeps that list
honest. Both failure modes are proven by provoking them, per the working agreement's
unproven-gate rule.
