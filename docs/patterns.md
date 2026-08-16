# Patterns

Extracted from what was actually built, so the next component starts from evidence
rather than intention. Rules that must be known _before_ writing code live in
[CLAUDE.md](../CLAUDE.md); the "why" behind architecture decisions lives in
[decisions.md](decisions.md). This file is the working detail in between.

## Make incorrect use impossible, not merely documented

The strongest guardrails in this system are the ones a developer cannot get past, and
they cost nothing at runtime.

**Primitives live outside `@theme`.** They sit in `:root`, so Tailwind generates no
`bg-neutral-50` utility. A component cannot name a primitive — not because a rule
forbids it, but because the class does not exist. The boundary is enforced by absence.

**`IconButton` requires `aria-label` at the type level.** An icon-only control has no
visible text, so without a label it has no accessible name at all. `aria-label: string`
(not optional) means a nameless icon button **does not compile**. A boolean `iconOnly`
prop on `Button` could not express this, because `children` would stay valid — which is
the argument that decided `IconButton` should be its own component rather than a flag.

The pattern to reach for: when a rule matters, ask what makes breaking it impossible
before writing it down. Documentation is the fallback, not the first answer.

## Two component shapes, and knowing which one you have

Everything below about variant axes and compound tables came out of `Button`. `Input`
does not fit it, and that is not a flaw in either component — they are different shapes,
and recognising which one you are holding decides where the work actually is.

**Shape one: the specification is a class matrix.** `Button` and `IconButton`. The hard
part is colour across `variant × tone × state`, the `cva` is most of the component, and
the review question is "does every cell match the source?" Behaviour is small and mostly
shared.

**Shape two: the specification is behaviour.** `Input`. Its `cva` is the _small_ part.
The hard part is `useId` wiring, `aria-describedby` assembly and its order, deriving
state from props rather than accepting it, focus management around a control that
unmounts, and a nested interactive child. There is no compound table because there is
nothing to compound — one axis, `size`.

The tell is in the Figma file, and it is counter-intuitive: **`Input` has the larger
matrix — 237 components against Button's 12 — and the smaller `cva`.** A large variant
count is not evidence of a large style map. It usually means the design tool is drawing
runtime state, because drawing every combination is the only way a design tool _can_
express state. The bigger the matrix, the harder to look past it, and the more likely
that most of it is behaviour.

So the first question on a new component is which shape it is, because it decides what to
be careful about. On shape one, mis-transcribing a cell ships a wrong colour. On shape
two, the equivalent mistake ships a control that a screen reader cannot describe — and no
amount of matrix-checking would have caught it.

**Shape three: the specification is mostly the platform's.** `Dialog` — and the
prediction this paragraph used to make was wrong, which is why it is worth correcting
rather than quietly rewriting. It said Dialog "looks like shape two again: focus
trapping, restoration, `aria-modal`, escape handling and scroll locking are all
behaviour."

Every item on that list is real, and we wrote almost none of it. `showModal()` supplies
the focus trap, the focus restoration, Escape, the top layer and background inertness;
`aria-modal` turned out to be something you should _not_ write, because the browser
conveys modality natively and asserting it by hand is how the two get to disagree. What
we actually wrote was the initial-focus resolver, the scroll lock and the dismissal
rules — perhaps a fifth of what shape two would have implied.

So the hard part is not writing behaviour. It is **choosing the substrate, and then
proving the substrate is really doing it.** That inverts where the risk lives:

| Shape                                | Where the work is                              | What a mistake ships                                   |
| ------------------------------------ | ---------------------------------------------- | ------------------------------------------------------ |
| One — class matrix (`Button`)        | transcribing cells                             | a wrong colour                                         |
| Two — behaviour (`Input`)            | wiring, focus, derived state                   | a control a screen reader cannot describe              |
| Three — platform contract (`Dialog`) | choosing what _not_ to write, and verifying it | a component that looks correct and is not modal at all |

