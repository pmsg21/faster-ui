# Tokens

The token layer is the contract between the design and every component. It has two
layers, and a component only ever sees the top one. The rules live in
[CLAUDE.md](../CLAUDE.md); this file is the map — what exists, how it's named, and
what each semantic token resolves to.

Source of the values: the TapTap Figma file (Color `4:944`, Shadow `4:1373`,
Typography `4:1418`). Primitives are transcribed exactly; the semantic layer is our
contribution — Figma ships primitives only.

## Two layers

**Primitives** (`:root`) are raw values with no meaning — `--neutral-700`,
`--primary-600`, the type scale, the elevation shadows. They are private and
**immutable across modes**: a ramp is a fact, `--neutral-50` is always the lightest
neutral. They live in `:root`, deliberately _not_ in `@theme`, so Tailwind generates
no `bg-neutral-50` utility — a component literally cannot name a primitive. The
boundary is enforced by the absence of a utility, not by convention.

**Semantic tokens** (`@theme`) encode intent — `surface-base`, `accent-solid`,
`content-danger` — and are the public API. Each maps to a primitive. This is the only
layer a component names, and the only colours that generate utilities.

Dark mode re-points the semantic tokens; primitives never change. See
[Dark mode](#dark-mode).

## Naming

Semantic colour tokens are grouped by role under Tailwind's `--color-*` namespace. A
Tailwind utility is `<utility-prefix>-<token-name>`, so the utility a group actually
generates is the group name with the utility's own prefix in front of it:

| Group                   | Covers                                                                                                       | Written as                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `surface-*`             | backgrounds (base, raised, overlay, sunken, muted, hover, active)                                            | `bg-surface-base`                           |
| `content-*`             | foregrounds (primary, secondary, disabled, on-accent, accent, danger)                                        | `text-content-primary`                      |
| `line-*`                | borders (subtle, default, disabled, focus, danger)                                                           | `border-line-subtle`                        |
| `accent-*` / `danger-*` | interactive fills and their states (solid, hover, active, disabled; `subtle`/`subtle-active` on danger only) | `bg-accent-solid`                           |
| `focus-strong`          | the focus indicator of record                                                                                | `ring-focus-strong`, `outline-focus-strong` |
| `radius-*`              | corner radius by intent (`control`, `full`)                                                                  | `rounded-control`                           |

Names describe **intent, never appearance** (`accent-solid`, not `cyan-600`), so a
re-skin is a mapping change and a consumer never encodes a colour.

**A group name must not begin with a colour-utility prefix.** `content-*` and `line-*`
read a little oddly next to `text-` and `border-`, and that is the point: naming them
`text-*` and `border-*` would produce `text-text-primary` and `border-border-subtle`,
because the utility prefix composes onto the token name rather than replacing it. The
first version of this layer made exactly that mistake, and this file documented
utilities that were never generated. A guard in the contract now fails the build on it —
see [decisions.md](decisions.md).

## What ships, and what doesn't

Only the intents that Button, Input and Dialog actually consume are given semantic
tokens: **neutral, primary (as `accent`), and danger**. `warning`, `success`, `info`
and `auxiliary` are transcribed as primitives but have **no semantic token** — they
gain one the moment a component needs them. The reasoning is in
[decisions.md](decisions.md): a token is permanent public debt, and the best defence
against unused tokens is not to create them.

## Semantic → primitive map (light)

| Token                   | → primitive | Note                                                 |
| ----------------------- | ----------- | ---------------------------------------------------- |
| `surface-base`          | neutral-50  | app background                                       |
| `surface-raised`        | white       | card, default field                                  |
| `surface-overlay`       | white       | dialog, popover                                      |
| `surface-sunken`        | neutral-100 | recessed well                                        |
| `surface-muted`         | neutral-50  | disabled field fill — re-pointed from 200, see below |
| `surface-hover`         | neutral-100 | ghost/row hover                                      |
| `surface-active`        | neutral-300 | ghost/row pressed — one step past hover              |
| `content-primary`       | neutral-700 | body, headings                                       |
| `content-secondary`     | neutral-600 | remapped from 500 for AA (see a11y)                  |
| `content-disabled`      | neutral-400 | WCAG-exempt                                          |
| `content-on-accent`     | neutral-700 | dark label; white fails on the ramp (see a11y)       |
| `content-accent`        | primary-600 | ghost/link text — brand conflict                     |
| `content-danger`        | danger-700  | error text — brand conflict                          |
| `line-subtle`           | neutral-300 | default field border, dividers                       |
| `line-default`          | neutral-400 | stronger/hover field border                          |
| `line-disabled`         | neutral-200 |                                                      |
| `line-focus`            | primary-600 | focus outline colour                                 |
| `line-danger`           | danger-600  | invalid field border                                 |
| `accent-solid`          | primary-600 | button primary (600/500/700/300 across states)       |
| `accent-solid-hover`    | primary-500 | hover lightens (source)                              |
| `accent-solid-active`   | primary-700 | active darkens (source)                              |
| `accent-solid-disabled` | primary-300 |                                                      |
| `danger-solid`          | danger-600  | full states — danger is a Button _tone_              |
| `danger-solid-hover`    | danger-500  |                                                      |
| `danger-solid-active`   | danger-700  |                                                      |
| `danger-solid-disabled` | danger-300  |                                                      |
| `danger-subtle`         | danger-100  | danger ghost hover wash                              |
| `danger-subtle-active`  | danger-200  | danger ghost pressed — lifted from 300 (a11y)        |
| `focus-strong`          | neutral-700 | the focus indicator of record                        |

There is deliberately **no `accent-subtle`**. It existed on the assumption that the
accent ghost wash was a brand tint; extracting Button showed it is neutral
(`surface-hover` / `surface-active`), leaving the token with no consumer, so it was
removed — the first application of the deprecation policy, made while the cost was
zero. Only the danger tone tints its wash.

There is also deliberately **no `focus`** (primary-500). It was reserved for the
decorative cyan halo Figma draws on a focused field, and Input — the only component
that would ever have consumed it — does not ship that halo, because a 16%-alpha glow
underneath a neutral 2px ring adds nothing anyone can see. Removed for the same reason
as `accent-subtle`, but **not** at the same cost: `./styles.css` is exported now, so
this removal is communicated in a changeset rather than made silently. The cyan is
still on a focused field, as `line-focus` on the inner border.

## A shared token is not re-pointed for one consumer

Input's disabled text is drawn at neutral-300. `content-disabled` is neutral-400, and it
stays there, because `Button` consumes it too — re-pointing would move a colour under a
component that never asked for the change. Input uses `content-disabled` as it is, one
ramp step darker than drawn. Nothing turns on it: WCAG exempts disabled controls, so no
criterion is at stake in either direction.

The general rule, because it will recur: **when a component's drawn value doesn't match
a shared token and nothing turns on the difference, the token wins and the difference is
recorded here.** Re-pointing a token to satisfy one consumer is how a semantic layer
stops being semantic — the name goes on meaning "disabled foreground" while the value
starts meaning "whatever the most recent component wanted".

Note what this is **not**. It is not a design-fidelity divergence, and it is deliberately
absent from [design-fidelity.md](design-fidelity.md). That register documents places we
concluded the _design_ should not be implemented as drawn, each turning on a WCAG
criterion. Here we concluded nothing about the design; we concluded something about the
system. Different kinds of claim, so different documents.

The counter-example is in the same paragraph as the rule, which is the point:
`surface-muted` **was** re-pointed (neutral-200 → neutral-50) for Input, and that is
consistent, because it had **no other consumer**. A token with one consumer is a guess
being tested; a token with two is a contract. `accent-subtle` was the same lesson in its
strongest form — the first real consumer proved the guess wrong and the token went.

## Dark mode

`[data-theme='dark']` re-points the semantic tokens at different existing primitives —
no new hex, no primitive override. Brand fills (`accent-*`, `danger-*` solids) and the
dark label (`content-on-accent`) are mode-independent — cyan is cyan — so only surfaces,
text and borders flip. Highlights:

| Token                                     | light →                  | dark →                                                                     |
| ----------------------------------------- | ------------------------ | -------------------------------------------------------------------------- |
| `surface-base`                            | neutral-50               | neutral-700                                                                |
| `surface-raised`                          | white                    | neutral-700                                                                |
| `surface-sunken`                          | neutral-100              | black                                                                      |
| `surface-active` / `danger-subtle-active` | neutral-300 / danger-200 | black — pressed **darkens** in dark; the ramp forces it (see a11y)         |
| `content-primary`                         | neutral-700              | neutral-50                                                                 |
| `content-secondary`                       | neutral-600              | neutral-300                                                                |
| `content-accent`                          | primary-600              | primary-400                                                                |
| `content-danger`                          | danger-700               | danger-300                                                                 |
| `danger-subtle`                           | danger-100               | neutral-600 (neutral wash — the ramp has no dark chromatic tint; see a11y) |
| `focus-strong`                            | neutral-700              | neutral-50 (the indicator inverts with the surface)                        |

Because `@theme` is plain (never `@theme inline`), the utilities keep the `var()`
indirection, so a mode is a single attribute flip on the root — no component renders
differently, nothing is rebuilt. A third mode would be one more column of mappings.

## Radius

Two tokens, mapped once (no mode variance):

- `--radius-control` → `4px` — every control corner Figma draws (Button, and Dialog
  when it lands).
- `--radius-full` → `9999px` — a fully rounded shape. Figma's IconButton specifies
  `100px`, chosen to exceed half the largest square (40px); that is an _effect_
  ("however round it takes to be a circle"), so it is transcribed as the effect
  rather than as the literal 100.

Named for intent rather than for a step on someone else's scale. Tailwind's `rounded-sm`
happens to be 4px today, but it names a **framework** value: if the design moved to 6px,
`rounded-sm` would keep compiling while meaning the wrong thing. `--radius-control` also
declares that Button and Dialog share a _decision_ rather than happening to agree.

Note the scope boundary: the contrast contract's completeness guard reads `--color-*`
only, so radius tokens are **not** covered by it — recorded in
[CLAUDE.md](../CLAUDE.md) known-gaps.

## Typography & elevation

Type and elevation are mapped once (no mode variance, intrinsic intent):

- `--text-h1 … --text-caption` — size + line-height per role. H1–Title bake weight 500
  (they're Medium-only in the source); Subtitle/Body/Caption stay weight-neutral and
  the consumer applies `font-regular`/`font-medium` (both weights exist in source).
  `--text-h3` = 20/28, verified from Figma node `4:1507`. Sizes are in `rem` so the
  scale honours the user's root font-size — an accessibility gain over the px source.
- `--shadow-elevation-1 … -4` — the four double-shadows, alpha kept as 8-digit hex to
  match Figma exactly.

## Contrast is enforced

The colour tokens are governed by an automated contrast contract
([accessibility.md](accessibility.md)) that fails CI on a regression or an undeclared
token. Changing a token means re-running the gate, not trusting a review.
