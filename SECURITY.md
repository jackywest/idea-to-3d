# Security

What this skill does and does not do:

- Writes only inside the folder you give to `scaffold.mjs` (refuses a non-empty folder, a filesystem root or your home directory unless `--force`).
- The scene server listens on `127.0.0.1` only and serves files from the scene folder only (path traversal is tested).
- No network call at runtime, no telemetry, no analytics, no remote font or texture, no `curl | bash`. Three.js is vendored.
- `lint-scene.mjs` rejects generated scenes that use `fetch`, `eval`, external URLs, storage or cookies.
- `install.mjs` copies files into `~/.claude/skills/idea-to-3d` (or `./.claude/skills`) and refuses to overwrite without `--force`.
- GitHub Actions in this repo have read-only permissions and pinned commit SHAs.

Report a vulnerability: open a private advisory (Security tab > Report a vulnerability). Please do not file public issues for security problems.
