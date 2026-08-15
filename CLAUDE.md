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

- _Primitives_ — raw values, no meaning. Private. In `:root` in
  `src/styles/index.css`, and **immutable across modes** (a ramp is a fact). Never
  referenced by a component.
- _Semantic tokens_ — encode intent (`surface-base`, `content-danger`). The public
  API. Declared in `@theme`. **Dark mode re-points these** in the
  `[data-theme='dark']` block — it overrides semantic tokens, never primitives (see
  [docs/decisions.md](docs/decisions.md)).
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

**Assert the before-state, not only the after.** Every interaction test pins the
spy _before_ it acts, and again after **each** step:

```ts
expect(onClick).toHaveBeenCalledTimes(0);
await user.click(button);
expect(onClick).toHaveBeenCalledTimes(1);
```

A test that only checks the end state passes identically when the interaction
never happened — wrong selector, element not rendered, handler never wired. That
failure mode is invisible precisely on the tests that matter most: a
`not.toHaveBeenCalled()` assertion is _already_ true before the test does
anything. Same reason a multi-key sequence asserts after every key rather than
once at the end — otherwise a green run cannot tell you which key was handled.

**A failing test is evidence. Deleting it is not a fix.** The first instinct on red
must be to find out _why_ — the test may be right and the code wrong, or the test may
be wrong, or the **tool** may be unable to express what was asked of it. That third
case is a finding about the tooling, and deleting the test converts it into silence.

So: never remove or weaken a test to get a suite green. If one has to change, say so
**before** doing it, and state three things — the reason, where the coverage went, and
whether any is lost. Coverage that merely _moves_ (a keyboard assertion leaving Cypress
for Jest, because `.type()` cannot trigger native activation) is a trade to be agreed,
not absorbed. Coverage that is genuinely **lost** needs explicit sign-off, and gets
recorded in known-gaps — an untested behaviour nobody wrote down is indistinguishable
from one nobody thought of.

The exception is a test that asserts something untrue. Those get replaced, not kept —
but the replacement must be _narrower and more precise_, never merely quieter.

**`userEvent.setup()` must not be called at module scope.** It binds when called,
and at import time the test environment is not fully established, so it can bind
to a `document` that is later replaced. Inside `beforeEach` or inside each test
are both fine — every call returns an independent instance. Prefer per-test where
it keeps the case readable on its own; these tests double as documentation.

**Accessibility is the component's job.** Focus, semantics, ARIA, keyboard — built
in, not deferred to docs or the consumer. The consumer supplies only what the
component can't know (usually the accessible name).

**Conventions.**

- Conventional Commits (commitlint-enforced) feed Changesets: `feat:` → minor,
  `fix:` → patch.
- **Commit subjects are one short, intent-focused line** (`build: scaffold design
system tooling`). **Default to no body at all.** Never narrate the diff
  file-by-file — the diff carries the detail; add a body only for genuine _why_ the
  diff can't show, and keep it to a sentence or two.
- **No tool or AI attribution, anywhere.** No "Generated with Claude Code", no
  `Co-Authored-By` trailer, no emoji credit — in commit messages _or_ PR
  descriptions. Not because the tooling is hidden — this repo ships a `CLAUDE.md`
  and the AI-assisted workflow is discussed openly — but because a commit log
  describes _the change_, not the tools that produced it.
- Branch names match the commit type and describe the change: `fix/`, `feat/`,
  `chore/`, `build/`, `docs/`.
- `cva` for variants; `cn()` / `twMerge` for class composition, so a consumer's
  `className` wins. `forwardRef` on anything rendering a DOM element. Props named
  for intent (`variant="danger"`), never appearance (`variant="red"`).
- **Identifiers say what the value is _for_.** No single letters, no abbreviations
  that need the surrounding line to decode — `registerNumber`, not `n`;
  `foregroundLuminance`, not `fl`. This applies to props, locals, callback
  parameters and test fixtures alike. A name is the one piece of documentation
  that cannot go stale, and every reader after the author pays for a short one.
