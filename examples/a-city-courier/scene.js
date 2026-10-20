// A · City + dynamic camera. A courier walks through a small town, waits for a taxi, crosses, and hands a parcel to someone.
// Assets: Kenney city/car/character kits (CC0), see assets/NOTICE.md.
import { Assets } from './assets.js';
import { buildCity } from './city.js';

const CELL = 8, H = 2.2;
export default {
  title: 'Delivery day',
  config: { mood: 'day', duration: 27, fog: [90, 260], camera: { radius: 30, height: 12, target: [0, 2, 0] } },
  async build({ scene, kit, cine, THREE }) {
    const assets = new Assets();
    const city = await buildCity({ scene, cine, assets, cell: CELL, seed: 4, houses: 'bc', skyscrapers: ['a'], lamps: true,
      rows: ['SbSa|ScSb', 'abcd|efga', '----+----', 'hbhe|hcht', 'tpth|thpt'] });
    const zRoad = city.laneZ(2), xCross = city.laneX(4), sw = 2.9;
    const zN = zRoad - sw, zS = zRoad + sw;                         // north / south sidewalk centre lines
    scene.fog.color.set('#cfe3f5');

    // cast: courier, recipient, passers-by
    const mk = async (name, h = H) => cine.actor(name, await assets.character('kenney-mini-characters/' + name.split(':')[1], { height: h }), { height: h, radius: 0.35, strideLen: 2.3 });
    const hero = await mk('hero:character-female-b'), friend = await mk('friend:character-male-c'), p1 = await mk('p1:character-male-a'), p2 = await mk('p2:character-female-d');
    const parcel = cine.prop('parcel', await assets.model('kenney-car-kit/box', { height: 1.0 }), { size: 1.0 });
    const xStart = city.laneX(0) - 2, xDoor = city.laneX(6) + 0.5, xEnd = city.laneX(8);

    cine.place(hero, [xStart, 0, zN], 90); cine.place(friend, [xDoor + 3.5, 0, zS + 0.6], -90); cine.place(p1, [city.laneX(8), 0, zN], -90); cine.place(p2, [city.laneX(0), 0, zS + 0.4], 90);
    cine.path(hero, [[xStart, 0, zN], [xCross - 5.2, 0, zN]], { t: 0.8, dur: 8.2, anim: 'walk' });
    cine.act(hero, 'idle', { t: 9, dur: 3.4 }); cine.turn(hero, [xCross - 4, 0, zRoad - 7], { t: 9.2, dur: 0.5 });
    cine.path(hero, [[xCross - 5.2, 0, zN], [xCross - 5.2, 0, zS]], { t: 12.4, dur: 1.9, anim: 'walk' });
    cine.path(hero, [[xCross - 5.2, 0, zS], [xDoor - 1.5, 0, zS]], { t: 14.3, dur: 4.7, anim: 'walk' });
    cine.act(hero, 'idle', { t: 19, dur: 1.2 });
    cine.act(hero, 'reach', { t: 20.2, dur: 1.6 });
    cine.turn(friend, hero, { t: 17.5, dur: 0.6 }); cine.act(friend, 'cheer', { t: 22, dur: 3 });
    cine.act(hero, 'wave', { t: 22.4, dur: 2.2 });
    cine.path(p1, [[city.laneX(8), 0, zN], [city.laneX(2), 0, zN]], { t: 14, dur: 13, anim: 'walk' });
    cine.path(p2, [[city.laneX(0), 0, zS + 0.4], [city.laneX(2), 0, zS + 0.4]], { t: 0, dur: 14, anim: 'walk' });
    // parcel: carried, handed over, held by the friend
    cine.attach(parcel, hero, { t0: 0, t1: 21.2, offset: [0.4, 1.55, 0.7] });
    cine.attach(parcel, friend, { t0: 21.4, t1: 1e9, offset: [0, 1.5, 0.7] });

    // traffic: a taxi that makes the courier wait, a van later
    const car = async (id, path, t, dur, h = 1.9) => { const m = await assets.model('kenney-car-kit/' + id, { size: 4.4 }); const a = cine.actor('car-' + id + t, { group: m, height: h }, { height: h, radius: 1.2, clips: { idle() {}, drive() {} } }); a.canJump = true; a.vanish = true; a.allow = ['*obstacle']; cine.path(a, path, { t, dur, anim: 'drive', ease: 'lin', k: 1 }); return a; };
    const taxi = await car('taxi', [[city.laneX(8) + 6, 0, zRoad - 1.6], [city.laneX(0) - 8, 0, zRoad - 1.6]], 8.2, 6.2);
    await car('delivery', [[city.laneX(0) - 8, 0, zRoad - 1.6], [city.laneX(8) + 6, 0, zRoad - 1.6]], 15.5, 7);
    const parked = await assets.model('kenney-car-kit/sedan', { size: 4.4 }); parked.position.set(city.laneX(7) + 2, 0, zRoad + 0.9); parked.rotation.y = Math.PI / 2; scene.add(parked); cine.obstacle(parked);
    const cone = await assets.model('kenney-car-kit/cone', { height: 1.0 }); cone.position.set(xCross + 4.5, 0, zS - 0.2); scene.add(cone);

    const crossing = [city.laneX(4), 2, city.laneZ(2)];
    // shots: each move has a reason
    cine.shot({ t: 0, dur: 4, type: 'move', fov: 44, why: 'open on the town, then land on the courier', ease: 'soft',
      from: { focus: crossing, dist: 50, azimuth: 100, angle: 0, elev: 26 }, to: { focus: hero, size: 'wide', angle: 'threequarter', elev: 8 } });
    cine.shot({ t: 4, dur: 5, type: 'track', focus: hero, size: 'full', angle: 'side', side: 'right', lead: 0.8, smooth: 0.6, elev: 4, blend: 0.8, why: 'walk with her, shop fronts slide by' });
    cine.shot({ t: 9, dur: 3.4, type: 'move', fov: 40, why: 'she stops: the taxi is the event, the camera looks where she looks',
      from: { focus: hero, size: 'full', angle: 'back-threequarter', elev: 4 }, to: { focus: taxi, size: 'wide', angle: 'side', side: 'right', elev: 4 } });
    cine.shot({ t: 12.4, dur: 6.6, type: 'track', focus: hero, size: 'full', angle: 'threequarter', side: 'right', lead: 0.7, smooth: 0.6, elev: 5, blend: 0.6, why: 'cross when the road is clear' });
    cine.shot({ t: 19, dur: 2.6, type: 'move', fov: 38, why: 'the parcel changes hands: push in on the exchange',
      from: { focus: [hero, friend], size: 'wide', azimuth: 200, angle: 0, elev: 8 }, to: { focus: [hero, friend], size: 'full', azimuth: 200, angle: 0, elev: 4 } });
    cine.shot({ t: 21.6, dur: 2.2, type: 'static', focus: friend, size: 'medium', azimuth: 215, angle: 0, elev: 4, why: 'react: the delivery lands' });
    cine.shot({ t: 23.8, dur: 3.2, type: 'move', fov: 44, ease: 'soft', why: 'step back: the whole street behind that small moment',
      from: { focus: [hero, friend], size: 'wide', azimuth: 200, angle: 0, elev: 6 }, to: { focus: crossing, dist: 52, azimuth: 262, angle: 0, elev: 28 } });
  },
};