The third failure is the dangerous one, because nothing in the code looks wrong. A
`<dialog open>` renders identically to a `showModal()`'d one; it simply is not modal.
That is why this shape needs a harness that can tell the difference — see
[A measurement harness needs its own sanity check](#a-measurement-harness-needs-its-own-sanity-check),
which Dialog extended twice in one session.

The tell for shape three is a component whose accessibility requirements read like a
list of things browsers already do. When that happens, the question is not "how do I
implement these?" but "which of these does the platform give me, and how would I know if
it stopped?"

## How many variant axes: as many as the source has, and no more

`Button` has `variant` (emphasis) and `tone` (intent) as separate axes, mirroring the two
parallel frames in Figma. Flattening them into one `variant` would mean eight values now
and sixteen the day a `warning` tone arrives.

But the axes are **not independent**, and the code says so out loud: the colours live in
`compoundVariants`, because at rest the accent outline is neutral while the danger
outline is already coloured, and the accent ghost wash is neutral where the danger one is
tinted. Danger is not a hue swap of accent.

`Input` is the counter-case, and it is why this section is not called "axes are
orthogonal". It has **one** axis. The Figma page models `Size`, `State`, `Typing`,
`Text Entered` and `State 2` across 237 components, and four of those five are runtime
state: `State` is `:hover` / `:focus-visible` / the `error` prop / the `disabled`
attribute, `Text Entered` is whether the field has a value, `Typing` is a focused field
with a caret, and `State 2` is the clear button's own hover and pressed state. Mirroring
them as props would have shipped a design-tool modelling artefact as public API.

So the rule is not "prefer orthogonal axes" — it is **take the number of axes from the
source, and be suspicious in both directions.** Flattening two real axes into one costs
you eight values now and sixteen later; inflating runtime state into props costs you a
component nobody can use correctly. Do not force the matrix to be regular by inventing
values the design does not have, and do not assume a large matrix means a large API.

**Internal axes stay internal.** `footprint` (`label` / `icon`) is a `cva` variant that is
not a public prop — it distinguishes the space the control occupies, which the consumer
never needs to name. `IconButton` passes it; `ButtonProps` does not mention it.

## The `cva` lives in its own file, for either of two reasons

`buttonVariants.ts` sits beside `Button.tsx` rather than inside it, and `inputVariants.ts`
does the same beside `Input.tsx`. Same structure, **different justifications**, and the rule
is the union rather than the first case:

1. **A sibling component re-invokes the same matrix.** `IconButton` imports `buttonVariants`
   and calls it with the internal `footprint: 'icon'` axis. The thing that keeps the two
   components consistent is that there is exactly one style map; a second one would
   reintroduce the drift the composition exists to prevent. Here the split is what makes the
   sharing possible at all.
2. **The matrix is large enough to bury the component.** `Input` has no sibling and shares
   its `cva` with nothing. It is a separate file because the component's own body is
   `useId` wiring, `aria-describedby` assembly and focus management, and interleaving eighty
   lines of class strings with that makes both harder to read.

Worth stating explicitly because the first reason is the memorable one and generalises badly:
someone who has only seen `Button` would conclude the split _means_ "something else composes
this", and either add a needless file or, worse, read `inputVariants.ts` as a promise that a
sibling is coming.

## Redeclaring a prop means checking what it shadows

Extending a native element's attribute interface and then redeclaring a prop of the same name
is routine — `Button` does it for `disabled`. The trap is that the collisions are not always
the ones you would predict, and they surface as a type error rather than as anything the
design review would catch:

- **`size`** on `<input>` is a native attribute meaning _width in characters_, unrelated to a
  design system's `sm`/`md`/`lg`.
- **`prefix`** is on React's `HTMLAttributes` for **every** element — it is an RDFa attribute,
  and nothing about the name suggests that.

Both had to be omitted from `InputProps`. So: before adding a prop whose name reads like plain
English, check whether the DOM already claims it. `Omit<..., 'size' | 'prefix'>` with a comment
saying why is cheaper than the next reader wondering whether the omission was deliberate.

## Two audiences, two vocabularies

The same concept gets different names depending on who reads it, and that is deliberate
rather than sloppy.

**Navigation follows Figma**, because that is where a designer goes looking. Story titles
mirror the Figma section taxonomy, and the sections carry their own definitions:

- **General** — "General button component and style guide made up the Visual Language
  foundation of a system which can convey the aesthetic choice of a design system"
- **Data Entry** — "Inputting of data or information from various sources into a system"
- **Feedback** — "Displaying reaction to user's operation or system process that aims to
  inform information"

So `General/Button`, `Data Entry/Input`, `Feedback/Dialog`. With three components each
category holds one, which looks sparse and is honest: the grouping is what scales, and
where a Checkbox or an Alert goes is already decided.

**The API follows ecosystem convention**, because a developer types it in an editor:

| Figma                  | Prop                    | Why                                                                                               |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| Small / Medium / Large | `sm` / `md` / `lg`      | Tailwind's own vocabulary — `text-sm`, `rounded-md` — so no translation step inside the component |
| Left Icon / Right Icon | `startIcon` / `endIcon` | Logical properties survive RTL; physical ones do not                                              |
| Danger Button          | `tone="danger"`         | Intent, not a separate component                                                                  |
| Fillet                 | `shape`                 | "Fillet" is CAD jargon most React developers do not know                                          |

Story _names_ stay Small / Medium / Large, so a designer scanning Storybook still sees
their words. The bridge lives in documentation, which is where a translation belongs.

## Deliberate omissions

Recorded because "we did not think of it" and "we decided against it" look identical in a
codebase.

**No polymorphism / `asChild`.** `variant="link"` styles a `<button>` like a link; it does
not become one. The element follows behaviour, not appearance — a control that navigates
is an anchor and needs its own component. Radix `Slot` would be a runtime dependency
bought for one variant.

**No `fullWidth`.** `className="w-full"` already wins through `twMerge`. The same
discipline the token layer applies: no public API ahead of evidence.

**No `tone` on `IconButton`.** The Figma set has no danger icon button. "Someone will want
it" is not evidence — everything missing from a design system is a common need for
somebody.

**No `readOnly` prop on `Input`.** The design draws no read-only state, and it already
passes through from `InputHTMLAttributes`. A prop would be API surface for a state nobody
specified.

**No `Number` stepper and no filled prefix/suffix addon segments**, though both are fully
extracted. The brief asks for "Input" and enumerates exactly the five states the Figma
`State` axis carries; neither appears in it. The stepper is also the one place where the
design and a criterion genuinely conflict — at `sm` the field is 24px tall, so two stacked
buttons cannot both clear the 24×24 of SC 2.5.8 without redrawing the control. Building it
would have minted the register's first unresolvable row for capability nobody requested.
Full reasoning in [decisions.md](decisions.md).

The pattern across all five: **"extracted, specified, deliberately not shipped" is a
stronger position than a half-built control**, and it only works if the extraction really
was done and really is written down.

## Sizing guidance worth repeating to consumers

`sm` sits **exactly** on the SC 2.5.8 floor of 24×24 with no margin. It is for
pointer-dense UI — toolbars, table rows — and `md`/`lg` are the touch defaults. The floor
is asserted in Cypress on the computed box rather than left as advice, because a border, a
scale tweak or browser rounding would drop it below without anyone noticing.

The hit area is deliberately **not** extended beyond the visual box: an invisible 44px
target on a 24px control in a toolbar overlaps its neighbours, and an overlapping target
is worse than a small one.

**A glyph size and a target size are different numbers.** `Input`'s clear control draws at
16 / 14 / 12 px, exactly as the source specifies, but its _button_ is 24×24 at every size.
At `sm` that makes the control as tall as the field itself, which looks like an accident
and is not: a 12px hit area fails SC 2.5.8 outright. Transcribe the glyph from the design;
take the target from the criterion.

## Testing

### The split: what belongs in Jest, and what only a browser can answer

Duplicating an assertion across both runners costs a browser launch and buys nothing.
The line is what the tool can actually observe.

**Jest + Testing Library** — everything derivable from the rendered DOM: roles,
accessible names, ARIA attributes, which handler ran, class strings, and `axe` rules
that do not need paint. `user-event` models the browser's activation behaviour
correctly, so Enter and Space belong here.

**Cypress** — everything that needs a real engine: computed geometry (touch targets,
whether a "square" is actually square), real compiled CSS (a token resolving all the
way to a painted pixel), `:hover` and `:focus-visible`, real key events, and `axe`'s
colour-contrast rules, which need painted pixels and report as _incomplete_ in jsdom.

A useful test of whether a Cypress spec is earning its keep: could jsdom have answered
this from the class string alone? If yes, move it.

### Hover assertions must re-query, or they read the pre-transition colour

Controls carry `transition-colors`. Chaining an assertion directly onto the hover reads
the colour **before** the transition settles:

```ts
// Latent false-green: passes or fails on timing, not correctness.
cy.findByRole('button').realHover().should('have.css', 'background-color', HOVER);

// Re-query so `should` retries until the transition finishes.
cy.findByRole('button').realHover();
cy.findByRole('button').should('have.css', 'background-color', HOVER);
```

The chained form does not retry the hover, so whether it passes depends on how fast the
machine is. This is the worst kind of failure — it goes green often enough to be trusted
and red often enough to be blamed on flake. Every hover assertion from here on uses the
re-queried form.

### A measurement harness needs its own sanity check

Both mistakes below were caught by an **indirect** signal, not by the measurement
failing. That is the point: an instrument that measures nothing reports success just as
confidently as one that works, which is the same failure the gate entries in
[decisions.md](decisions.md) describe — so be sceptical of the instrument before the
component.

**If every variant returns the same number, suspect the harness.** A consumer-shaped
page built to check the components without Tailwind's preflight reported every button
at 54.55 × 21px — all three sizes identical, with the browser's default `1px 6px`
padding. Nothing was wrong with the components: the page had been loaded as a snapshot,
its relative `<link rel="stylesheet">` never resolved, and not one of our rules applied.
The tell was not that the numbers were wrong; it was that they were _equal_ when the
whole point of the measurement was that they differ. Inlining the CSS produced the real
figures. A harness deserves at least one assertion that would fail if it were measuring
nothing.

**`getComputedStyle` in the same tick as an attribute change returns the stale value.**
Toggling `data-theme="dark"` and reading the computed background immediately reported
the light colour, which looked exactly like a broken dark mode in the published
stylesheet — a serious defect, nearly reported as one. Reading in a separate call showed
the re-map working. The custom property had already flipped while the resolved
`background-color` had not, and that split is the diagnostic: when a token changes but
the property using it does not, suspect the read before the CSS.

**When the subject can be stubbed, the harness must assert it is not.** jsdom has no
`<dialog>` modal behaviour, so `jest.setup.ts` shims `showModal`. In Jest, then, a modal
dialog and a plain `<dialog open>` are indistinguishable — and if that shim ever reached
the browser suite, every modality assertion would keep passing while proving nothing.
So `Dialog.cy.tsx` opens by asserting `HTMLDialogElement.prototype.showModal` is native,
and separately that the element matches `:modal`, which only a `showModal()`'d dialog
does.

**Provoking it paid for itself immediately, and not in the way intended.** Installing the
shim in the browser environment turned the sanity check red as designed — but **17 of the
27 specs still passed**, and one of them was an inertness test. It asserted that a point
over a background button hit the scrim instead, which is equally true of a non-modal
dialog whose scrim covers the page: it was measuring z-order and reporting inertness.
Rewritten to ask the background element to take focus — something covering cannot fake,
because only a genuinely inert document refuses it — the spec fails against the shim as
it should.

The general form is sharper than "prove the gate fails". **Provoke the gate, then read
which _other_ tests survived the provocation.** Every one that stayed green under a
deliberately broken subject is a test that was not measuring that subject, and you will
not find those any other way.

### Real keyboard needs real events

Cypress's own `.type('{enter}')` dispatches synthetic key events, which never trigger a
control's **native** behaviour: no click follows Enter on a button, a focused button does
not swallow Space, and there is no Tab traversal at all. `cypress-real-events` drives the
browser through CDP, so `realPress` produces what a keyboard user actually gets.

Tab traversal needs a **starting point**. In a component test the document begins with
focus outside the application frame, so a bare `realPress('Tab')` lands nowhere — mount a
focusable sentinel before the subject and focus that first. It also sharpens the claim:
the control is the _next stop in sequential focus order_, not merely focusable.

`:focus-visible` is evaluated when focus **moves**. A pointer press on a control that
already holds a keyboard-derived ring leaves the ring in place — correct browser
behaviour, and a trap when writing the "no ring on click" assertion. Click a control that
was not already keyboard-focused.

### An inapplicable rule and an accepted exemption must not be written the same way

Both come out as `{ enabled: false }`, and that shared spelling is the whole problem: it
makes an accessibility decision look like configuration, and it makes the question "how
many rules are off in this project?" one with a quietly growing answer. Three kinds live
in [`a11y.config.ts`](../a11y.config.ts), shared by Storybook and Cypress so a rule cannot
be off in one runner for a reason the other has never heard of:

1. **Inapplicable — declared once, globally.** `landmark-one-main`, `page-has-heading-one`
   and `region` ask questions about page composition. A component mounted in isolation has
   no page, so they have nothing to evaluate. Not overridden — inapplicable. The test for
   membership is written next to the list: _would turning this off hide a defect in the
   component itself?_ If yes, it does not belong there.
2. **An accepted exemption — never global, and never a disable.** Reachable only through
   `checkA11yWithAcceptedContrast` / `storyAcceptedContrast`, which take the measured
   ratio, the register row and the reason as **required** arguments. The rule stays
   **enabled** and is narrowed by selector to skip one named region.
3. **A Design Fidelity story**, whose "As drawn in Figma" column exists to render values
   the token layer rejected. Its own factory, no ratio, and still a narrowing — the
   "Shipped" column beside it stays checked.

**Narrowing beats disabling, and the difference is not cosmetic.** Switching
`color-contrast` off to hide one known pair also hides every _future_ failure in that
story. That is the same shape as a stale exemption in the contrast contract, which is
already solved by making it fail once it stops being necessary. The narrowing is proven by
provocation: with the exemption in place, an unmarked low-contrast element in the same
mount is still reported, and removing that element turns the test red — so the assertion
is not vacuous.

`region` is the reason this got restructured. It was disabled in one spec of three, purely
because Button and IconButton render no bare text and never tripped it. A rule discovered
per component instead of declared once is the tell that the two kinds had been conflated.

Print the violations. By default a failure reports a count — "2 accessibility violations
were detected" — and the detail stays in the browser's command log, invisible in CI, which
is the one place it is needed. A `cy.task` that logs rule id, impact and offending nodes
turns a number into something actionable.
