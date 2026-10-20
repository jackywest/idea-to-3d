# Scene contract

`src/scene.js` default-exports:

```js
export default {
  title: 'Shown bottom-left',
  config: {
    mood: 'day',            // 'day' | 'sunset' | 'night' | 'studio'
    duration: 8,            // loop length in seconds; update() receives t in [0, duration)
    pixel: false,           // true = chunky retro pixel look
    camera: { radius: 10, height: 4, target: [0, 1.5, 0], sway: 0.2 },  // sway = slow auto-orbit amplitude (radians)
  },
  build(ctx) { /* create objects once; keep references on `this` */ },
  update(t, ctx) { /* pure function of t: set positions/rotations */ },
};
```

`ctx` = `{ THREE, kit, scene, camera, renderer, mood, config, cine, assets }` (`assets` = `new Assets()` with the default resolver `./assets/<id>.glb`). `build` may be `async` (asset loading). `cine` is the Director: when a scene defines shots (`cine.shot`) the camera follows them; otherwise the old orbit camera is used (v0.1 behaviour). `config.fog = [near, far]` sets fog for large scenes. Imports available to a scene (it lives in `src/`): `./assets.js` (`Assets`, `KENNEY_CLIPS`, `EXPRESSIVE_CLIPS`), `./city.js` (`buildCity`).

Full direction vocabulary: `cinematography.md`.

## kit helpers (all return THREE objects, colours are CSS hex strings)

| Helper | Use |
|---|---|
| `box(w,h,d,color,pos,rot,opts)` `cyl(rTop,rBottom,h,color,pos,rot,opts,segments)` `cone(r,h,color,pos,rot,opts,segments)` `ball(r,color,pos,opts)` | primitives. `opts`: `{glow:true}` = unlit emissive look, `{rough, metal}` |
| `group(...children)` | combine parts into one movable object |
| `ground(size,color,y)` | round floor |
| `tree(h,leaf,trunk)` `rock(s,color)` `house(w,h,wall,roof)` `lamp(color)` | ready-made props |
| `robot({body,accent,eye,dark,scale})` | returns `{group, head, armL, armR, legL, legR, eyes}` to animate |
| `terrain({size,seg,height,flatRadius,seed,colors,edge})` | hilly ground with vertex colours; returns `{mesh, heightAt(x,z)}`. Put every prop at `y = heightAt(x,z)` so nothing floats. `edge` > 0 sinks the rim under water (island) |
| `scatter(geo,color,n,{radius,minR,rng,heightAt,scale,jitter,yOff,avoid,tilt})` | n copies in ONE draw call: grass (`grassBlade()`), flowers (`flowerGeo()`), pebbles. Use hundreds, not a dozen |
| `pine` `roundTree` `bush` `fence` `windmill` (returns `{group, blades}`) | richer props |
| `clouds(n,{seed})` + `driftClouds(list,t,speed)` | drifting sky clouds |
| `water(size,color)` + `animateWater(mesh,t,amp)` | waving sea |
| `fireflies(n,{radius,y,color})` + `animateFireflies(pts,t)` | glowing drifting points (fireflies, sparks, dust) |
| `moon()` | glowing disc for night skies |
| `noise2(x,z,seed)` | smooth deterministic noise |
| `stars(n,radius,seed)` | night sky (already added when `mood:'night'`) |
| `sign(text,{w,h,bg,fg})` | text on a plane (canvas texture, no font download) |
| `ease.inOut(t)` `ease.out(t)` `clamp` `lerp` | animation maths |
| `rng(seed)` | seeded random, returns a function in [0,1) |

Position arrays are `[x, y, z]`, y is up, the floor is at y = 0. One unit is about one metre; a person is about 1.7.

## Lights

`mood` sets ambient + one shadow-casting sun + sky/fog colour. Add your own lights in `build` (`new ctx.THREE.PointLight(color, intensity, distance)`); glowing objects need a real light to illuminate their surroundings.

## Query parameters (for the user and for tests)

`?mood=night` `?pixel=1` `?t=3.5` (freeze at 3.5 s) `?capture=1` (no free-running loop: render only when `window.__setTime(t)` is called). Key `C` toggles free camera during a cinematic. `window.__setTime(t)`, `window.__cine`, `window.__i3d` (`ready`, `errors`) exist for the QA scripts.

## Limits

No external assets, no network, no user input beyond the built-in orbit camera. For models loaded from files, textures or video export, this template is deliberately not the tool.

## Recipes

**Orbit a moving object around the hero** (radius `R`, one lap per loop). Local +x is the front of the object, so rotate it to face its direction of travel:
```js
const a = t / config.duration * Math.PI * 2;
boat.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
boat.rotation.y = -a - Math.PI / 2;   // front (+x) points along the path; flip by Math.PI if it moves backwards
```
**Looping smoke / particles:** `const p = ((t / duration) * 2 + i / n) % 1;` then `y = baseY + p * 3`, `scale = 0.3 + p`, and fade by shrinking when `p > 0.8`. Keep the plume under 4 units so it stays in frame.

**Horizon:** `kit.ground(size, color)` is a round disc, so its edge can show. Use `size` of at least 60 (fog hides the rim) or colour the ground like the sea/sky horizon.

## buildCity (from './city.js')

```js
import { buildCity } from './city.js';
const city = await buildCity({ scene, cine, assets, cell: 8,            // metres per map cell
  rows: ['SbSa|ScSb', 'abcd|efga', '----+----', 'hbhe|hcht', 'tpth|thpt'],   // see the legend at the top of city.js
  houses: 'bc', skyscrapers: ['a'], lamps: true, tint: [...pastels] });   // tint=false for the original greys
// returns { root, cell, world(i,j) -> Vector3, laneZ(i) (z of an east-west road row), laneX(j), sidewalk, buildings[] }
```
Buildings are registered as camera obstacles automatically. Sidewalk centre lines are at road z +/- 2.9 m and buildings start at +/- 4.2 m (cell 8). Only ids present in `assets/` can be used: `houses` and `skyscrapers` pick from the bundled ones.

## Characters that are not GLB files

`kit.robot()` and `kit.dog()` return rigs the Director animates with built-in clips (`robotClips`, `dogClips` in `anims.js`). For your own procedural character, return `{ group, head, armL, armR, legL, legR, torso, height }` and pass your own `clips: { idle(rig, p, k) {...}, walk(...) }` to `cine.actor(name, rig, { height, clips })`; clips set rotations from `p` (seconds) and must not accumulate.
