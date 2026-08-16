# Patterns

Extracted from what was actually built, so the next component starts from evidence
rather than intention. Rules that must be known _before_ writing code live in
[CLAUDE.md](../CLAUDE.md); the "why" behind architecture decisions lives in
[decisions.md](decisions.md). This file is the working detail in between.

> **Status:** the testing section below is complete and derived from `Button` and
> `IconButton`. The component-API sections (variant axes, the guardrail principle, the
> two-audience vocabulary rule, the Storybook↔Figma taxonomy) land when Button's PR
> closes.

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

### axe in a component test: disable the page rules, never the interesting ones

`landmark-one-main` and `page-has-heading-one` cannot apply to a component mounted in
isolation — there is no page here to have a main landmark or an `h1`. Those two are
disabled; everything else stays on, `color-contrast` above all, since it is the reason to
run axe in a browser at all.

Where a contrast exemption is deliberate and recorded (the danger tone's non-solid label,
row 4 of [design-fidelity.md](design-fidelity.md)), `color-contrast` is disabled **for
that assertion only**, with the exemption still enforced by the contrast contract — which
pins the exact ratio and fails if it drifts in either direction. Disabling a rule and
losing the check are not the same thing, but they look identical unless the second
instrument is named.

Print the violations. By default a failure reports a count — "2 accessibility violations
were detected" — and the detail stays in the browser's command log, invisible in CI, which
is the one place it is needed. A `cy.task` that logs rule id, impact and offending nodes
turns a number into something actionable.
