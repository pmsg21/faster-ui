# @pmsg21/faster-ui

## 0.1.0

### Minor Changes

- 8337cf3: Add `Button` and `IconButton`, and ship a compiled stylesheet.

  `Button` has orthogonal `variant` (primary / outline / ghost / link) and `tone`
  (accent / danger) axes, three sizes, and loading and disabled states.
  `IconButton` composes it, requires `aria-label` at the type level, and adds a
  `shape` axis for the round and square forms the design documents.

  Accessibility is built into the components rather than left to the consumer:
  `type="button"` by default, `aria-disabled` instead of the native attribute so a
  disabled control stays reachable and announced, `aria-busy` with a text
  alternative while loading, a focus ring that meets SC 1.4.11, and touch targets
  that meet SC 2.5.8 at every size.

  **New requirement for consumers:** import the stylesheet.

  ```js
  import '@pmsg21/faster-ui/styles.css';
  ```

  It carries the tokens and the component classes, works with or without Tailwind,
  and deliberately contains no CSS reset. Dark mode remains one attribute on the
  root element.

  **Why this is a minor and not a major.** Three colour token groups were renamed —
  `text-*` → `content-*`, `border-*` → `line-*`, `ring-focus*` → `focus*` — because
  the old names produced stuttering utilities (`--color-text-primary` yields
  `text-text-primary`, and the documented `text-primary` never existed at all).
  Renaming a public token is normally breaking. It is not here: `0.0.1` shipped no
  components, and its `./styles.css` export was withdrawn precisely because the
  build emitted no CSS, so no consumer could have referenced a token by name. This
  is the first release in which the token layer is reachable, which is also the
  last moment these names can change for free.

## 0.0.1

### Patch Changes

- 52f0918: Initial published release of Faster UI, the PUMA design system foundation. No public components yet — this release establishes the package on npm and the automated release pipeline; `Button`, `Input`, and `Dialog` follow.
