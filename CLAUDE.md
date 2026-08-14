# CLAUDE.md — working agreement for Faster UI

Always-loaded context. It holds only what must be true before writing any code —
rules that, ignored, produce work that has to be redone — plus pointers to the
detail in `docs/`. The "why" behind most decisions is in
[docs/decisions.md](docs/decisions.md); reference it, don't restate it. Tracked in
the repo (not shipped to npm): the design system's rules should outlive whoever
wrote them.

## What this is

A take-home for a **Senior Design System Engineer** role at PUMA — `Button`,
`Input`, `Dialog`. Judged on design-system thinking as much as code: architecture,
tokens, accessibility, testing, CI/CD, scalability. Assume every file is read by an
interviewer — a comment explaining _why_ is deliverable; one restating the code is
noise.

## Hard rules

**Token layering.** Two layers; a component only ever sees the top one.

- _Primitives_ — raw values, no meaning. Private. In `:root` (and the
  `[data-theme='dark']` override) in `src/styles/index.css`. Never referenced by a
  component.
- _Semantic tokens_ — encode intent (`surface-base`, `text-danger`). The public
  API. Declared in `@theme`.
- A component needing a value with no semantic token → **add a semantic token**,
  don't reach past the layer. A hardcoded colour outside primitives (`bg-[#15C5CE]`,
  inline `style` colour) is a **build failure**. `src/index.ts` never exports
  primitives.

**Tailwind v4.** No `tailwind.config.ts` — tokens live in `@theme` in
`src/styles/index.css`. Use `@theme`, **never `@theme inline`**: inline bakes
values at build time and freezes `bg-surface-base` at its light value under
`[data-theme='dark']`.

**Component completeness.** Not done until `X.tsx`, `X.test.tsx`, `X.cy.tsx`,
`X.stories.tsx`, and `index.ts` all exist. Stories: one per variant and per state,
a `Playground` with full controls, ≥1 edge case (long label/content). Tests:
rendering, variants, interaction, keyboard, and an axe assertion.

**Accessibility is the component's job.** Focus, semantics, ARIA, keyboard — built
in, not deferred to docs or the consumer. The consumer supplies only what the
component can't know (usually the accessible name).

**Conventions.**

- Conventional Commits (commitlint-enforced) feed Changesets: `feat:` → minor,
  `fix:` → patch. Subjects short and intent-focused (`build: scaffold design system
tooling`) — no file-by-file bodies; the diff carries detail.
- Branch names match the commit type and describe the change: `fix/`, `feat/`,
  `chore/`, `build/`, `docs/`.
- `cva` for variants; `cn()` / `twMerge` for class composition, so a consumer's
  `className` wins. `forwardRef` on anything rendering a DOM element. Props named
  for intent (`variant="danger"`), never appearance (`variant="red"`).
- `pnpm exec`, never `pnpm dlx`; pin versions, never `@latest`.

## Working discipline

- **Verify under CI's conditions, not local convenience.** CI runs `test:ci`
  (`--coverage`) from a cold cache; local runs `test` with a warm one. Before
  calling a gate green, run the exact command CI runs and reason about what a cold
  runner does differently (coverage, missing binaries, frozen lockfile).
- **A gate that has never failed is unproven.** Prove it by provoking the failure,
  not observing the pass — an invalid commit message, a spec that should error, a
  check name that must resolve. If you can't make it fail, you don't know it works.

## Where the detail lives

- [docs/decisions.md](docs/decisions.md) — the "why" record (pnpm vs npm CLI,
  `@theme` vs `inline`, Cypress's own TS program, two `tsc -p`, `pre-push` scope).
- `docs/patterns.md` — **after Button ships**, extracted from what we actually
  built so Input/Dialog have a real reference. Not written yet: we have intentions,
  not patterns.
- `docs/tokens.md`, `docs/accessibility.md` — when there's real content.

## Current state

- **Done — scaffold and CI/CD complete on `main`.** All five gates green (format,
  lint, two-program typecheck, Jest + coverage, build) and proven by provoked
  failures; three husky hooks proven. The release pipeline is proven end to end:
  `@pmsg21/faster-ui@0.0.1` is published to npm via **OIDC trusted publishing** (no
  `NPM_TOKEN`) with a signed **provenance attestation**, and Storybook deploys to
  GitHub Pages. Artifacts and links are in
  [docs/release-verification.md](docs/release-verification.md).
- **Next — the token layer.** Primitives + semantic `@theme` tokens in the
  three-layer architecture, then `Button`, `Input`, `Dialog`. **The token values
  are not in the repo yet** — they come from the maintainer at the start of the
  next session, extracted from the Figma file (8 colour ramps × 8 steps with
  primary cyan `#15C5CE` at 600, four double-shadow elevation levels, the H1→Caption
  type scale in two weights, and the documented font stack). They are not to be
  guessed or invented.

## Known gaps / state to remember

- `src/index.ts` is empty `export {}`; the Jest (`index.test.ts`) and Cypress
  (`index.cy.tsx`) smoke specs assert that and fail deliberately when the first
  real export lands.
- `collectCoverageFrom` excludes `*.cy.tsx`; the `coverageThreshold` (branches 80,
  functions/lines/statements 85) hasn't bitten only because there's no source to
  count — it enforces the moment component code lands.
- `./styles.css` export removed until the build emits CSS — restore when the first
  component imports the stylesheet (TODO in `vite.config.ts`).
- CI caches the Cypress binary at `~/.cache/Cypress` and runs `cypress install`
  explicitly, because a warm pnpm cache skips the postinstall that downloads it.
- Cypress 13 warns React 19 / Vite 6 aren't officially supported (works; a Cypress
  15 bump clears it) — deferred.
