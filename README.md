# Faster UI

A small, production-ready design system: `Button`, `Input`, `Dialog`.

React · TypeScript · Tailwind CSS v4 · Storybook · Jest · Cypress · GitHub Actions

> **Status:** scaffold. Tokens and components are not implemented yet.

**Live Storybook:** https://pmsg21.github.io/faster-ui/ · **npm:** [`@pmsg21/faster-ui`](https://www.npmjs.com/package/@pmsg21/faster-ui)

## Getting started

```bash
pnpm install
pnpm dev          # Storybook at http://localhost:6006
```

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | Storybook dev server                 |
| `pnpm test`         | Jest + React Testing Library         |
| `pnpm cypress:open` | Cypress component tests, interactive |
| `pnpm cypress:run`  | Cypress component tests, headless    |
| `pnpm lint`         | ESLint (flat config)                 |
| `pnpm format`       | Prettier                             |
| `pnpm typecheck`    | `tsc --noEmit`                       |
| `pnpm build`        | Build the distributable library      |
| `pnpm changeset`    | Record a change for the next release |

## Why pnpm

Install speed is the smaller reason. The real one is **phantom dependencies**:
npm's flat hoisting lets you import a package you never declared, because it
was hoisted from a transitive dependency. That works until the transitive
version changes and the build breaks without anyone touching the code.

In an app that's your bug. In a **published library** it's a missing
`peerDependency` that breaks every consumer. pnpm's non-flat `node_modules`
means you can only import what you declared — that's correctness of the
dependency graph, not a preference.

Publishing still runs through the **npm CLI**, because OIDC trusted publishing
is only reliable there. Security of the supply chain over purity of tooling.

## Consuming this package

Tailwind v4 does not scan `node_modules` by default, so a consuming app must
opt in or the component classes get purged:

```css
@import 'tailwindcss';
@source '../node_modules/@pmsg21/faster-ui/dist/**/*.js';
```

The consumer must also be on Tailwind v4. A v3 app will not pick up these
classes.

## Releasing

Releases go through [Changesets](https://github.com/changesets/changesets) and
publish from CI. **No publishing credential lives in the repo** — not in the
code, and not in repo or environment secrets.

1. A change ships with a changeset (`pnpm changeset`) recording the bump
   (`patch` / `minor` / `major`) and a consumer-facing note.
2. Merging it to `main` opens a **Version Packages** PR that applies the bump and
   updates `CHANGELOG.md`. A maintainer approves and merges it — a deliberate
   human checkpoint before a version reaches consumers (see
   [docs/decisions.md](docs/decisions.md)).
3. That merge publishes to npm via **OIDC trusted publishing**: GitHub Actions
   proves its identity to npm directly, so no `NPM_TOKEN` is needed. Every
   release ships a signed **provenance attestation** linking the tarball to the
   exact commit and workflow run.

## Conventions

- **Conventional Commits**, enforced by commitlint on `commit-msg`.
  This is not cosmetic: it feeds Changesets, so `feat:` → minor and
  `fix:` → patch. Commit discipline _is_ release discipline.
- **Husky hooks:** `pre-commit` runs lint-staged; `commit-msg` runs commitlint;
  `pre-push` runs typecheck and unit tests. The full build stays in CI —
  it catches the same errors and takes far longer.
- **Import order** is enforced by Prettier, not argued about in review.
