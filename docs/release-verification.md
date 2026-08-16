# Release pipeline verification

Evidence that the automated release pipeline works end to end. Captured at the first
published version (`0.0.1`) and re-verified on **every** release since, because a
supply-chain guarantee proven once is a guarantee about the past. These are the artifacts to
show when walking through the CI/CD story.

## Live deliverables

- **npm:** https://www.npmjs.com/package/@pmsg21/faster-ui (latest **0.3.0**)
- **Storybook (GitHub Pages):** https://pmsg21.github.io/faster-ui/

## Every release, re-verified

Each row was checked three ways: `dist.attestations` on the published tarball,
`_npmUser.trustedPublisher` proving no token was involved, and both sigstore transparency
log entries resolving publicly.

| Version | Contents                                   | Trusted publisher | SLSA provenance v1                                             | npm publish attestation                                        |
| ------- | ------------------------------------------ | ----------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| `0.0.1` | scaffold, token layer                      | `github` ✅       | [2464976199](https://search.sigstore.dev/?logIndex=2464976199) | [2464976925](https://search.sigstore.dev/?logIndex=2464976925) |
| `0.1.0` | `Button`, `IconButton`, compiled CSS       | `github` ✅       | [2488573425](https://search.sigstore.dev/?logIndex=2488573425) | [2488573512](https://search.sigstore.dev/?logIndex=2488573512) |
| `0.2.0` | `Input`; tree-shaking fix; token removal   | `github` ✅       | [2490539679](https://search.sigstore.dev/?logIndex=2490539679) | [2490539890](https://search.sigstore.dev/?logIndex=2490539890) |
| `0.3.0` | `Dialog`; `cva` tree-shaking fix; 3 tokens | `github` ✅       | [2492714519](https://search.sigstore.dev/?logIndex=2492714519) | [2492715085](https://search.sigstore.dev/?logIndex=2492715085) |

`dist.attestations.provenance.predicateType` is `https://slsa.dev/provenance/v1` on all
four. The `0.3.0` SLSA statement names its own build inputs, read out of the bundle rather
than assumed:

```text
buildType  : https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1
workflow   : .github/workflows/release.yml
repository : https://github.com/pmsg21/faster-ui
subject    : pkg:npm/%40pmsg21/faster-ui@0.3.0
```

**`0.1.0` was published without being recorded here**, and the gap was found only when
`0.2.0` came to be written up. Nothing was wrong with that release — its attestations are
above and they verify — but a verification document that skips a version is asserting less
than it appears to. Re-verifying every release, rather than the first one, is the correction.

**`0.3.0` is the first release where that correction was tested rather than stated**, and
the operative word turned out to be _when_. The `0.1.0` failure was **deferral**, not
ordering: it was written up in a later session, by which point nobody remembered it was
missing. So this row was captured in the same session as the publish, minutes after the run
finished, from the live attestation bundle.

It was tempting to pre-write the row on the release branch so it landed atomically with the
version bump. That was rejected: the log indices and the publisher block are **outputs** of
the publish, and a placeholder in a document whose entire job is attestation is worse than a
gap — a gap is visibly missing, whereas a placeholder looks like evidence. Recording
immediately is the achievable version of the rule; recording _before_ is not.

## Token-free publish (OIDC trusted publishing)

No publishing credential exists in the repository. `gh secret list` is empty at
every scope:

- repo: _(empty)_
- environment `npm-publish`: _(empty)_
- environment `github-pages`: _(empty)_

Re-checked at `0.2.0` and again at `0.3.0` — the latter **before** the publish rather than
after, so the claim covers the run that actually happened: repo scope empty, `npm-publish`
empty, `github-pages` empty.

npm records the publisher as GitHub Actions via a trusted publisher, not a token
(identical at `0.0.1`, `0.1.0`, `0.2.0` and `0.3.0`):

```json
"_npmUser": {
  "name": "GitHub Actions",
  "email": "npm-oidc-no-reply@github.com",
  "trustedPublisher": { "id": "github", "oidcConfigId": "oidc:dd114caa-…" }
}
```

The Release run log confirms the path:

```text
No NPM_TOKEN found, but OIDC is available - using npm trusted publishing
success packages published successfully
New tag: v0.0.1
```

## Provenance attestation

Every published version ships a signed provenance attestation, and both statements in each
bundle are recorded in the public sigstore transparency log — see the table above for the
per-version log indices.

- attestation bundle (any version):
  `https://registry.npmjs.org/-/npm/v1/attestations/@pmsg21%2ffaster-ui@<version>`
- verify locally: `npm audit signatures`
