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

**The argument has now demonstrated itself three times in this repository**, which
is worth recording as a count rather than as three separate footnotes — the point
is the rate, not any single instance.

| Package            | Reached us as                        | What broke without the declaration                                                |
| ------------------ | ------------------------------------ | --------------------------------------------------------------------------------- |
| `@storybook/react` | transitive of the Storybook scaffold | the framework import in `.storybook`                                              |
| `axe-core`         | **peer** of `cypress-axe`            | `cy.injectAxe()` — every browser a11y assertion was erroring rather than checking |
| `@storybook/test`  | transitive of `addon-interactions`   | `fn()` in a story file                                                            |

Each would have "worked" under npm's flat hoisting and surfaced later — for a
library, in a consumer's install, where the cost is someone else's broken build.
`axe-core` is the sharpest of the three: it did not fail loudly, it failed as a
gate that stopped checking.

Note also the version pins that follow from this. The earlier wording here said `axe-core`
"matches what `jest-axe` resolves … so **both test runners** measure with the same engine."
That was true of Jest and Cypress and **never true of Storybook**, whose a11y addon declares
its own `^4.2.0` and resolved a different minor entirely. The sentence described a guarantee
narrower than it claimed, which is the failure mode this whole document keeps recording.

What is guaranteed now is stated as a mechanism rather than a coincidence of resolution: a
`pnpm.overrides` entry pins **`axe-core` to one version for every consumer** — `jest-axe`,
`cypress-axe` and `@storybook/addon-a11y` alike. `@storybook/test` still matches what
`addon-interactions` resolves, which is a separate pair and unaffected.

## Distribution: a stylesheet import, because the package has no runtime

Consumers write one line, `import '@pmsg21/faster-ui/styles.css'`, and that line is not
a shortcoming to apologise for — it is the only alternative to shipping a runtime.

**npm has no mechanism for applying CSS.** Installing a package puts files in
`node_modules`; something has to tell the bundler they exist. Either the consumer
imports the stylesheet, or the library injects styles from JavaScript at runtime. There
is no third option. This is the standard for libraries that avoid CSS-in-JS — Mantine
documents `import '@mantine/core/styles.css'` as required for all packages, with its
CSS-module styles bundled before publishing.

The rejected alternative is injecting a `<style>` tag on mount, and it fails on three
counts that matter to the kind of product this system is for:

- **FOUC under SSR.** HTML arrives before JavaScript, so controls render unstyled until
  hydration. On an eCommerce page that is layout shift — a Core Web Vitals cost paid on
  every first visit.
- **Content Security Policy.** Many organisations prohibit inline styles outright. The
  package would simply not work there, and nothing in its API would explain why.
- **The consumer loses control of the cascade.** Import order is significant — Mantine
  documents that its styles must be imported before the consumer's or they override
  them. With JS injection the styles land whenever a component happens to mount, and no
  amount of care in the consumer's stylesheet can reliably win.

**The CSS import is the price of having no runtime.** We chose a package that does not
execute JavaScript to paint, and the consumer writes one line in exchange for SSR
without flash, CSP compatibility, and control over the cascade.

Two consequences of that choice are recorded where they bite. The stylesheet is compiled
from `dist/index.js` rather than from `src`, so stories and test fixtures cannot leak
utilities into a consumer's CSS. And it ships **without preflight**: a reset is an
opinion about the document, and the document is not ours — installing four components
must not restyle a consumer's headings, lists and forms. The components therefore set
what they depend on rather than inheriting it, which is why `box-border` is declared
explicitly even though every browser already gives form controls border-box.

## The bundle is dominated by `tailwind-merge`, and that is the deal we took

Measured, not assumed:

| Entry                    | Brotli   |
| ------------------------ | -------- |
| Full library (ESM)       | 11.78 kB |
| `import { Button }` only | 9.53 kB  |
| `import { Dialog }` only | 10.07 kB |
| Stylesheet               | 5.73 kB  |

Two things fall out of that, and both are worth saying plainly rather than presenting
11.78 kB as a win.

**Tree-shaking works — but it did not, and the budget is what caught it.** An earlier
version of this section claimed tree-shaking worked on the evidence that "dropping
`IconButton` saves 140 bytes." That number was real and the conclusion drawn from it was
wrong. When `Input` landed, the `import { Button }` entry jumped from 9.27 kB to 10.30 kB
and blew its budget — almost exactly the amount `Input` had added to the _full_ bundle.
Probing each export in turn showed every single-component import sitting within 200 bytes
of the whole library: **nothing was being dropped, and the 140 bytes had been noise.**

