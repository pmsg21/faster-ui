# Design fidelity — where Faster UI differs from the Figma file, and why

Faster UI is built from the TapTap Design System Figma file. Every colour, type step and
measurement is transcribed from it, and every raw value in the codebase is traceable back
to a specific node.

In ten places a shipped component does **not** look identical to the mock. This page
lists all ten — as one register and again split per component — with the measured numbers
and the WCAG criterion each one turns on. It
is the single record; [accessibility.md](accessibility.md), [tokens.md](tokens.md) and
[decisions.md](decisions.md) link here rather than repeating it.

**The short version:** we matched the design, measured it, found the places where it
fails WCAG, and fixed those in the semantic token layer — never by editing a primitive.
Every Figma value is still present and still traceable; what changed is which token sits
on top of it. Being faithful to a design is not the same as being faithful to a design
defect.

You can see every one of these side by side: each component's Storybook sidebar opens
with a **Design Fidelity** story that renders the Figma-faithful version next to the
shipped version, labelled, with the ratios beneath.

## How to read the table

**Ratio** is the WCAG contrast ratio between the text (or indicator) and what sits behind
it — 1:1 is invisible, 21:1 is black on white. The thresholds in play:

- **4.5:1** — the minimum for normal-size text (WCAG 2.2 SC 1.4.3, level AA).
- **3:1** — the minimum for interface parts that aren't text: focus rings, borders that
  carry meaning (SC 1.4.11).
- **SC 1.4.1** is a different rule with no number: information must not be conveyed by
  colour alone.
- **SC 2.5.8** requires an interactive target to be at least 24×24 CSS pixels.
- **SC 3.3.2** requires a form control to carry a label or instruction — and a placeholder
  is not one, because it vanishes the moment the field is used.

Every ratio below is computed from the shipped tokens by
[`src/styles/contrast-contract.ts`](../src/styles/contrast-contract.ts) and re-checked on
every CI run, so this table cannot silently drift from the code.

## The register

A row is a **decision, not an occurrence.** When a later component re-applies a decision
already made here, it extends the existing row rather than minting a duplicate — otherwise
the register stops measuring divergence and starts measuring how many components exist,
which is the same dilution [accessibility.md](accessibility.md) warns about for exemptions.

Rows are also of two kinds, and the difference matters to a reader: most are **changes** to
something the design draws, but rows 7 and 10 are **additions** — the design drew nothing
there at all. "We implemented this differently" and "we supplied what was missing" are
different claims.

| #   | What                                      | Figma                                       | Shipped                             | Ratio                                          | Criterion | Kind         |
| --- | ----------------------------------------- | ------------------------------------------- | ----------------------------------- | ---------------------------------------------- | --------- | ------------ |
| 1   | Label on the filled (solid) buttons       | white                                       | `neutral-700` (near-black)          | accent 2.12 → **7.78**; danger 3.47 → **4.75** | 1.4.3     | change       |
| 2   | Link-style button                         | no underline, colour only                   | underlined in **every** state       | —                                              | 1.4.1     | change       |
| 3   | Cyan never carries text                   | cyan (`primary-500`/`600`/`700`)            | neutral, darkening on interaction   | 1.88–2.80 → **8.72–15.12**                     | 1.4.3     | change       |
| 4   | Outline/Ghost/Link labels, danger tone    | tracks the ramp per state (600 / 500 / 700) | pinned to `danger-700`              | 2.98–4.21 → **4.21**                           | 1.4.3     | change       |
| 5   | Danger Ghost pressed background           | `danger-300`                                | `danger-200`                        | 2.97 → **3.69**                                | 1.4.11    | change       |
| 6   | Link-style button target height           | 18 / 22 / 24 px                             | minimum 24 px, label centred        | —                                              | 2.5.8     | change       |
| 7   | Focus state                               | none drawn                                  | 2px neutral ring, 2px offset        | **15.79–16.48**                                | 1.4.11    | **addition** |
| 8   | Placeholder and value colour              | `neutral-400` / `neutral-600`               | `neutral-600` / `neutral-700`       | 1.64 → **8.72** (value 8.72 → **16.48**)       | 1.4.3     | change       |
| 9   | A field is identifiable beyond its border | border alone                                | border **plus** a required label    | 1.31 / 1.64 ❌ unaided                         | 1.4.11    | change       |
| 10  | A visible label                           | none drawn anywhere                         | required, `labelHidden` for sr-only | —                                              | 3.3.2     | **addition** |

### By component

| Component    | Introduces | Extends      | Total in play |
| ------------ | ---------- | ------------ | ------------- |
| `Button`     | 1–7        | —            | 7             |
| `IconButton` | —          | 1, 3, 7      | 0 new         |
| `Input`      | 8, 9, 10   | **3**, **7** | 3 new         |

`IconButton` introduced nothing: implementing a capability the design documents (the round /
square `Fillet`) is fidelity, not divergence. `Input` extends two of Button's rows rather
than adding its own — the neutral focus ring is row 7 applied to a second component, and
keeping cyan off the placeholder and value is row 3 — and its affix colour reuses the
`content-secondary` remap already recorded in [accessibility.md](accessibility.md), so it
adds no row at all.

The trend is the point: **seven, then zero, then three.** The large decisions were made in
the first component and later ones inherit rather than reopen them. A flat total of ten does
not show that; the per-component split does. If `Dialog` contributes one or two, the shape of
that sequence is itself the argument that the approach stayed proportionate.

## Why each one

