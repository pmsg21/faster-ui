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
  `src/styles/tokens.css`, and **immutable across modes** (a ramp is a fact). Never
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
`src/styles/tokens.css`, which `src/styles/index.css` imports after `tailwindcss`.
`index.css` is the **development** entry (Storybook, Jest, Cypress); `tokens.css`
alone is what ships as `dist/styles.css`, because a consuming app runs its own
`@import 'tailwindcss'` and our `@source` globs are ours, not theirs. Use `@theme`,
**never `@theme inline`**: inline bakes values at build time and freezes
`bg-surface-base` at its light value under `[data-theme='dark']`.

**A variant matrix is not the whole specification.** Extraction is exhaustive **per
component**, and it fails in two shapes — both of which report success:

1. **Read the page's text nodes, not only its component sets.** Capabilities live in
   section prose, in instance overrides, and in documentation frames carrying no
   variant property at all. `IconButton`'s round/square `Fillet` was three section
   descriptions and zero variant properties; the Overview page's section definitions
   were the same shape.
2. **A component that composes another does not inherit its specification.**
   `IconButton` composes `Button`, so its outline colours were taken as given — and
   they are different: the icon sets keep a neutral rim in every state and wash the
   fill, where the labelled button turns its border cyan. **Shared implementation is
   not shared specification.** Extract the sibling's own nodes, even when the code
   will legitimately share a code path.

Both happened on one component in one session, which is the argument for extracting
exhaustively rather than reasoning from a sibling. It is also the same shape as the
gate failures below: a source that looks fully read because the part that _was_ read
is complete. Full record in [docs/decisions.md](docs/decisions.md).

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
- **No unannotated call expression at module scope.** Every component is
  `export const X = /* @__PURE__ */ forwardRef(…)` — and so is **every `cva(…)`**, for
  exactly the same reason: a bundler cannot prove a call is side-effect-free, so it keeps
  the binding and everything it references. `sideEffects` in `package.json` does not cover
  it, because that governs whole modules and the published bundle is one flat file.

  This bullet used to name only `forwardRef`, and that was too narrow — `buttonVariants`
  and `inputVariants` had been leaking since they shipped. Measured when `Dialog` landed:
  a `{ Button }`-only import grew **440 bytes** the moment Dialog joined the barrel,
  despite Dialog importing nothing from it; annotating the `cva` calls took Button-only to
  **9.49 kB**, below its own long-standing baseline. Watch for the quieter form too —
  `[ … ].join(',')` is a call, and cost 100 bytes of retained module. See
  [docs/decisions.md](docs/decisions.md).

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
- **Every document that describes the project's _state_ is updated by the work that
  changes it** — not afterwards, not at the start of the next session. That means
  `CLAUDE.md`, the **README**, [docs/release-verification.md](docs/release-verification.md),
  and any current-state section anywhere else. The entry describing a thing changes in the
  same PR as the thing, and "update the docs" is never a follow-up task.

  This has now failed three times in three sessions, which makes it a property of how this
  work goes rather than three lapses. `CLAUDE.md` described an empty `src/index.ts` and a
  withdrawn `./styles.css` export after `Button` merged. `release-verification.md` recorded
  `0.0.1` and silently skipped `0.1.0`. The README announced "tokens and `Button`
  implemented" while `0.2.0` shipped `Input`.

  **The README is the one that cannot wait, and it is worth knowing why.** A stale
  `CLAUDE.md` costs one message to correct once someone notices. A stale README is wrong
  **on npmjs.com, publicly, until the next publish** — the same failure with a much longer
  blast radius and an audience who cannot correct it. So its state description is verified
  _before_ a version is published, which is now step 3 of the release process in the README
  itself. A handoff document that lags reality is not documentation; it is fiction with
  authority, and a package page that lags reality is fiction with a URL.

