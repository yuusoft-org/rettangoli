# Docker E2E fixtures

Run `bun run test:e2e:full` to build the local production-dependency image and
verify capture, failing comparison, acceptance, and passing comparison. The
managed-service fixture also verifies that the preview process shuts down.

Fixtures use a local HTML template without network assets and one capture
worker, so screenshots and metrics do not depend on CDN contents or host CPU
counts. The image verifies CLI dependency versions before these tests run.

After an intentional output-contract change, `node e2e/run.js --update`
regenerates all expected directories through the real commands. Inspect the
images and output changes, then run `bun run test:e2e` again without `--update`.
