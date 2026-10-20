# Migrating from v0.1 to v0.2

Nothing is required: a v0.1 `src/scene.js` still runs. To adopt the new features:

| v0.1 | v0.2 |
|---|---|
| `update(t)` moves objects by hand | `cine.path / act / turn / attach / toss` describe the action; `update` is optional (water, lights) |
| orbit camera with `config.camera` | `cine.shot({... why})` per beat; no shots = old orbit camera |
| `kit.robot()` arms/head | same fields, plus `legL legR upper` and `height`; legs pivot at the hip |
| primitives only | `assets.model/character` with the bundled CC0 pack or your own GLB (`references/assets.md`) |
| `capture.mjs` for frames | `cine-qa.mjs` for audit + contact sheet + preview video (`capture.mjs` still works) |

Upgrading an existing scene folder: run `scaffold.mjs` into a NEW folder and copy your `src/scene.js` across. Never run it over a folder you care about (it refuses non-empty folders unless `--force`).
