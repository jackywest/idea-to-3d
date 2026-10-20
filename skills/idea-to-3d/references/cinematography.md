# Directing a short film with the Director

You are not placing objects, you are telling a small story. Decide these BEFORE writing code:

1. **Story card** (five lines): who is the hero, what do they want, what gets in the way, how does someone react, what is the last image.
2. **Beats**: 4 to 8. Each beat = one action + one shot. A beat that adds nothing is cut (removal test).
3. **Geography**: where is the hero going, where is the camera allowed to stand? On a street, the long axis of the road is the only place wide shots can go. Write down the axis before choosing angles.

## Director API (all times in seconds, everything is a pure function of t)

```js
const bot = cine.actor('bot', await assets.character(id, {height: 2.2}), {height: 2.2});
cine.place(bot, [x, 0, z], faceDegrees);
cine.path(bot, [[x,0,z], ...], {t, dur, anim: 'walk' | 'run' | 'carrywalk'});   // legs follow distance: no foot sliding on GLB characters
cine.act(bot, 'wave', {t, dur});         // idle, talk, wave, point, reach, carry, oops, startle, shrug, sad, cheer, push, fall, stand
cine.turn(bot, target, {t, dur});        // face an actor / prop / [x,y,z]
const box = cine.prop('box', obj3d);  cine.attach(box, bot, {t0, t1, offset:[0,1.5,0.7]});
cine.toss(box, {t, dur, from, to, arc}); cine.fall(box, {t, from, floor});  cine.keys(obj, [{t,pos,rot,scale,vis}]);
cine.event(t, 'impact');                 // handheld shake on the camera
cine.obstacle(object3d);                 // buildings, walls: the camera will never go inside or behind them
cine.shot({t, dur, type, focus, size, azimuth, angle, elev, lead, blend, why});
```

### Shots
- `type`: `static`, `track` (follows `focus`, `lead` looks slightly ahead, `smooth` = seconds of smoothing), `move` (interpolates `from` -> `to`, each a mini shot spec: use it for push-ins, pull-backs, reveals, pans from A to B), `orbit` (`a0`..`a1` degrees), `truck` (slides sideways), `push` (`size0`..`size1`).
- `focus`: an actor, a prop, `[x,y,z]`, a function of t, or an ARRAY of those (auto-framed group shot).
- `size` (how much world is in frame, as a multiple of the subject height): `extreme .22, close .4, medium .95, full 1.6, wide 3.2, establishing 9`; or a number; or `dist` in metres.
- Angles: `angle` is relative to the subject's facing in degrees (0 = camera in front, 90 = side, 180 = behind) or `front threequarter side back`; `azimuth` is ABSOLUTE degrees from +Z (0 = camera south of the subject, 90 = east, 180 = north, 270 = west). Use `azimuth` for anything near buildings.
- `why` is REQUIRED on every moving shot. Write the reason a viewer would feel ("she stops: the taxi is the event"). No reason, no move: use `static`.
- `blend: 0.6` blends from the previous shot's pose instead of cutting (continuous move). Default is a cut.
- `cine.dip(t0, t1, '#000')` fades to colour and back.

### Camera recipes (worked examples)
- Camera due **south** of a subject, front view: `azimuth: 0, angle: 0`. Due north: `azimuth: 180`. Looking along an east-west street from the east end: `azimuth: 90` (west end: `270`).
- Over-the-shoulder-ish, three quarters from the subject's front-left: `angle: 35, side: 'left'` (relative to its facing; no `azimuth`).
- `static` still FOLLOWS a moving `focus` (it only means "no camera move relative to it"). To hold a fixed view of a place, use a point focus `[x, y, z]`.
- `size` multiplies the subject's height. Kenney characters are chibi (big heads, 2.2 m tall in the demos): `medium` is already a close-up, `full` shows the whole body. On a point focus the height is 1.5 m.
- Shots are cut exactly at `t`; the QA ignores the instant of a cut, so you do not need to align cuts to a grid.

### Rules that keep it cinematic
- Dynamic does not mean busy. A static shot on a reaction is often the best shot. Average shot length 2 to 5 s.
- One idea per shot: the subject is big enough (median at least 12 % of frame height, close-ups 40 %+).
- Cut on action. Show the cause before the effect (the cone, then the trip). Show the reaction after the impact.
- Keep the 180-degree line: do not flip the camera to the other side of a walking hero between cuts unless you motivate it.
- Information is spatial: inputs on one side, the machine in the middle, results on the other; the camera follows the thing that carries the information.
- Do not trust your eyes on code alone: run `cine-qa.mjs` and LOOK at the contact sheet (`qa/sheet-*.png`) and a few frames of the preview video.

## What `cine-qa.mjs` measures (and what it cannot)

It samples the whole timeline and reports: subject off-frame %, too-small %, occluded %, camera inside geometry %, bodies interpenetrating %, floating feet %, abrupt camera accelerations, total motion, moving shots without `why`. It prints WHEN problems happen (`details`) so you can fix the right shot.
It does NOT judge beauty, comedy or clarity of the story. Those need your eyes on the contact sheet and the preview video, and an honest verdict. A passing audit is the floor, not the goal.
