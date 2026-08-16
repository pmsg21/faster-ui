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

## Variant axes: orthogonal, until the source says otherwise

`Button` has `variant` (emphasis) and `tone` (intent) as separate axes, mirroring the two
parallel frames in Figma. Flattening them into one `variant` would mean eight values now
and sixteen the day a `warning` tone arrives.

But the axes are **not independent**, and the code says so out loud: the colours live in
`compoundVariants`, because at rest the accent outline is neutral while the danger
outline is already coloured, and the accent ghost wash is neutral where the danger one is
tinted. Danger is not a hue swap of accent.

The lesson for the next component: orthogonal axes are the right default for the API
surface, and a compound table is the right place to admit where reality is not
orthogonal. Do not force the matrix to be regular by inventing values the design does not
have.

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

## Sizing guidance worth repeating to consumers

`sm` sits **exactly** on the SC 2.5.8 floor of 24×24 with no margin. It is for
pointer-dense UI — toolbars, table rows — and `md`/`lg` are the touch defaults. The floor
is asserted in Cypress on the computed box rather than left as advice, because a border, a
scale tweak or browser rounding would drop it below without anyone noticing.

The hit area is deliberately **not** extended beyond the visual box: an invisible 44px
target on a 24px control in a toolbar overlaps its neighbours, and an overlapping target
is worse than a small one.

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
