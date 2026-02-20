# Release Train And Hotfix Protocol

## Release Train

- Weekly candidate cut from `main`.
- Candidate must pass full GA gate before promotion.
- Promotion includes signed artifacts and provenance attachments.

## Hotfix Protocol

1. Branch from latest GA tag.
2. Apply minimal scoped fix.
3. Run GA gate suite.
4. Publish with hotfix version suffix.
5. Merge hotfix back to `main`.

## Constraints

- No feature work in hotfix branches.
- No threshold relaxation during hotfix unless formally approved and documented.
