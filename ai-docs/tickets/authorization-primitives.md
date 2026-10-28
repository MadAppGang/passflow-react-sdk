# Authorization primitives for resource servers (Go + Node)

**Filed as PFL-669** — https://linear.app/madappgang/issue/PFL-669/authorization-primitives-for-resource-servers-go-node

The Linear ticket is the source of truth and is newer than the draft this file held.
It carries three edits made after filing:

1. a note that a Go SDK module exists at `sdk/go/passflow` but is client-side
   (CLI/agent auth) and carries no authorization primitives;
2. an open decision on the package's home — probably `sdk/go/` (e.g. `sdk/go/authz`),
   pending a check on how `sdk/go/passflow` is published;
3. a link to PR #207, which adds `ExposedHeaders: []string{"WWW-Authenticate"}` to
   `DefaultCors` — open, not merged.

The draft body was removed rather than kept in parallel, so there is one copy to read.
