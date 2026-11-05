# Release playbook — @passflow/react

Judgement only. The mechanics live in `.github/workflows/publish.yml` and `package.json`; read them, do not copy them here.

## Authority

- Publisher: CI. `publish.yml` runs on a pushed `v*` tag, checks the tag equals `package.json` `version`, runs `pnpm test:unit` and `pnpm build`, and publishes with `npm publish --provenance` over OIDC. Never publish locally: two publishers race.
- The `release-page` job in the same workflow creates the GitHub release after a successful publish.
- Who authorises: the ticket brief or Jack. A child session releases when its brief says so.

## Stages

none — one stage: npm `latest`.

## Order

1. Feature commits, then a `chore(release): X.Y.Z` commit on the same branch with the `CHANGELOG.md` entry (Keep a Changelog: Breaking/Added/Changed/Fixed, prose about impact) and the `package.json` version (`npm version X.Y.Z --no-git-tag-version`).
2. PR to `main`, CI green, merge.
3. Annotated, signed tag on the MERGE commit: `git tag -a vX.Y.Z -m "@passflow/react X.Y.Z" <merge-sha>`. Signing is automatic (`tag.gpgsign`, SSH hardware key): it may wait for a touch on the key.
4. `git push origin refs/tags/vX.Y.Z` — never `--tags`.

## Dependencies

- `@passflow/core` releases first when the React change needs it; the React `package.json` takes the published range, never a `file:` link.

## Done means

- `npm view @passflow/react@X.Y.Z version` answers, and `dist-tags.latest` is X.Y.Z (the two registry endpoints can disagree for about a minute).
- The GitHub release page for `vX.Y.Z` exists.

## Unknown

- Pre-release / `next` dist-tag process: unknown. TODO: settle when a pre-release is first needed.
- Monitoring after release: none known. TODO: ask Jack whether any consumer (login-app) must be bumped as part of "done".

verified: 2026-11-05 @ release of 0.20.2