The cause is a call expression at module scope. `export const Button = forwardRef(…)` is a
function call, and a bundler cannot prove a call is side-effect-free, so it is retained —
and retaining it retains everything it references, which is the entire component and its
`cva` matrix. `sideEffects` in `package.json` does not help, because that governs whole
_modules_ and the published bundle is one flat file. Annotating each component
`/* @__PURE__ */ forwardRef(…)` gives the bundler the permission it cannot infer, and the
numbers above are the result: a consumer importing one component now pays for one
component.

Worth keeping for its shape rather than its bytes. This is the "green gate that never ran
its subject" failure one more time, in its most deceptive form yet — the gate _did_ run,
it reported a real measurement, and the measurement was of nothing. A 140-byte delta looks
like a small saving; it was actually the absence of any saving at all. **A number being
real does not make the inference from it real**, and the only reason it surfaced is that
the budget was written as a hard threshold rather than a tracked figure.

### The same defect, one layer down: `cva(…)` is also a call at module scope

Adding `Dialog` blew the budget again, and the cause was the sentence above read too
narrowly. `/* @__PURE__ */` had been applied to `forwardRef(…)` and nowhere else — but
`export const buttonVariants = cva(…)` is _also_ a call expression at module scope, and a
bundler can no more prove that one pure than the other.

Measured by the budget, not noticed by review:

| Entry        | Dialog added, unannotated | `FOCUSABLE_SELECTOR` literal | all `cva` annotated |
| ------------ | ------------------------- | ---------------------------- | ------------------- |
| `{ Button }` | 10.03 kB                  | 9.93 kB                      | **9.49 kB**         |
| `{ Dialog }` | 10.64 kB                  | 10.58 kB                     | **9.98 kB**         |
| Full library | 11.65 kB                  | 11.67 kB                     | 11.67 kB            |

Two things worth keeping. The first is that a Button-only import grew by **440 bytes the
moment Dialog joined the barrel**, despite Dialog importing nothing from Button — which is
the only reason any of this surfaced. The second is that `buttonVariants` and
`inputVariants` had been leaking the same way **since they shipped**; the numbers above
show a Button-only import falling below its own long-standing baseline once they were
annotated. The defect was never Dialog's. Dialog just made it big enough to cross a
threshold.

A third instance turned up in the same pass and is worth naming because it looks harmless:
`const FOCUSABLE_SELECTOR = [ … ].join(',')`. An array `.join` reads better than a long
literal and costs 100 bytes of retained module, for exactly the same reason — `.join` is a
call, and a call cannot be proven pure.

So the rule in [CLAUDE.md](../CLAUDE.md) is broader than it was written: **no unannotated
call expression at module scope**, not merely `forwardRef`. And the reason the rule can be
stated at all is that the budget is a hard threshold rather than a tracked figure — a
tracked figure would have drifted upward four times now without anyone objecting.

**Almost all of it is one dependency.** `tailwind-merge` is ~14.6 kB brotli on its own
(unminified); `clsx` is 0.2 kB and `cva` 0.9 kB. Our four components are a rounding error
on top of it — which is also why the shaking defect above hid for so long: when the floor
is ~9.4 kB, a component failing to drop moves the total by a few percent. So the honest
framing is that this package's floor is the cost of `cn()`, not the cost of the components.

