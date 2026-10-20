# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Blank page, "Failed to resolve module specifier" | opened `index.html` with `file://` | run `node serve.mjs` and open `http://127.0.0.1:5173/` |
| Port already in use | another server on 5173 | `PORT=5199 node serve.mjs` |
| `capture.mjs`: "Install a browser driver" | no `puppeteer-core` | `npm i -D puppeteer-core` in the project, set `CHROME_PATH` if Chrome is not in a standard place |
| Frames are black in CI or a container | no GPU | the script already uses software GL (SwiftShader); allow 30 s |
| Everything is dark at night | no light source in the scene | add a `PointLight` next to glowing objects |
| Object seems to float | y offset wrong | the floor is y = 0; a box of height h sits at y = h / 2 |
| "scene does not change over time" | motion depends on something other than `t` | animate from the `t` argument of `update` |
| `lint-scene` says Math.random | non reproducible | use `kit.rng(seed)` |
