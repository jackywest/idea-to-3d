# Changelog

## 0.2.0
**From a scene generator to a small film director.**
- **Director** (`template/src/cine.js`): actors on timelines (paths, clips, turns), props (attach, toss, fall, keyframes), impact shake, and **motivated shots**: tracking, push/pull, reveal, pan, orbit, truck, static, group framing, blends. Every moving shot needs a `why`. The camera avoids walls and occluders without popping between angles.
- **Real assets**: GLB loader (`assets.js`) with scale/ground normalisation, skinned characters, clip maps and distance-driven walk cycles (no foot sliding). Bundled **CC0 pack** (Kenney city/cars/characters/space + RobotExpressive, 3.7 MB, `assets/NOTICE.md`).
- **City builder** (`city.js`): an ASCII map becomes roads, buildings that face the street, trees and lamps on a coherent grid.
- **QA that looks at the film**: `cine-qa.mjs` audits subject framing, occlusion, camera-in-geometry, body penetration, jerks, static scenes and unmotivated moves; writes a contact sheet of every shot and an MP4 preview. It prints *when* each problem happens.
- **Three new demos** (A city + tracking camera, B cartoon mishap, C information staged) replace the v0.1 examples as the showcase. v0.1 examples are kept in `examples/legacy/` and still run.
- Brighter, warmer lighting, tone mapping and sky dome; `?capture=1` deterministic mode; fog configurable per scene.
- Tests: 30+ (was 12): cinematography audit on every demo, negative tests on a deliberately bad scene, determinism, asset loader refusals (path traversal, schemes, broken files, missing clips), a corrected path-traversal test using a canary file outside the project, performance budget, hygiene.
- Fixes: the static server now also starts correctly from a symlinked folder; the old traversal test compared a request with itself and proved nothing (replaced).

### Compatibility
v0.1 scenes (`build`/`update`, no `cine`) run unchanged and keep the orbit camera. `kit.robot()` now has hip-pivot legs and an `upper` body (same field names plus `legL legR upper`). See `MIGRATION.md`.

## 0.1.0
First public release: one-sentence low-poly scenes, orbit camera, 4 moods, lint + headless capture.