- **A component is hand-tested before its PR opens.** Commit freely on the branch —
  granular history is wanted — but when the component, its tests and its stories are
  done, **stop and say it's ready**, then wait. The maintainer runs Storybook, works
  it by keyboard, checks both theme modes and reads the Design Fidelity story before
  a PR exists. Everything a gate proves is _measurable_ — ratios, ΔE, computed boxes,
  test results. None of it catches whether the thing **feels** right: whether a focus
  ring reads at 2px offset on a cyan fill, whether a spinner is legible at `sm`,
  whether disabled looks disabled rather than broken. That needs eyes and a keyboard,
  and it is far cheaper before a PR than after. **Open Storybook's Accessibility panel on
  every story while you are there** — a Serious `color-contrast` violation sat in it on
  `Button`'s danger stories from the day they shipped, through a full hand-test pass,
  because the CI gate was satisfied by a declared exemption and the panel was reporting
  honestly to nobody (see [docs/decisions.md](docs/decisions.md)).
- **An inapplicable rule and an accepted exemption are not written the same way.** Both
  would be `{ enabled: false }`, which is what makes an accessibility decision look like
  configuration. [`a11y.config.ts`](a11y.config.ts) is the single source for both runners:
  page-structure rules are off **once, globally**, with a stated test for what qualifies;
  a contrast exemption is reachable only through a helper that **requires** the measured
  ratio, the `design-fidelity.md` row and the reason, and it **narrows** the rule by
  selector rather than disabling it — so a _different_ contrast failure in the same story
  is still caught. Proven by provocation, both directions.

## Where the detail lives

