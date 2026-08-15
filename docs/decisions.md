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

## A token name must not begin with a Tailwind utility prefix

In Tailwind v4 a utility is `<utility-prefix>-<token-name>`, and the prefix **composes
onto** the token name rather than replacing it. So `--color-text-primary` does not
produce `text-primary`; it produces `text-text-primary`, and `text-primary` does not
exist at all.

The first version of this token layer named its groups `text-*`, `border-*` and
`ring-focus*` — the roles they serve — and [tokens.md](tokens.md) stated that each token
yields `bg-*`, `text-*`, `border-*` and `ring-*` utilities. A reasonable reader concluded
`text-primary` existed. Nothing contradicted them, because no component had consumed a
token yet: the failure was latent until someone wrote the first `className`, at which
point the likely outcome is a quiet workaround rather than a fix.

The groups were renamed before any component shipped: `text-*` → `content-*`,
`border-*` → `line-*`, `ring-focus*` → `focus*`. The new names had to survive a second
test — do they still describe intent, or do they merely dodge a collision? They describe
intent: `content-primary` is the primary content, `line-subtle` is a subtle line. Dropping
`ring` from `focus-strong` is strictly more accurate, since that token is consumed by both
`ring-*` and `outline-*`; naming it after one of them was the accident.

This is cheap to re-break and hard to notice, so it is a guard rather than a note.
`findCollidingTokenNames` fails the build on any `--color-*` token starting with a
colour-utility prefix, and — following `IGNORED` — an exception must carry a reason:
`accent-*` is allowed, because the `accent-color` utility (the native form-control tint)
is never authored here, so `accent-solid` is only ever read as `bg-accent-solid`.

The general lesson is the one this repo keeps re-learning: a documented claim that
nothing executes is a claim that will eventually be false. This one had been false since
the day it was written.

## Not every convention earns a gate

The working agreement says a gate that has never failed is unproven, and every gate in
this repo is proven by provoking it. The counterpart matters just as much: **deciding
what does not become a gate.**

Separated type imports (`import type { X } from 'y'` on its own line) are the worked
example. `@typescript-eslint/consistent-type-imports` will _autofix_ to that style but
will not _report_ an inline `import { type X, y }` — the two are different things, and
closing the gap needs another plugin. We declined to add one.

The test is what a violation costs a consumer. Contrast, hardcoded colours, token
completeness, commit format: each prevents a defect that reaches someone downstream — an
illegible label, a colour outside the token layer, a release bumped wrongly. An inline
type import costs nobody anything. It compiles identically, behaves identically, and
`eslint --fix` in `pre-commit` rewrites it before it lands. Adding a dependency to
convert a legibility preference into a build failure is rigour applied by habit rather
than judgement.

There is a second-order reason. The "prove the gate" discipline is worth something
precisely because it is reserved for rules that earn it. If everything is a gate, the
word stops carrying information, and the ones that genuinely protect a consumer no longer
stand out from the ones that police whitespace.

## The evidence rule, third instance: no `tone` on IconButton

The Figma `IconButton` set has three variants and no Danger equivalent. `IconButton`
therefore ships without a `tone` prop, even though `danger-solid` already exists and a
destructive icon button is an obvious need.

That "obvious need" is exactly the argument being refused. If _"somebody will want it"_
counts as evidence, the rule stops being applicable — everything missing from a design
system is a common need for somebody. The criterion has to be evidence in the source,
or it is not a criterion.

The cost is also asymmetric in our favour. If a designer asks for a destructive icon
button tomorrow, the token exists and adding the prop is a minor bump that breaks
nobody. Expose it now and guess wrong — perhaps destructive icon buttons carry the
colour on the icon with no fill — and we have shipped public API that has to be
deprecated.

This is the same test applied a third time: to `auxiliary`, to `warning`/`success`/
`info`, and now to a component prop. Three applications of one rule is a principle;
one is a preference.

## A design file documents what exists, not how to decide

The TapTap file's Overview page defines each section (General is "the Visual Language
foundation of a system"; Data Entry is "inputting of data or information from various
sources into a system"; Feedback is "displaying reaction to user's operation or system
process"). Templates is composition — example Game Center screens. That is the whole of
the written guidance.

What no page contains: principles, a spacing scale, naming conventions, or per-component
usage rules. The file is an inventory, not a rulebook.

That absence is the clearest single justification for the semantic token layer. Figma
ships primitives with no semantic layer, and it ships components with no stated rules
for choosing between them — so the layer that encodes _intent_ (`accent-solid` rather
than `primary-600`; `variant` × `tone` rather than eight flat variants) is a
**contribution, not a transcription**. It is also why the divergences in
[design-fidelity.md](design-fidelity.md) are decisions rather than deviations: there was
no documented rule to deviate from, only values to measure.

## Deprecation policy: mark, communicate, migrate, then remove

Semver says _when_ a break is allowed. It does not say what a consumer is owed on the way
there, so:

1. **Mark** — JSDoc `@deprecated` naming the replacement, plus a dev-only console warning
   (never in production).
2. **Communicate** — state the removal version in the changeset, so it reaches
   `CHANGELOG.md` and the release notes rather than living in a commit nobody reads.
3. **Migrate** — ship a codemod whenever the change is mechanical (a renamed prop, a
   re-pointed token). If it can be done for them, it should be.
4. **Remove** — only in a subsequent major, never in the release that deprecates.

Adoption of an internal design system is voluntary in practice: a team that gets burned
writes its own button and never comes back. Breaking a team once costs their trust for
far longer than any deprecation window costs us.

Its first application is a free one, deliberately. `accent-subtle` was added to the token
layer on the assumption that Ghost's hover surface was a brand tint; extracting the
component proved it is a neutral wash (`neutral-100`/`neutral-300`), leaving the token
with no consumer. Because the `./styles.css` export is still withdrawn, nothing external
can depend on it, so it is simply removed. Exercising the policy while the cost is zero
is the point — the mechanism gets proven before it is load-bearing.

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
