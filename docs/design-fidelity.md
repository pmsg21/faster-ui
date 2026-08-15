# Design fidelity — where Faster UI differs from the Figma file, and why

Faster UI is built from the TapTap Design System Figma file. Every colour, type step and
measurement is transcribed from it, and every raw value in the codebase is traceable back
to a specific node.

In seven places the shipped component does **not** look identical to the mock. This page
lists all seven, with the measured numbers and the WCAG criterion each one turns on. It
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

Every ratio below is computed from the shipped tokens by
[`src/styles/contrast-contract.ts`](../src/styles/contrast-contract.ts) and re-checked on
every CI run, so this table cannot silently drift from the code.

## The register

| #   | What                                             | Figma                                       | Shipped                           | Ratio                                          | Criterion |
| --- | ------------------------------------------------ | ------------------------------------------- | --------------------------------- | ---------------------------------------------- | --------- |
| 1   | Label on the filled (solid) buttons              | white                                       | `neutral-700` (near-black)        | accent 2.12 → **7.78**; danger 3.47 → **4.75** | 1.4.3     |
| 2   | Link-style button                                | no underline, colour only                   | underlined in **every** state     | —                                              | 1.4.1     |
| 3   | Outline hover/pressed + Link labels, accent tone | cyan (`primary-500`/`600`/`700`)            | neutral, darkening on interaction | 1.88–2.80 → **8.72–15.12**                     | 1.4.3     |
| 4   | Outline/Ghost/Link labels, danger tone           | tracks the ramp per state (600 / 500 / 700) | pinned to `danger-700`            | 2.98–4.21 → **4.21**                           | 1.4.3     |
| 5   | Danger Ghost pressed background                  | `danger-300`                                | `danger-200`                      | 2.97 → **3.69**                                | 1.4.11    |
| 6   | Link-style button target height                  | 18 / 22 / 24 px                             | minimum 24 px, label centred      | —                                              | 2.5.8     |
| 7   | Focus state (**an addition, not a change**)      | none drawn                                  | 2px neutral ring, 2px offset      | **15.79–16.48**                                | 1.4.11    |

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

## On the number seven

Seven differences across one component is a considered position — each one is measured,
each turns on a specific criterion, and each was the smallest change that clears it.
Fifteen would be a different thing entirely: at that point the honest description is that
we are redesigning rather than implementing. The count is tracked deliberately as Input
and Dialog land, and if the rate holds it is a signal to stop and re-examine the approach
rather than keep adding rows.

## What we would take back to design

- A darker step on the brand ramp (a `primary-800`) so cyan can be used for text and for
  focus without an exception.
- A ratified dark-on-cyan pattern for filled buttons, which is what we have adopted here.
- An underline convention for link-style controls.
- A darker red, or an agreed pairing of red with an icon, so destructive text can clear
  4.5:1 unaided.