- [docs/decisions.md](docs/decisions.md) — the "why" record (pnpm vs npm CLI,
  `@theme` vs `inline`, Cypress's own TS program, two `tsc -p`, `pre-push` scope).
- [docs/patterns.md](docs/patterns.md) — the working detail extracted from what was
  actually built: the guardrail principle, **the two component shapes**, how many variant
  axes a component gets, the `cva`-in-its-own-file rule, native attribute-name collisions,
  the two-audience vocabulary rule, deliberate omissions, sizing guidance, and the testing
  patterns (Jest/Cypress split, the hover-transition false-green, real keyboard events,
  harness sanity checks, and the three kinds of axe configuration).
- [docs/design-fidelity.md](docs/design-fidelity.md) — every place a shipped
  component differs from the Figma file, each with its measured ratio and criterion,
  split per component as well as listed in full. A row is a **decision**, not an
  occurrence: a component re-applying an earlier decision extends that row rather
  than minting a new one.
- [docs/tokens.md](docs/tokens.md) — the naming scheme, layer rules, and the
  primitive→semantic map (light and dark).
- [docs/accessibility.md](docs/accessibility.md) — the contrast record: the
  dark-on-cyan decision, the accepted brand conflicts, and the CI contract.

## Current state

- **Done — scaffold and CI/CD complete on `main`.** `ci.yml` runs **three jobs**
  covering every step the brief mandates: _quality_ (install, format check, lint,
  two-program typecheck, Jest + coverage), _component-tests_ (Cypress, with the binary
  cached and `cypress install` run explicitly), and _build_ (library build, Storybook
  build, `size-limit` budget). `release.yml` adds the npm publish and the Pages
  deploy. Each gate is proven by a provoked failure, not an observed pass; three husky
  hooks proven. The release pipeline is proven end to end via **OIDC trusted
  publishing** (no `NPM_TOKEN`) with a signed **provenance attestation**. Artifacts and
  links are in [docs/release-verification.md](docs/release-verification.md).
- **Done — the token layer (merged via #8).** Primitives (8 ramps ×
  8 + black/white, the type scale, the four elevation shadows) in `:root`; semantic
  `@theme` tokens for the intents Button/Input/Dialog consume (neutral, `accent`,
  danger); dark mode as a semantic re-map. `warning`/`success`/`info`/`auxiliary` are
  primitives-only until a component needs them. Accessibility is enforced by an
  automated **contrast contract** (`src/styles/contrast-contract.ts`) that fails CI on
  a contrast regression _or_ an undeclared token — both proven by provoked failures.
  The primary button ships **dark text on cyan** (white fails AA at every ramp step);
  full record in [docs/accessibility.md](docs/accessibility.md).
- **Done — `Button` and `IconButton` (merged via #9), released as
  `@pmsg21/faster-ui@0.1.0`.** Both consume semantic tokens only. Shipping them
  discharged three things this section used to list as pending: `src/index.ts` exports
  a real surface, the `./styles.css` export is restored and the build emits CSS, and
  the hardcoded-colour lint gate is live in `eslint.config.js` (with three exemptions
  — `src/styles/**`, `*.stories.tsx`, and the test files; see
  [docs/decisions.md](docs/decisions.md)). Seven design-fidelity divergences recorded.
  Two defects that every gate passed were found by hand-testing — the missing `Fillet`
  capability and an inherited-but-wrong `outline` interaction model.
- **Done — `Input` (merged via #11), released as `@pmsg21/faster-ui@0.2.0` — the current
  published version.** Seven Figma component sets and 237 components reduced to **one**
  public axis (`size`): `State`, `Typing`, `Text Entered` and `State 2` are all runtime.
  `label` is required so a nameless field cannot compile; `disabled` uses the **native**
  attribute, deliberately unlike `Button`, because under `aria-disabled` the value still
  submits. The clear control is the library's only nested interactive control. The `Number`
  stepper and the filled prefix/suffix **addon segments** are extracted and specified but
  deliberately not shipped — recorded in [docs/decisions.md](docs/decisions.md) so the
  omission reads as a decision, not a gap. Three new fidelity rows (8–10), taking the
  register to ten.
- **Tree-shaking was broken, fixed, and then found to be still half-broken.** The first
  fix annotated `forwardRef(…)`; `Dialog` showed that `cva(…)` needed it too, and that
  `buttonVariants` / `inputVariants` had been leaking since they shipped. Both rounds were
  caught by the `size-limit` budget and neither by review. Current: full library
  **11.78 kB** brotli, `{ Button }` **9.53 kB**, `{ Dialog }` **10.07 kB**, stylesheet
  **5.73 kB**. A 40-byte residual on Button-only is measured but unattributed — recorded
  rather than rounded away, since the original defect hid behind "140 bytes is noise". Any new component must annotate _every_ module-scope call or it silently
  reintroduces the defect.
- **Done — `Dialog` (on `feat/dialog`, not yet released).** Built on the native
  `<dialog>` + `showModal()`, so focus trapping, focus restoration, Escape, top-layer
  stacking and background inertness come from the platform; a headless dependency would
  have roughly tripled the package. Four Figma frames reduce to **one presentation axis**
  (`size`, which changes the **width only** — 400/600/900), one semantic axis (`tone`,
  where `warning` means `role="alertdialog"`), and one boolean (`dividers`, which
  re-spaces the dialog rather than adding rules). `Scrollable` is **not API at all**: its
  own prose is conditional, so it is a `max-height` plus `overflow-y: auto`. The scrim is
  a real element inside a transparent full-viewport shell rather than `::backdrop`, which
  is two years younger than `showModal()`. **Zero new fidelity rows** (7 / 0 / 3 / 0).
  The dark-elevation obligation is discharged and now machine-enforced.

## Known gaps / state to remember

- `src/index.test.ts` pins the public surface with an exact-match array, so **adding a
  component means updating that array or the suite goes red**. That is deliberate: it
  makes an accidental export — or an accidental _omission_ — impossible to merge
  quietly. `index.cy.tsx` is the browser-side counterpart.
- `collectCoverageFrom` excludes `*.cy.tsx`; the `coverageThreshold` (branches 80,
  functions/lines/statements 85) is live. `index.ts` is excluded from collection, so
  the barrel never dilutes the numbers.
- CI caches the Cypress binary at `~/.cache/Cypress` and runs `cypress install`
  explicitly, because a warm pnpm cache skips the postinstall that downloads it.
- Cypress 13 warns React 19 / Vite 6 aren't officially supported (works; a Cypress
  15 bump clears it) — deferred.
- **jsdom cannot see anything modal about `Dialog`, and `jest.setup.ts` shims around it.**
  `jest-environment-jsdom@29` resolves **jsdom 20.0.3**, where `showModal`/`close` are
  `undefined`. The shim toggles `open` and dispatches `close` — enough to mount, nothing
  more. State the gap as what is _not_ proven rather than as where coverage went:
  **jsdom cannot distinguish `showModal()` from `<dialog open>`, so Jest asserts nothing
  about modality, background inertness, Escape, focus movement, focus restoration or
  `::backdrop`.** Those live in `Dialog.cy.tsx`, which opens by asserting `showModal` is
  native and that the element matches `:modal` — a check proven by installing the shim in
  the browser and watching it go red.

  Worth recording as a **fourth instance of the state-describing rule, this time in code
  rather than in Markdown**: the shim was committed by an earlier session and documented
  nowhere, so a passing Jest suite read as covering modality. The previous three lapses
  were all documents, which is presumably why nobody thought to look in `jest.setup.ts`.

- **jsdom has no `ResizeObserver` either, and `jest.setup.ts` stubs it to a no-op.**
  `Dialog` uses one to decide whether its body has become a scrolling region and therefore
  needs a tab stop. The stub never fires, deliberately: jsdom performs no layout, so
  `scrollHeight` and `clientHeight` are both `0` and no measurement here could be true.
  **Jest therefore asserts nothing about the body's tab stop in either direction**;
  `Dialog.cy.tsx` covers both. It is a stub rather than a `typeof` guard inside the
  component because the browser baseline (Safari 15.4) has had `ResizeObserver` since
  Safari 13.1 — a guard would exist only to serve the test environment, which is how a
  test concern becomes a consumer's runtime branch.
- **Focus-trap wrap-around is not asserted, and cannot be here.** A Cypress component test
  mounts into an iframe, and `showModal()` makes only its **own** document inert — so Tab
  past the last stop in the ring leaves the frame and the AUT's `activeElement` becomes
  `<body>`. Measured: from the close control, Tab reaches the body link, then Confirm,
  then `<BODY>`. The spec therefore traverses the dialog's own stops and stops one short
  of the end. The claim is true in a real top-level document; the harness cannot express
  it. What _is_ asserted is the failure that actually happens in the wild — the background
  refusing focus — and that one does fail against a non-modal dialog.
- **No visual-regression coverage — acknowledged, not built.** The contrast contract
  catches a token change that degrades _accessibility_; nothing catches one that
  merely makes a component **look** different. And the culprit is usually a primitive
  three levels below the component being edited, so the diff that breaks a button is
  rarely in the button. At three components that is eye-checkable; at thirty it is
  not. Chromatic against the Storybook build CI already produces is the natural fit.
  Whether it lands depends on time remaining after Dialog.
- **The no-preflight verification covered Chromium only.** `dist/styles.css` ships
  without Tailwind's preflight, and a consumer-shaped page confirmed the controls
  hold their geometry, font, margins and line-height without it — but in one
  engine. Safari and Firefox user-agent sheets differ on form-control margins, so
  the claim is narrower than "verified in browsers". `box-border` is set explicitly
  by the component for the same reason; the rest is still borrowed from the UA sheet.
- **The painted placeholder colour is not verified end to end.** Every other token claim is
  proven from a real painted pixel in Cypress; this one is proven in two weaker halves —
  the control carries `placeholder:text-content-secondary`, and `--color-content-secondary`
  resolves to `#4b4b4b`. The reason is the instrument, not the component: Chrome's
  `getComputedStyle(element, '::placeholder')` returns the **originating element's** colour
  rather than the pseudo-element's cascade, so the painted placeholder cannot be read from a
  component test. The emitted rule is correct and was checked by hand in the compiled CSS.
  Visual regression is what closes this properly.
- **Every GitHub Action in both workflows targets Node 20, which is deprecated.** Runs
  currently succeed with an annotation — GitHub is forcing them onto Node 24 — and that
  becomes a hard failure when the fallback is withdrawn. Affected:
  `actions/checkout@v4`, `actions/setup-node@v4`, `pnpm/action-setup@v4`,
  `actions/configure-pages@v5`, `actions/deploy-pages@v4`, `actions/upload-artifact@v4`.
  **This predates `Input` and is unrelated to any component work**, so it belongs in its own
  `chore:` PR bumping the action majors — not folded into a component branch. Written down
  because the failure mode is time: if the repository sits for a few weeks, a green pipeline
  turns red on its own and the next session has no way to know it was seen coming.

  **The same `chore:` PR should carry two more known-behind versions**, both recorded as
  positions rather than problems: **Cypress 13 → 15** (clears the React 19 / Vite 6
  warning) and **Jest 29 → 30**, which brings jsdom 26 and therefore a real `<dialog>`.
  Note what the jsdom bump would and would not buy: it removes the shim, but jsdom still
  does not paint, has no top layer and has no browser focus model, so the modality
  assertions stay in Cypress regardless. It is worth doing to delete a stub, not to move
  coverage.

- **One axe engine, held there by a `pnpm.overrides` entry.** `jest-axe`, `cypress-axe` and
  `@storybook/addon-a11y` all resolve `axe-core@4.13.0`. They did not: the addon declares
  its own `^4.2.0` and had drifted a minor ahead of the gates, so the panel a reviewer reads
  and the check that blocks a merge were different engines. **Bumping `@storybook/addon-a11y`
  will not re-split them, but removing the override would** — and nothing fails loudly if it
  does, which is the shape worth remembering.
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

- **Dark-mode elevation is a border, not a shadow** — _discharged by `Dialog`_, and the
  original wording was a level too abstract. In dark, `surface-base/raised/overlay` all
  resolve to `#1F1F1F` and `elevation-4` over it measures **1.045:1** (recomputed, not
  inherited), so nothing but a border separates an elevated surface from the page. What the
  entry did not say is **which** border, and that turns out to be the whole decision:

  | Candidate for the dialog edge | dark value  | on `#1F1F1F` |
  | ----------------------------- | ----------- | ------------ |
  | `line-subtle`                 | neutral-600 | **1.89** ❌  |
  | `line-overlay` (added)        | neutral-500 | **5.03** ✅  |

  Because this border _is_ the boundary, SC 1.4.11 applies and 1.89 fails outright. A new
  semantic token carries it: `line-overlay`, white in light (invisible on the white card,
  exactly as Figma draws, so light mode gains no divergence) and neutral-500 in dark. It is
  paired in the contrast contract with **`require` in dark** — the one border in the system
  that may not rest on an exemption — so re-pointing it fails CI instead of quietly
  un-discharging the obligation. Proven by provocation: it reports
  `line-overlay on surface-base [dark]: requires UI (3:1), got 1.89:1`.

  Same correction `line-danger` got during `Input`, in the same shape: **an obligation
  stated one level too abstract sends the next session looking for the wrong thing.**

- **Focus-ring visibility (Input)** — _discharged by `Input`._ The brand cyan ring is below
  SC 1.4.11 on white (≤2.12:1). A focused field carries **both**: `line-focus` (cyan) on the
  inner border, which is what the design draws, and `focus-strong` (neutral, 2px at 2px
  offset) as the indicator that actually satisfies the criterion. The design's other
  affordance — a 16%-alpha cyan halo — is not shipped, and its token was removed.
- **Non-text border contrast (Input) — _discharged by `Input`_, and narrower than first
  written.** The earlier
  version of this entry said `line-subtle`, `line-default` _and_ `line-danger` all
  measure below 3:1 on white. Measured from the shipped tokens, that is wrong for the
  third:

  | Border token                 | on white (light) | on `#1F1F1F` (dark) |
  | ---------------------------- | ---------------- | ------------------- |
  | `line-subtle` (neutral-300)  | **1.31** ❌      | **1.89** ❌         |
  | `line-default` (neutral-400) | **1.64** ❌      | 5.03 ✅             |
  | `line-danger` (danger-600)   | **3.47** ✅      | 5.53 ✅             |

  `line-danger` clears SC 1.4.11 in both modes — it is the same 3.47 already recorded
  in [docs/design-fidelity.md](docs/design-fidelity.md) as white-on-danger-600. So the
  obligation is real but applies to the **resting and hover** states only: an _error_
  field is identifiable by its border alone, a resting one is not. The mitigation
  (required visible label, fill, focus treatment) therefore has to carry default and
  hover, and is verified in the component's own tests. A known-gap that overstates its
  scope misdirects the work as surely as one that misses.

  How it was discharged: `label` is a **required** prop, so a field is always identifiable by
  something other than its box, and a nameless one does not compile.

- **Ghost/link button labels use a neutral foreground** — _discharged by `Button`._ Cyan
  fails AA on white (2.12), so non-solid labels ship `content-secondary` darkening to
  `content-primary`. The token this bullet originally cited, `accent-subtle`, no longer
  exists: extracting `Button` proved the accent ghost wash is neutral, leaving it with no
  consumer, and it was removed as the deprecation policy's first (free) application.
