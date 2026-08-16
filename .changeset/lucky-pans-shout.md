---
'@pmsg21/faster-ui': minor
---

Add `Button` and `IconButton`, and ship a compiled stylesheet.

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
