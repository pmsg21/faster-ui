# Faster UI

A small, production-ready design system: `Button`, `Input`, `Dialog`.

React · TypeScript · Tailwind CSS v4 · Storybook · Jest · Cypress · GitHub Actions

> **Status:** the token layer, `Button`, `IconButton` and `Input` ship in **0.2.0**, the
> currently published version. `Dialog` is complete on `main` and ships in the next
> release, which completes the brief.

**Live Storybook:** https://pmsg21.github.io/faster-ui/ · **npm:** [`@pmsg21/faster-ui`](https://www.npmjs.com/package/@pmsg21/faster-ui)

## Read this first: the components don't look exactly like the mock

Open Storybook next to the Figma file and the difference is immediate — **the primary
button ships a dark label on the cyan fill, not a white one.** White on the brand cyan
measures **2.12:1** where WCAG requires 4.5:1, and no step of the cyan ramp is dark
enough to fix it. A near-black label on the same cyan measures **7.78:1**. The cyan
itself is untouched.

`Input` has its own version of the same problem: the placeholder is drawn at a grey that
measures **1.64:1**, and darkening only the placeholder would have made it identical to
the value and erased the difference between an empty field and a filled one — so both
move one step and the design's _relationship_ survives.

`Dialog` has a third version of it that is invisible until you switch themes: in dark mode
`surface-base`, `surface-raised` and `surface-overlay` all resolve to the same `#1F1F1F`,
and the elevation shadow over that measures **1.045:1** — nothing at all. So the dialog's
**border is load-bearing rather than decorative in dark**, and the obvious token for it
(`line-subtle`, 1.89:1) is not good enough; it uses a neutral that measures 5.03:1. The
contrast contract enforces that as a requirement, not a preference.

Those are two of **ten** differences across the four shipped components, each measured
against a specific WCAG criterion: eight are changes to something the file draws, and two
are **additions** where it draws nothing at all — a focus state, and a visible label.
Fixes land either in the semantic token layer or in the component; **no primitive is ever
edited**, so every Figma value stays traceable to its source node. Every ratio is
recomputed from the shipped tokens on each CI run, so the record cannot drift from the code.

A row is a **decision, not an occurrence** — a later component re-applying an earlier
decision extends that row instead of adding one. The count per component is falling:
seven, then zero, then three, then zero. Each zero carries its mechanism in the register,
because a zero that cannot show its working is indistinguishable from having stopped
counting.

The full register, with the alternatives measured and rejected, is in
**[docs/design-fidelity.md](docs/design-fidelity.md)**. Each component's Storybook
sidebar also opens with a **Design Fidelity** story showing both versions side by side,
with the ratio and criterion beneath.

## Getting started

```bash
pnpm install
pnpm dev          # Storybook at http://localhost:6006
```

| Command                | What it does                         |
| ---------------------- | ------------------------------------ |
| `pnpm dev`             | Storybook dev server                 |
| `pnpm test`            | Jest + React Testing Library         |
| `pnpm cypress:open`    | Cypress component tests, interactive |
| `pnpm cypress:run`     | Cypress component tests, headless    |
| `pnpm lint`            | ESLint (flat config)                 |
| `pnpm format`          | Prettier                             |
| `pnpm typecheck`       | `tsc --noEmit`, twice — see below    |
| `pnpm test:ci`         | Jest with coverage, as CI runs it    |
| `pnpm build`           | Build the distributable library      |
| `pnpm build-storybook` | Static Storybook, as CI builds it    |
| `pnpm changeset`       | Record a change for the next release |

`typecheck` runs **two** TypeScript programs: the library, and Cypress. Jest and Cypress
each declare an incompatible global `expect`, so compiling both in one program makes the
Jest setup file fail to type-check ([docs/decisions.md](docs/decisions.md)).

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

Two lines. **No Tailwind required** — the package ships compiled CSS, so it works in
any project, on any version, or none.

```js
import '@pmsg21/faster-ui/styles.css';

import { Button, Dialog, IconButton, Input } from '@pmsg21/faster-ui';
```

The published `0.2.0` exports `Button`, `IconButton` and `Input`; `Dialog` joins them in
the next release. The public surface is pinned by a test in both runners, so neither an
accidental export nor an accidental omission can merge quietly.

### Browser support

**Chrome 105 · Safari 15.4 · Firefox 121.** Measured from the compiled stylesheet and the
component sources, not estimated:

| Feature                    | Set by                  | Chrome | Safari   | Firefox |
| -------------------------- | ----------------------- | ------ | -------- | ------- |
| `:has()`                   | `Input`'s focused field | 105    | 15.4     | **121** |
| `:focus-visible`           | every component's ring  | 86     | **15.4** | 85      |
| `<dialog>` + `showModal()` | `Dialog`                | 37     | 15.4     | 98      |

Worth stating plainly, because the natural assumption is the opposite: **`Dialog` is the
least binding of the three.** Its `showModal()` requirement is older than `Input`'s `:has()`
in every engine — twenty-one months older in Firefox. The package has had this floor since
`Input` shipped; adding a modal did not raise it, it only made someone go and measure it.

One soft floor worth knowing about: Tailwind v4 emits 59 `@property` rules (Safari 16.4,
Firefox 128), but ships an `@supports` fallback that declares the same variables for older
engines, so it degrades rather than breaks. It is also not something any component author
chose — a build-tool floor, invisible in every component's source.

The stylesheet carries the design tokens and the component classes. It deliberately
carries **no CSS reset**: installing four components should not restyle your
headings, lists and forms.

Dark mode is one attribute on the root element — no provider, no re-render:

```html
<html data-theme="dark"></html>
```

### Optional: compile our classes in your own build

If you are already on Tailwind v4, you can skip our stylesheet's utilities and let
your build generate them instead, so shared utilities are emitted once rather than
twice:

```css
@import 'tailwindcss';
@source '../node_modules/@pmsg21/faster-ui/dist/**/*.js';
@import '@pmsg21/faster-ui/styles.css'; /* still needed: the design tokens */
```

This works because our class names survive into the bundle as static strings —
verified, not assumed. It is an optimisation, not a requirement, and it is the only
path that needs Tailwind at all.

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
3. **Before approving that PR, check this README still describes what is about to
   ship** — the status line, the component list and the divergence count. The process
   already guarantees `CHANGELOG.md` is accurate; this is the step that guarantees the
   _page the changelog appears on_ is accurate too. A stale README is wrong on npmjs.com
   until somebody publishes again, which is a longer blast radius than any internal doc
   going stale.
4. That merge publishes to npm via **OIDC trusted publishing**: GitHub Actions
   proves its identity to npm directly, so no `NPM_TOKEN` is needed. Every
   release ships a signed **provenance attestation** linking the tarball to the
   exact commit and workflow run — recorded per version in
   [docs/release-verification.md](docs/release-verification.md).

## Conventions

- **Conventional Commits**, enforced by commitlint on `commit-msg`.
  This is not cosmetic: it feeds Changesets, so `feat:` → minor and
  `fix:` → patch. Commit discipline _is_ release discipline.
- **Husky hooks:** `pre-commit` runs lint-staged; `commit-msg` runs commitlint;
  `pre-push` runs typecheck and unit tests. The full build stays in CI —
  it catches the same errors and takes far longer.
- **Import order** is enforced by Prettier, not argued about in review.
