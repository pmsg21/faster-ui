# CLAUDE.md — working agreement for Faster UI

Audience: a future Claude session with none of this conversation in context. This
file exists to stop the token layering (and the other load-bearing decisions)
from being quietly broken because the _reason_ for them wasn't in context. Read it
before writing components. It is not pushed to the repo (see `.gitignore`); the
interviewer-facing rationale lives in `docs/decisions.md`.

## What this is, and what it's judged on

A take-home for a **Senior Design System Engineer** role at PUMA: a small library
(`Button`, `Input`, `Dialog`) built on design tokens, tested, documented in
Storybook, wired to CI/CD, published to npm. It is assessed on **design-system
thinking** as much as working code — architecture, token strategy, accessibility,
testing approach, CI/CD, scalability.

Assume every file is read by an interviewer. A comment that explains _why_ a
decision was made is part of the deliverable; a comment that restates what the
code plainly does is noise. Delete the second kind.

## Token layering — hard rule

Two layers, and components only ever see the top one:

- **Primitives** — raw values, no meaning (a hex, a px). Private. Live in `:root`
  (and the `[data-theme='dark']` override) in `src/styles/index.css`. Components
  must NEVER reference a primitive.
- **Semantic tokens** — encode intent (`surface-base`, `text-danger`). The public
  API of the design system. Declared in `@theme`. Components consume these only.

If a component needs a value that has no semantic token, the fix is to **add a
semantic token**, not to reach past the layer to a primitive or a literal.

- No hardcoded colours anywhere outside the primitive layer. `bg-[#15C5CE]` and
  inline `style={{ color: '#...' }}` are **build failures**, not style nits.
- `src/index.ts` never exports primitives.

## Tailwind v4

- There is **no `tailwind.config.ts`** — by design. Tokens live in `@theme` in
  `src/styles/index.css`.
- Use `@theme`, **never `@theme inline`**. `inline` bakes values into the utility
  at build time and silently breaks runtime theming: `bg-surface-base` would
  freeze at its light value even under `[data-theme='dark']`. Non-inline keeps the
  `var()` indirection, so a theme switch is one attribute change. (See
  `docs/decisions.md`.)

## A component isn't done until it has all five files

`X/` contains: `X.tsx`, `X.test.tsx`, `X.cy.tsx`, `X.stories.tsx`, `index.ts`.

- **Stories**: one per variant and per state; a `Playground` with full control
  exposure; at least one edge case (long label, long content, overflow).
- **Tests (Jest + RTL)**: rendering, variants/states, interaction, keyboard, and
  an axe assertion. **Cypress** (`.cy.tsx`): mount + real interaction/keyboard/
  focus behaviour that jsdom can't prove.

## Accessibility lives in the component, not the docs

Focus management, semantics, ARIA wiring, and keyboard behaviour are the
component's job — built in, not left to the consumer or a usage note. The consumer
supplies only what the component cannot know, usually just the accessible name.

## Conventions

- **Conventional Commits**, enforced by commitlint. They feed Changesets:
  `feat:` → minor, `fix:` → patch. Commit discipline is release discipline.
  Keep the subject **short and to the point** — state the intent, e.g.
  `build: scaffold design system tooling`. Don't enumerate changed files or write
  a long body; the diff and the PR carry the detail.
- **Branch names** match the commit type and describe the change, not the symptom:
  `fix/`, `feat/`, `chore/`, `build/`, `docs/`. A `fix/` branch carries a `fix:`
  commit, not a `build:` one.
- **`cva`** for variants; **`cn()` / `twMerge`** for class composition, so a
  consumer's `className` wins predictably.
- **`forwardRef`** on anything that renders a DOM element.
- Props named for **intent, not appearance**: `variant="danger"`, never
  `variant="red"`.

## Tooling facts worth not rediscovering

- **pnpm** for development, **npm CLI** for publishing (OIDC reliability).
- **Cypress has its own TS program** — `pnpm typecheck` runs two `tsc -p`
  invocations (root + `cypress/tsconfig.json`). Jest and Cypress each declare a
  global `expect`; one program would collide them. (See `docs/decisions.md`.)
- **`pre-push`** runs typecheck + tests, not a full build; `pre-commit` runs
  lint-staged; `commit-msg` runs commitlint.
- Never `pnpm dlx` where `pnpm exec` will do. **Pin versions; never `@latest`** —
  it has drifted and broken CI three times (size-limit engine, commitlint hook,
  npm CLI).
- Dev/CI Node is pinned in `.nvmrc` (contributor signal); `engines.node`
  (`>=22.14.0`) is the _consumer_ contract for the shipped library — keep them
  distinct on purpose.

## Current state

- **Done**: full tooling scaffold committed and on `main`; all gates green
  locally (format, lint, two-program typecheck, Jest smoke test, build); all three
  husky hooks proven to fire; CI/Release workflows exist.
- **In progress**: `fix/ci-node-version` branch — Node pin bumped to 22.22.3,
  npm step pinned, dangling `./styles.css` export removed. PR open, not merged.
- **Next**: implement the token layer (primitives + semantic `@theme` tokens from
  the Figma source), then `Button`, `Input`, `Dialog`. When the first component
  imports `./styles/index.css` and the build emits `dist/styles.css`, restore the
  `./styles.css` export in `package.json` (TODO marker is in `vite.config.ts`).
- `src/index.ts` is still an empty `export {}`; the smoke tests in
  `src/index.test.ts` (Jest) and `src/index.cy.tsx` (Cypress) assert that and will
  fail — deliberately — the moment a real export lands, forcing a conscious
  public-API update.

## Known gaps / future work

- **Cypress 13 vs React 19 / Vite 6**: Cypress 13.17.0 warns that these versions
  aren't officially supported (it expects React ≤18, Vite ≤5). Component tests run
  and pass — it's a warning, not a failure. Bumping to Cypress 15 (React 19 / Vite
  6 support) would clear it; deferred so a major test-runner upgrade doesn't ride
  along with unrelated changes.
- The `./styles.css` package export was removed until the build emits CSS; restore
  it when the first component lands (TODO marker in `vite.config.ts`).