- **Type imports are their own statement, never inline.** `import type { X } from
'y'` on its own line — not `import { type X, y } from 'y'`. A reader scanning
  the head of a file can then tell what is erased at compile time from what is
  real runtime weight, without parsing each specifier. Applied automatically by
  `eslint --fix` in `pre-commit` (`consistent-type-imports`,
  `fixStyle: 'separate-type-imports'`) — **not** a failing rule: an inline type
  import lints clean, it just gets rewritten before it lands. That is deliberate;
  see [docs/decisions.md](docs/decisions.md) on what earns a gate.
- `pnpm exec`, never `pnpm dlx`; pin versions, never `@latest`.

## Working discipline

- **Verify under CI's conditions, not local convenience.** CI runs `test:ci`
  (`--coverage`) from a cold cache; local runs `test` with a warm one. Before
  calling a gate green, run the exact command CI runs and reason about what a cold
  runner does differently (coverage, missing binaries, frozen lockfile).
- **A gate that has never failed is unproven.** Prove it by provoking the failure,
  not observing the pass — an invalid commit message, a spec that should error, a
  check name that must resolve. If you can't make it fail, you don't know it works.
- **A green gate must be proven to _run_ the thing it gates.** Passing and covering
  are different claims, and a gate that never executes its subject reports the same
  green as one that does. This has now bitten three times: the Cypress binary a warm
  pnpm cache skipped, the `.storybook` files `tsc` never included, and Cypress
  "supporting" React 19 on the strength of a spec that never mounted a component
  (see [docs/decisions.md](docs/decisions.md)). Three is a pattern, not bad luck.
  So when a gate is added, check what it actually executed — a spec count, an emitted
  file, a log line — not merely that it exited zero.
- **The plan is an agreement; diverging from it is a report, not a note.** If a plan
  says something will be verified a particular way and it turns out it cannot be,
  that is a finding to raise before proceeding. Writing a scope note and moving on
  leaves the agreement describing something other than what shipped, and the person
  who agreed to it is the last to find out.
- **A component is hand-tested before its PR opens.** Commit freely on the branch —
  granular history is wanted — but when the component, its tests and its stories are
  done, **stop and say it's ready**, then wait. The maintainer runs Storybook, works
  it by keyboard, checks both theme modes and reads the Design Fidelity story before
  a PR exists. Everything a gate proves is _measurable_ — ratios, ΔE, computed boxes,
  test results. None of it catches whether the thing **feels** right: whether a focus
  ring reads at 2px offset on a cyan fill, whether a spinner is legible at `sm`,
  whether disabled looks disabled rather than broken. That needs eyes and a keyboard,
  and it is far cheaper before a PR than after.

## Where the detail lives

