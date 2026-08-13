# Contributing

## Commit messages

Conventional Commits, enforced on `commit-msg`:

```
feat: add Dialog size variants
fix: restore focus to trigger on Dialog close
docs: document token layers
build: configure Cypress component testing
```

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`,
`refactor`, `revert`, `style`, `test`.

## Changesets

Any change to the public API needs a changeset:

```bash
pnpm changeset
```

Pick the bump and write the entry **for the consumer**, not for the commit log.

> "The `spacing-md` token moved from 12px to 16px; check components with
> dense layouts" is useful. "fix: spacing" is not.

In a design system, a breaking change is not only a changed signature.
Renaming a token, changing a spacing value, or altering the DOM a component
emits will all break someone with a CSS selector pointing at your internals.