**1 — The filled buttons carry a dark label instead of a white one.** This is the most
visible difference and the first thing anyone notices. White text on the brand cyan
measures 2.12:1, against a 4.5:1 requirement. There is no cyan in the palette dark enough
to fix it: even the darkest step reaches only 2.80:1, which misses the 3.0 floor allowed
for large text. A near-black label on the same cyan measures 7.78:1. The same applies to
the red buttons — white 3.47:1, dark 4.75:1. The cyan and red themselves are untouched.

**2 — The link-style button is underlined.** In the Figma file it is distinguished from
ordinary text by colour alone, which SC 1.4.1 does not allow — it disappears for a reader
with a colour vision deficiency, and in greyscale. That is a separate problem from
contrast, and it is why the fix here is an underline rather than a colour change. The
underline is present in every state, not only on hover: a link that underlines only when
hovered is still colour-only at rest, which is where the rule applies.

**3 — Cyan is not used for text.** The design turns Outline and Link labels cyan on
interaction (1.88:1 hovering, 2.80:1 pressed). Because no cyan is dark enough to be
legible on white, the label stays neutral and darkens instead, and the cyan moves to the
parts that aren't text — the Outline border, the icon. The design used a change of hue to
signal the state; we use a change of lightness. That substitution was measured to be sure
it is still visible (ΔE 20.1, where anything above roughly 2.3 is perceptible), because a
hover state nobody can see is its own kind of failure.

**4 — Red is kept, but at one fixed step.** Unlike cyan, red is doing semantic work on a
destructive control, so removing it would strip meaning from exactly the people most
likely to rely on it. The design moves the red through three ramp steps as you interact;
we pin it to the darkest (4.21:1). That is still slightly under 4.5:1, and it is
recorded as an accepted exception — but it is the _same_ exception already accepted
elsewhere for red text, rather than three new ones. Since the label no longer changes,
the border and background carry the state instead, and both were checked to be clearly
distinguishable (ΔE 22.7 and 33.9).

**5 — One background is a shade lighter.** With the red label pinned as above, the
pressed background the design specifies would put the label at 2.97:1 — below even the
3:1 floor. Moving one step lighter on the same ramp reaches 3.69:1 while remaining
visibly distinct from the hover state (ΔE 3.7). This is the smallest possible change that
avoids shipping a worse exception than the one we are already accepting.

**6 — The link-style button has a minimum height.** SC 2.5.8 asks for a target at least
24×24 px; the Figma frames are 18, 22 and 24 px tall. But those heights are not a
specification — they are what Figma reports for a line of text. The designer drew a
label; nobody decided the target should be 22 px. Since the link style has no background,
enlarging the tappable area changes nothing that anyone can see, so this honours the
design's intent rather than departing from it.

**7 — There is a focus state, which the design does not include.** Not a change, an
addition: a keyboard user has to be able to see which control they are on. It cannot be
the brand cyan, which reaches only 1.88–2.12:1 against a 3:1 requirement, so the ring is
neutral and measures 15.79:1 or better on every surface a button sits on.

**8 — The placeholder and the value each move one ramp step darker.** The drawn placeholder
is `neutral-400`, which measures 1.64:1 on white — unreadable, and placeholder text is text.
The obvious fix breaks something else: darkening the placeholder alone to `neutral-600` makes
it identical to the drawn value colour, erasing the visible difference between an empty field
and a filled one. That distinction is not incidental; it is what the Figma file's entire
`Text Entered` axis exists to draw. So both move one step — placeholder to `content-secondary`
(8.72) and value to `content-primary` (16.48) — and the design's _relationship_ survives while
both sides clear AA. One row, because it is one decision.

**9 — A resting field is identifiable by more than its border.** `line-subtle` measures 1.31:1
and the hover border 1.64:1, against the 3:1 SC 1.4.11 requires for a meaningful non-text
boundary. Neither can be fixed without abandoning the drawn neutrals, so identification is
carried by the required visible label instead of by the box. Note the scope: the _error_
border (`line-danger`) measures 3.47:1 and clears the bar unaided, so this applies to the
resting and hover states only. An earlier draft of the obligation in
[CLAUDE.md](../CLAUDE.md) stated all three borders failed; that was wrong, and a known gap
that overstates its scope misdirects the work as surely as one that misses it.

**10 — There is a visible label, which the design does not include.** Not a change, an
addition, exactly like row 7: the file draws no label on any of its 237 Input components. An
input with no programmatic label is the single most common form accessibility failure, and a
placeholder is not a substitute — it disappears the moment the user types (SC 3.3.2), it is
invisible to page translation, and it fails voice-control users, who speak what they see. The
label is therefore a required prop, so a nameless field does not compile, with `labelHidden`
covering the legitimate case of a field whose purpose is obvious from context — by moving it
`sr-only`, never by removing it from the accessibility tree.

## On the count

Ten decisions across three components, introduced seven / zero / three. Each is measured,
each turns on a specific criterion, and each was the smallest change that clears it.

The number to watch is not the total but the rate, and the rate is falling — which is what a
proportionate approach looks like. Thirty rows would be a different thing entirely: at that
point the honest description is that we are redesigning rather than implementing. Counting
_decisions_ rather than _occurrences_ is what keeps the figure meaningful; had every
re-application of the neutral focus ring earned its own row, the register would read fourteen
today and would grow with every component regardless of whether anything new was decided.

## What we would take back to design

- A darker step on the brand ramp (a `primary-800`) so cyan can be used for text and for
  focus without an exception.
- A ratified dark-on-cyan pattern for filled buttons, which is what we have adopted here.
- An underline convention for link-style controls.
- A darker red, or an agreed pairing of red with an icon, so destructive text can clear
  4.5:1 unaided.
