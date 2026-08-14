# Release pipeline verification

Evidence that the automated release pipeline works end to end, captured at the
first published version (`@pmsg21/faster-ui@0.0.1`). These are the artifacts to
show when walking through the CI/CD and supply-chain story.

## Live deliverables

- **npm:** https://www.npmjs.com/package/@pmsg21/faster-ui (0.0.1)
- **Storybook (GitHub Pages):** https://pmsg21.github.io/faster-ui/

## Token-free publish (OIDC trusted publishing)

No publishing credential exists in the repository. `gh secret list` is empty at
every scope:

- repo: _(empty)_
- environment `npm-publish`: _(empty)_
- environment `github-pages`: _(empty)_

npm records the publisher as GitHub Actions via a trusted publisher, not a token
(`npm view @pmsg21/faster-ui@0.0.1`):

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

`0.0.1` ships a signed provenance attestation. Both statements in the bundle are
recorded in the public sigstore transparency log:

- **SLSA provenance v1:** https://search.sigstore.dev/?logIndex=2464976199
- **npm publish attestation:** https://search.sigstore.dev/?logIndex=2464976925
- attestation bundle: https://registry.npmjs.org/-/npm/v1/attestations/@pmsg21%2ffaster-ui@0.0.1
- verify locally: `npm audit signatures`

`dist.attestations.provenance.predicateType` is `https://slsa.dev/provenance/v1`.
