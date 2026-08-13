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
in `:root` and its dark override; semantic tokens in `@theme` map to those
primitives and form the public token API.

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