We keep it, because what it buys is a stated rule rather than a convenience: **a
consumer's `className` wins.** Without conflict-aware merging, `<Button
className="rounded-full">` emits two competing rules and stylesheet order decides — the
kind of bug a consumer cannot fix from their own code. It also underpins the Design
Fidelity stories, which render the Figma-faithful variants through `className` alone
rather than through escape-hatch props. Both were live defects before the merger was
taught our token scales (see `src/lib/cn.ts`), so this is not a hypothetical.

Worth revisiting if the component count grows without the dependency's share falling —
at thirty components it is negligible; at three it is the whole bundle.

## Design tokens: `@theme`, not `@theme inline`

Tokens are defined in Tailwind v4's `@theme` block in `src/styles/tokens.css`.
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

### The gate is not a property of the release PR, and this entry contradicted itself

Discovered at `0.3.0`, the first release where two obligations in this repository were both
exercised. **They cannot both be satisfied.**

- This entry says: keep the manual approval on the Version Packages PR.
- The working agreement says: verify the README's state description **before** publishing —
  step 3 of the release process, added during `Input` because a stale README is wrong
  publicly on npmjs.com until the next publish.

Satisfying the second means pushing a README commit onto `changeset-release/main`. Doing so
makes the **head commit human-authored**, and GitHub's gate applies to bot-authored PRs —
so the approval requirement silently disappears and the checks start immediately. That is
exactly what happened here: the maintainer intended to click "Approve and run" and never got
the chance.

**This is a different failure class from the seven counted above**, and worth separating.
Every one of those was a verification that did not reach its subject, or reached the wrong
one — something measured wrongly. Here nothing was measured at all. The control was
correctly described, correctly relied upon, and **silently removable by an unrelated
action**. The mechanism simply was not what the document said it was: the gate keys on
authorship of the head commit, not on the PR being a release.

A decision record containing a contradiction it cannot see is worth more as a finding than
as a warning, so it is recorded as one rather than patched quietly.

**What to do about it.** Two defensible options; the second is what ships today.

1. **Verify the README on the feature branch, before the changeset lands.** The release
   branch then never needs a human commit and the gate survives intact. The cost is that
   the README must describe a version that does not exist yet, which is its own small lie
   and has to be worded carefully ("ships in the next release").
2. **Accept that a README fix removes the gate, and say so.** The push is deliberate and
   rare, the maintainer is already at the keyboard, and the checkpoint can be exercised by
   choosing when to merge rather than by clicking "Approve and run" — which is what
   happened at `0.3.0`, deliberately, once the removal was reported.

Option 2 is chosen because the gate's _purpose_ is a human checkpoint immediately before a
version reaches consumers, and merging is that checkpoint. What was unacceptable was not
the missing click but that it went missing **without anyone noticing** — the fix is that the
next person reading this entry knows the cost of that push before they make it.

If a future release wants the click back, push the README fix to the feature branch instead.

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

## A gate can be green because it never ran the thing it gates

**Seven times now**, a check has reported success while never executing its subject. The
count is the point — one is bad luck, three is a pattern, seven is a property of how gates
fail in general — so it is maintained rather than left as a list of anecdotes. Add to it
when it happens again.

1. **The Cypress binary.** It lives in `~/.cache/Cypress`, outside the pnpm store, so a
   warm cache skipped the postinstall that downloads it. The job succeeded because
   there was nothing to run.
2. **The `.storybook` files.** They sat outside the TypeScript project, so `tsc`
   type-checked everything except the configuration most likely to drift.
3. **Cypress and React 19.** Cypress 13's `cypress/react` mounts through the legacy
   `ReactDOM.render`, which React 19 removed. It does not throw — it renders nothing
   and leaves an empty application frame. The component-test gate had been green since
   the beginning because the only spec imported the barrel and asserted on its exports;
   it never mounted a component. `CLAUDE.md` recorded that React 19 "works" with
   Cypress 13, and that sentence rested entirely on a spec that never exercised the
   thing it claimed worked. Fixed by mounting through `cypress/react18`, which uses
   `createRoot` — still React 19's API — until the Cypress 15 bump.
4. **The 140-byte tree-shaking measurement.** The most deceptive of the seven, because the
   gate _did_ run and reported a real number — of nothing. See the bundle section above.
5. **`/* @__PURE__ */` on `forwardRef` but not on `cva`.** The budget was watching, and
   the annotation had gone to the pattern that was noticed rather than the pattern that
   was the problem. `buttonVariants` and `inputVariants` leaked from the day they shipped.
6. **The inertness spec that passed against a stub.** It asserted that a point over a
   background button hit the scrim, which is equally true of a non-modal dialog whose
   scrim covers the page. Found by provoking the harness check and then reading which
   specs survived — see [patterns.md](patterns.md).
7. **Every axe spec used short content.** `Dialog`'s accessibility specs never rendered a
   body long enough to scroll, so `scrollable-region-focusable` — a **serious** violation,
   present from the first commit — was never evaluated. The rule was enabled, the runner
   ran, the subject was absent. Writing one spec with forty paragraphs surfaced it
   immediately.

The shared shape: **passing and covering are different claims, and a green tick cannot
tell them apart.** "A gate that has never failed is unproven" catches a check whose
assertion is too weak; this is the failure one step earlier, where the assertion never
reached its subject at all. Provoking a failure is still the test — but the thing to
provoke is _the subject running_, not just the rule firing. In practice: look at what
the gate actually executed. A spec count, an emitted artefact, a log line. Exit code
zero is the weakest evidence a gate produces.

## The pnpm argument, demonstrating itself

`cypress-axe` declares `axe-core` as a peer dependency. We never declared it, and pnpm's
non-flat `node_modules` does not hoist it, so `cy.injectAxe()` failed to read
`node_modules/axe-core/axe.min.js` — every accessibility assertion in the browser was
erroring rather than checking anything.

This is precisely the phantom dependency the README cites as the reason for choosing
pnpm, occurring in this repository. Under npm's flat hoisting it would have "worked"
silently, and the missing declaration would have surfaced later — in a consumer's
install, where the cost is someone else's broken build. The fix is the one the argument
predicts: declare what you import. `axe-core` is now an explicit devDependency, pinned
to the version `jest-axe` already resolved, so both test runners measure with the same
engine.

## The specification is not only the variant matrix — and hand-testing is what found that

`IconButton` shipped without its `Fillet` capability: the design lets an icon button be
round **or** square, and only the round form existed.

The extraction was not sloppy in the way that sounds. The component set genuinely has no
`Fillet` variant property — its matrix is 3 sizes × 4 states = 12, exactly as transcribed,
and every value in it was correct. The capability lives somewhere a variant-focused
extraction never looks: three `.Section Header` descriptions (`15:20248`, `15:20475`,
`15:20702`, one per variant) stating "Only the icon button can be set to a round button",
demonstrated by two instances of the _same_ component with the corner radius overridden on
the instance. Nothing in the component set hints that the override is meaningful.

That is the third instance of one failure mode: **reading what the component declares
rather than what the design says.** The Overview page's section definitions were the
first, this is the second and third. It is also the same shape as the gate failures
recorded above — a source that appears fully read because the part that was read is
complete. The rule it produced is in [CLAUDE.md](../CLAUDE.md): read the page's text
nodes, not only its component sets.

Two things worth keeping about the fix. It needed **no new tokens** — round is
`radius-full`, square is `radius-control`, the same radius Button already uses, which is
some evidence that `radius-control` was named for the right thing. And it is **not** a
design-fidelity divergence: implementing a capability the design documents is fidelity,
so the register stays at seven.

### The second shape: composing a component is not inheriting its specification

The same component produced a second instance the same day, in a different shape.
`IconButton` composes `Button`, so its `outline` colours were taken as given. They are
not the same: the icon sets (`15:20596` / `20590` / `20584` / `20578`) keep a neutral
`line-subtle` rim in **every** state and wash the fill like a ghost button, where the
labelled outline turns its border cyan and leaves the fill alone. Primary matched;
outline did not; nothing in the code looked wrong, because sharing the code path is
exactly what the composition is _for_.

So the rule has two halves, and the second is: **shared implementation is not shared
specification.** Extract the sibling's own nodes even when the components will
legitimately share a code path. Two instances on one component in one session is the
argument for extracting exhaustively per component rather than reasoning from a sibling.

## A remedy inherited from another component must be re-justified against that component's source

The sharpest thing the `IconButton` outline fix turned up was not the outline at all.

`Button`'s ghost and outline variants darken their label from `content-secondary` to
`content-primary` on hover and press. That darkening is **ours**, not the design's: it
replaces the cyan hue shift the design uses, which we cannot ship because cyan on white
measures 1.88–2.80. It is a remedy with a specific cause.

Through composition it was reaching `IconButton`'s ghost and outline — where the icon
sets never used cyan at all. The remedy was being applied in a context that never had
the problem it exists to solve. Nothing flagged it, because the code was _consistent_:
the same variant, the same class, the same helper. Consistency is what made it invisible.

**A fix carries its reason, and when the reason does not hold the fix is a divergence
with no evidence behind it.** That is how a register of seven considered divergences
quietly becomes a rewrite: not by adding rows deliberately, but by propagating remedies
past the conditions that justified them. So an inherited remedy gets re-checked against
the receiving component's own source before it is allowed to stand.

Here the re-check removed it. `content-secondary` on the two washes measures 8.00 and
6.67, comfortably over AA, so restating the design costs no contrast — the design was
simply right, and we had been overriding it for a reason that did not apply.

**Both were found by hand-testing, not by any gate**, and that closes a loop. The rule
that a component is exercised by hand before its PR opens was justified in the abstract —
some things only surface with eyes and a keyboard. These are the cases that earn it:
**two real defects on the first component**, one missing capability and one wrong
interaction model, while every gate was green (97 unit tests, 43 browser tests, axe in
both modes, a full contrast contract). None could fail, because none knew the capability
existed or that the inherited values were wrong.

The general form is worth stating, because it bounds what testing can do for a design
system: **a test suite asserts that what exists behaves correctly. It cannot assert that
nothing is missing.** Only a person holding the component against its source can see an
absence. What was checked by hand is recorded in
[accessibility.md](accessibility.md#verified-by-hand-because-no-gate-can), because a
manual check nobody wrote down is indistinguishable from one that never happened.

## The hardcoded-colour rule exempts stories, because a coincidence of values is not a shared decision

A raw colour outside the primitive layer fails the build. The Design Fidelity stories
break that rule in exactly one place, and the exemption is narrower than "documentation
is special".

Those rows render the Figma-faithful version beside the shipped one, through the
`className` escape hatch and no public API. That works for every row but one: the danger
ghost pressed surface. The design specifies `danger-300`; we ship `danger-200`. The value
being illustrated is one the token layer **deliberately no longer contains**.

The first attempt reached for `danger-solid-disabled`, a token that happens to resolve to
the same `danger-300`. Two things are wrong with that. It asserts the system contains a
colour when the row exists to say it does not. And it rests on a coincidence: the day
either token is re-pointed, the comparison silently starts illustrating something else,
with no test able to notice — the row would still render, just wrongly.

That shape is already named in this repo. `SHARED_VALUE` in the contrast contract exists
because "these two tokens have the same value" is a claim a comment cannot keep honest,
so it is asserted instead. **A coincidence of values is not a shared decision.** The
difference here is that there is no decision to assert: `danger-solid-disabled` and the
Figma pressed surface have nothing to do with each other beyond a matching hex.

So the faithful side uses a literal, `bg-[#FFCCD2]`, traceable to its source node, and
the lint rule exempts `*.stories.tsx`. The boundary holds because of what a story is: it
consumes components rather than defining them, it never enters the published bundle, and
a fidelity row's entire job is to render values from _outside_ our token layer. A raw
colour in a component is a leak; in a fidelity story it is the subject matter.

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

### The second application is the one that costs something

`focus` (primary-500) was the token reserved for the cyan halo Figma draws under a focused
field — `0 0 1px 1px rgba(21,197,206,.16)`. Extracting `Input` showed we would not ship it:
a 16%-alpha cyan glow beneath a neutral 2px focus ring is invisible to a sighted user and
misleading in the token layer, since it implies the system offers a focus affordance that
nothing consumes. So it goes, the same way `accent-subtle` did.

The difference is that **this one is no longer free**, and that difference is the whole
reason to record it. `accent-subtle` was removed while `./styles.css` was still withdrawn
from the package exports — nothing outside the repo could name it. That export is live as
of `0.1.0`, so `--color-focus` has been in a published stylesheet, and a consumer could be
referencing it today. Removing it silently would be exactly the breakage the policy exists
to prevent.

So the policy's step 2 does real work for the first time: the removal is stated in the
changeset, which carries it into `CHANGELOG.md` and the release notes rather than leaving
it in a commit nobody reads. Steps 1 and 3 do not apply — there is no replacement to
deprecate toward and nothing mechanical to codemod, because the token had no consumer to
migrate. Step 4 is satisfied by the version bump.

Worth naming the general shape: **the cost of removing something is set by what has already
been published, not by how many internal consumers it has.** Both tokens had zero consumers
in this repository. Only one of them was safe to delete quietly, and the thing that
distinguished them was a line in `package.json`.

## The Figma file we extract from is a duplicate, and that is not a mistake

The task brief links `WYuHdUuUq31HzkdJhoKwXl`; every node id in this repository resolves
against `Zz10of3a8j8G9Qki5FAeba`, whose title ends `…Community---Copy-`. The mismatch is
recorded here because it looks exactly like an error and is not one.

The brief's file is a **Community** file, and requesting it through the Figma MCP server
returns _"you don't have edit access to this file"_ — the read paths that expose variant
properties, text nodes and computed styles need editor access. Duplicating it into the
account grants that access without altering anything. So the copy is the working file, and
the node ids in [tokens.md](tokens.md), [design-fidelity.md](design-fidelity.md) and the
component sources are all relative to it.

The reason to write this down is that the alternative is worse than the inconvenience: a
reviewer comparing a cited node id against the brief's URL finds nothing there, and the most
natural conclusion is that the values were transcribed from the wrong source.

## `Number` and the prefix/suffix addon segments are extracted, specified, and not shipped

The Input page carries seven component sets. Three of them — `Number` (`11:9747`) and the
standalone `Prefix` (`11:10945`) / `Suffix` (`11:11523`) — are implemented by nothing, on
purpose.

**They are not what the brief asked for.** It asks for "Input" and enumerates the states
(default, hover, focus, disabled, error), which map one-to-one onto the Figma `State` axis.
Prefix segments and numeric steppers appear nowhere in it. Building them would have added
divergence rows — the stepper's 26×14 controls miss SC 2.5.8 outright — for capability nobody
requested, and the divergence register is only meaningful while it stays proportionate.

**They are also genuinely different components.** This is the part worth keeping:

- `Prefix & Suffix` (`11:10336`) draws affixes **inline and unfilled** — inside the field's
  own padding, transparent, `neutral-500`, 8px from the text, content `¥` / `CNY`.
- `Prefix` (`11:10952`) draws a **filled addon segment** — `neutral-50` fill, its own
  `rounded-l-[3px]` corner, flush against the border at `left-px`, 12px from the text, content
  `http://`. `Suffix` mirrors it.

The +4px set width (194 vs 190) is the tell. These are two treatments for two jobs — units
versus URL fragments — and treating them as one axis with two positions would have shipped the
wrong one. Which is the same lesson `IconButton` produced twice: **a variant matrix is not the
whole specification.** Had `Prefix & Suffix` been read as "`Prefix` plus `Suffix`", the
extraction would have reported complete success.

**What a consumer gets today if they pass `type="number"`.** It works. `Input` spreads every
unrecognised prop onto the control, so the field accepts numeric input and the browser
supplies **its own** spinner. That is worth stating precisely, because "not implemented" and
"implemented differently from the mock" are different claims and a reader could reasonably
infer the wrong one: the _capability_ is there, the _drawn control_ is not.

**Why the stepper is a component and not a prop — the strongest half of the argument.** It is
not extra props on a field. It is two more nested interactive controls, each needing its own
accessible name, its own place in the tab order, and a keyboard contract the field does not
have (<kbd>↑</kbd>/<kbd>↓</kbd>, arguably Page Up/Down and Home/End) — plus `min`/`max`/`step`
clamping.

And it carries a tension nothing else in this project has: **at `sm` the field is 24px tall,
so two stacked stepper buttons cannot both clear the 24×24 of SC 2.5.8 without redrawing the
control.** Every other divergence here was resolvable by the smallest change that clears a
criterion. This one is not resolvable at all at that size — the design and the criterion are
in genuine conflict, and shipping it would mint the register's first row of that kind for
capability the brief never asked for.

That is the `IconButton`-not-`iconOnly` case again, and more sharply. A flag cannot express a
control with its own targets, its own keyboard contract and its own unresolvable geometry.

What follows is that the addon is an **input group** — a layout composing a field with
adjoining content, each with its own surface and border radius — and belongs in its own
component rather than a prop on this one. That is the `IconButton`-not-`iconOnly` argument
again: a flag cannot express the thing that actually differs. There is also no combined addon
set anywhere on the page, so nothing in the source says addons compose the way inline affixes
demonstrably do.

Recorded rather than merely omitted, because "we did not think of it" and "we decided against
it" are indistinguishable in a codebase.

## A Serious violation sat in Storybook's panel for a component and a half

Hand-testing `Input` found a **Serious** `color-contrast` violation on every error story:
`content-danger` on white, 4.21 against the 4.5 AA bar. It is not a defect — it is the
exemption already recorded as row 4 of [design-fidelity.md](design-fidelity.md), pinned by
the contrast contract, and accepted because `danger-700` is the darkest red the ramp offers.

The finding is not the violation. It is that **the same violation had been showing on
`Button`'s danger stories since `Button` shipped**, through a full hand-test pass, and
nobody had looked. Confirmed by provoking it: re-enabling the rule on Button's own spec
reports `color-contrast (serious)` on all three non-solid danger variants. The a11y addon
runs at axe defaults with no parameters anywhere, so the panel had been saying so the whole
time.

Two instruments were each individually fine and collectively silent. The **CI gate** passed
because the exemption was declared, which is what a declared exemption is for. The **panel**
reported it honestly to nobody. Neither was wrong; between them a real number went
unexamined for a component and a half. That is a better argument for opening the panel
routinely as part of hand-testing than any rule could be — and it is why the hand-test list
in [CLAUDE.md](../CLAUDE.md) now names it explicitly.

The remedy was not to disable the rule, which would have made two silences instead of one.
See [patterns.md](patterns.md) on the three kinds of axe configuration and why an
inapplicable rule and an accepted exemption must not be written the same way.

### The runners were on two axe engines, and now they are pinned to one

While auditing the above: `@storybook/addon-a11y` declared `axe-core@^4.2.0` and resolved
**4.13.0**, while `jest-axe` pinned **4.9.1** and Cypress injected
`node_modules/axe-core/axe.min.js` — the same 4.9.1. The panel a maintainer reads and the
gate that blocks a merge were running different engines, and rule sets change between minors.

That splits every accessibility claim in the project in two: what CI verifies, and what a
reviewer sees. The two can disagree, and the disagreement surfaces exactly where it does most
damage — someone opening Storybook and finding something CI called clean. It is the same
shape as the entry above it: **two verifications that look like one.**

Fixed rather than recorded, because it is a `pnpm.overrides` entry and not a redesign:

```json
"pnpm": { "overrides": { "axe-core": "4.13.0" } }
```

All three consumers now resolve 4.13.0, verified down to the version string inside the
`axe.min.js` that Cypress actually injects — the file, not the manifest, because the manifest
is what was lying in the first place.

The direction was deliberate: **move Jest and Cypress up rather than hold Storybook back.**
The newer engine checks more, and pinning to the older one would have traded a real
verification for a quieter one. `jest-axe@9.0.0` pins `axe-core` at exactly `4.9.1` in its own
dependencies, so the override forces it past its declared pin — worth naming as the risk this
carries. It was taken with the whole suite as evidence: 153 Jest tests, 77 Cypress tests, and
**no new violations** on the newer engine. A newer engine finding nothing is a result worth
stating, because the alternative outcome would have been findings rather than obstacles.

## Dialog is built on the native `<dialog>`, not on a dependency and not by hand

Three options, and the deciding question is which list of risks to hold.

**What `showModal()` supplies**, all of it hard to hand-roll correctly: a focus trap that
survives content changing underneath it, focus restoration to whatever was focused
before, Escape, LIFO stacking for nested dialogs, **top-layer rendering** — which escapes
`overflow: hidden`, `transform` and every stacking context, something no portal can fix
for a transformed ancestor — and **background inertness for pointer, keyboard and
assistive technology at once**. That last is the failure the brief calls the most common
modal defect, and one call closes all three routes.

**Rejected: a headless dependency** (`@radix-ui/react-dialog`). Correct and
battle-tested, but it pulls roughly ten internal packages into a library whose entire
published surface is 11.67 kB brotli — and the entry above on `tailwind-merge` already
names dependency share as the thing to watch here. Tripling the package for one component
is the wrong trade at four components.

**Rejected: hand-rolling.** Everything in the first paragraph would be re-implemented, and
the parts that are hardest are exactly the parts that ship silently broken.

It is also the same principle `Button` applied in using a real `<button>` and `Input` in
using the native `disabled` attribute — with far more to buy here. A design system that
reaches for a dependency where the platform already solves the problem is one that
accumulates them.

**The baseline, stated rather than assumed**, because it is the first question a reviewer
should ask: `<dialog>` + `showModal()` is Chrome 37, Edge 79, **Safari 15.4** and
**Firefox 98** — the last two both March 2022.

**And it is not the package's floor**, which is the part worth recording. The PR for this
component originally claimed "no other component in the package has a floor". That was
false, and measuring it produced a better fact than the one it replaced:

| Feature                    | Set by                  | Chrome | Safari   | Firefox |
| -------------------------- | ----------------------- | ------ | -------- | ------- |
| `:has()`                   | `Input`'s focused field | 105    | 15.4     | **121** |
| `:focus-visible`           | every component's ring  | 86     | **15.4** | 85      |
| `<dialog>` + `showModal()` | `Dialog`                | 37     | 15.4     | 98      |

The package floor is **Chrome 105 / Safari 15.4 / Firefox 121**, and `Dialog` is the
**least** binding of the three — its requirement is older than `Input`'s in every engine,
by twenty-one months in Firefox. `Button` set Safari 15.4 with `:focus-visible` in the very
first component. Adding a modal did not raise the floor; it prompted someone to measure one
that had existed, unrecorded, since `Input` shipped.

There is also a **soft** floor nobody chose: Tailwind v4's output carries 59 `@property`
rules (Safari 16.4, Firefox 128), with an `@supports` block declaring the same 24 `--tw-*`
variables for engines that lack them — so it degrades rather than breaks. It is invisible in
every component's source and would never be found by reading the code, which is exactly why
it belongs in a document.

This is the **fifth instance of the state-describing pattern**: a true thing that no document
said. The others were the jsdom shim (in code), the stale `CLAUDE.md` after `Button`, the
README that lagged `Input`, and `release-verification.md` silently skipping `0.1.0`. The
shape repeats often enough that the useful question on any claim is not "is this right?" but
"when was this last measured?"

**What the platform does not supply, and is therefore ours:** page scroll locking (the
background is inert but still scrolls under the wheel), backdrop-click dismissal, and the
initial focus target. The last is a real decision rather than a gap — the close control is
first in DOM order because the design puts it in the title row, and landing a keyboard
user there tells them only how to leave, so the resolver deliberately skips it.

**And one cost accepted rather than solved: there is no exit animation.** `close()` leaves
the top layer immediately, and the modern remedy (`@starting-style` with
`transition-behavior: allow-discrete`) has a 2024 baseline — narrower than the component's
own. The Figma file specifies no motion for Dialog, so this is a recorded omission rather
than a compromise: a hard problem converted into a decision by checking whether anyone
asked for it.

## The scrim is a real element, because `::backdrop` is younger than `<dialog>`

The obvious way to paint a modal backdrop is `dialog::backdrop { background-color:
var(--color-scrim) }` — one rule, no extra DOM. It was the plan, and checking it before
writing any component code is the only reason it is not what shipped.

Two baselines are involved and they are two years apart:

| Feature                                                           | Chrome  | Firefox | Safari   |
| ----------------------------------------------------------------- | ------- | ------- | -------- |
| `<dialog>` + `showModal()`                                        | 37      | **98**  | **15.4** |
| `::backdrop` inherits from its originating element (tree-abiding) | **122** | 120     | **17.4** |

Before it became tree-abiding, `::backdrop` inherited from **nothing**. Custom properties
are inherited properties, so a `--color-scrim` declared on `:root` is simply not visible
there — `var(--color-scrim)` is invalid at computed-value time, and `background-color`
falls back to its initial value, `transparent`.

That is the part worth keeping: **the failure is not a wrong colour, it is no scrim at
all**, on browsers that otherwise support `showModal()` perfectly. A modal whose backdrop
silently vanishes on Safari 16 is a functional defect, and it would have been invisible in
every gate we run, all of which use a current Chrome. The plan for this component said the
degradation would be "graceful". It would not have been.

So the `<dialog>` is a transparent, full-viewport shell and the **scrim is a real element
inside it**. The only `::backdrop` rule left is `background-color: transparent`, a literal
that involves no custom property and is therefore safe on every engine that has `<dialog>`
at all. The scrim's baseline collapses onto the dialog's own.

Three things fall out that are better than the original plan rather than merely equivalent:

- **Backdrop dismissal stops being a hit-test.** The documented trick for `::backdrop` —
  which is not an event target — is to compare a click's coordinates against the dialog's
  bounding rect. With a real scrim the check is `event.target === scrim`, which is not an
  approximation of anything.
- **The scrim is measurable by the ordinary instrument.** `getComputedStyle` on a
  pseudo-element is exactly the tool that already lied to us about `::placeholder` (see
  [CLAUDE.md](../CLAUDE.md) known-gaps). A real element has no such caveat, so this
  component does not add a second entry to that list.
- **Centring becomes ours and therefore testable**, rather than the UA's `margin: auto` on
  a max-width box we would then be fighting.

The cost is one extra DOM node and taking over viewport sizing. Worth it.

Method note, because the conclusion is only as good as how it was reached: the current
engine was probed first (it resolves the property correctly and paints `#B3B3B3`), which
proves nothing about the baseline — so the version matrix above was looked up rather than
inferred from a passing check. **A feature working in the browser in front of you is the
weakest possible evidence about the browsers you support.**

**The plan for this component said the degradation would be "graceful". It would not
have been**, and that error is worth naming as a class rather than an incident. It is the
same shape as the 140-byte tree-shaking inference recorded above: a plausible claim, made
confidently, that nobody had measured. Both were reasonable-sounding predictions about
behaviour at a boundary — an old browser, an unused import — where the boundary is exactly
where intuition has no data. The tell in both cases is a sentence that describes what
_would_ happen rather than what was observed to happen.

The general lesson, which is the reason this is its own entry rather than a line in the
section above: **two platform features that arrive together in your head can be two years
apart in the field.** `<dialog>` and a usable `::backdrop` read as one capability — they
are specified together, documented together, and demoed together — and they became
available twenty-three months apart. Anything that pairs a element with a pseudo-element,
or a JavaScript API with the CSS that styles it, deserves the same two-column check.

## A translucent token must be visible to the guard without being measurable by it

Adding `--color-scrim` surfaced a hole in the contrast contract, and the two halves of the
fix pull in opposite directions.

`parseTheme` resolved only `^#[0-9a-fA-F]{6}$`. A token carrying alpha returned `null`,
was dropped from the parsed theme, never appeared in `colorTokens`, and so could not be
reported by `findUnaccountedTokens`. **A colour token invisible to the guard whose entire
purpose is that a gap cannot hide** — the same shape as every other entry in this file: a
check that is green because it never reached its subject.

Widening the parser to accept `#rrggbbaa` fixes visibility and immediately creates a worse
problem. `relativeLuminance` reads the first six digits, so a translucent token in a
`PAIRS` entry would measure as though it were opaque and produce a confident, plausible,
**wrong** ratio. WCAG contrast is defined between opaque colours; a translucent one has no
ratio until it is composited over something.

So the two capabilities are separated by construction rather than by memory:
`HEX_COLOR` accepts eight digits so the completeness guard can _see_ such a token, and
`findAlphaTokensInPairs` fails the build if one ever reaches a pair. `scrim` sits in
`IGNORED` with its reason, and the reason is now enforced rather than trusted — the same
move `SHARED_VALUE` made when "these two tokens have the same value" turned out to be a
claim a comment could not keep honest.

The general form: **a wrong number that passes is worse than a missing one**, because
nothing ever asks about it again.

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