- [docs/decisions.md](docs/decisions.md) — the "why" record (pnpm vs npm CLI,
  `@theme` vs `inline`, Cypress's own TS program, two `tsc -p`, `pre-push` scope).
- `docs/patterns.md` — **after Button ships**, extracted from what we actually
  built so Input/Dialog have a real reference. Not written yet: we have intentions,
  not patterns.
- [docs/tokens.md](docs/tokens.md) — the naming scheme, layer rules, and the
  primitive→semantic map (light and dark).
- [docs/accessibility.md](docs/accessibility.md) — the contrast record: the
  dark-on-cyan decision, the accepted brand conflicts, and the CI contract.

## Current state

- **Done — scaffold and CI/CD complete on `main`.** All five gates green (format,
  lint, two-program typecheck, Jest + coverage, build) and proven by provoked
  failures; three husky hooks proven. The release pipeline is proven end to end:
  `@pmsg21/faster-ui@0.0.1` is published to npm via **OIDC trusted publishing** (no
  `NPM_TOKEN`) with a signed **provenance attestation**, and Storybook deploys to
  GitHub Pages. Artifacts and links are in
  [docs/release-verification.md](docs/release-verification.md).
- **Done — the token layer (merged via #8).** Primitives (8 ramps ×
  8 + black/white, the type scale, the four elevation shadows) in `:root`; semantic
  `@theme` tokens for the intents Button/Input/Dialog consume (neutral, `accent`,
  danger); dark mode as a semantic re-map. `warning`/`success`/`info`/`auxiliary` are
  primitives-only until a component needs them. Accessibility is enforced by an
  automated **contrast contract** (`src/styles/contrast-contract.ts`) that fails CI on
  a contrast regression _or_ an undeclared token — both proven by provoked failures.
  The primary button ships **dark text on cyan** (white fails AA at every ramp step);
  full record in [docs/accessibility.md](docs/accessibility.md).
- **Next — `Button`, `Input`, `Dialog`,** consuming semantic tokens only. When the
  first component imports the stylesheet, restore the `./styles.css` export (see the
  `vite.config.ts` TODO) and add the hardcoded-colour lint gate.

## Known gaps / state to remember

- `src/index.ts` is empty `export {}`; the Jest (`index.test.ts`) and Cypress
  (`index.cy.tsx`) smoke specs assert that and fail deliberately when the first
  real export lands.
- `collectCoverageFrom` excludes `*.cy.tsx`; the `coverageThreshold` (branches 80,
  functions/lines/statements 85) is now **live** — `contrast-contract.ts` is the first
  counted source (96/89/100/100). `index.ts` is excluded, so it stays empty-safe.
- `./styles.css` export removed until the build emits CSS — restore when the first
  component imports the stylesheet (TODO in `vite.config.ts`).
- CI caches the Cypress binary at `~/.cache/Cypress` and runs `cypress install`
  explicitly, because a warm pnpm cache skips the postinstall that downloads it.
- Cypress 13 warns React 19 / Vite 6 aren't officially supported (works; a Cypress
  15 bump clears it) — deferred.
- **No visual-regression coverage — acknowledged, not built.** The contrast contract
  catches a token change that degrades _accessibility_; nothing catches one that
  merely makes a component **look** different. And the culprit is usually a primitive
  three levels below the component being edited, so the diff that breaks a button is
  rarely in the button. At three components that is eye-checkable; at thirty it is
  not. Chromatic against the Storybook build CI already produces is the natural fit.
  Whether it lands depends on time remaining after Dialog.
- **The completeness guard covers colour only.** `parseTheme` filters on
  `--color-*`, so `--radius-*`, `--text-*` and `--shadow-*` are invisible to it: a
  radius or type token can be added with no decision recorded and nothing goes red.
  The colour guard is the one that protects an accessibility contract, so this is a
  deliberate boundary rather than an oversight — but now that radius tokens exist,
  the boundary is worth naming.

### Obligations the token layer hands to the component sessions

These are accessibility decisions the contrast contract records but a _token_ can't
enforce — they land when the component is built. Full detail in
[docs/accessibility.md](docs/accessibility.md).

- **Dark-mode elevation is a border, not a shadow.** In dark, `surface-base/raised/
overlay` all resolve to `#1F1F1F`, and the elevation shadow over it is imperceptible
  (`elevation-4` ≈ 1.05:1). **Dialog/popover must carry a visible border in dark** —
  nothing else separates an elevated surface from the page.
- **Focus-ring visibility (Input).** The brand cyan ring is below SC 1.4.11 on white
  (≤2.12:1). Input completes focus with a neutral offset/halo, not the cyan alone.
- **Non-text border contrast (Input).** `line-subtle`/`line-default`/`line-danger`
  are below 3:1 on white; the field must be identifiable by more than its border (label,
  fill, focus), verified in the component's own tests.
- **Ghost/link button labels use a neutral foreground**, not `content-accent` — cyan fails
  AA on white (2.12) and on `accent-subtle` (2.02). Cyan is for links and non-text accent.
  Revisit with the component in front of us when Button is built.
