// B · Cartoon action. A robot delivers a parcel, trips on a cone, the parcel flies, someone reacts.
// Assets: RobotExpressive (CC0), Kenney city/car/character kits (CC0), see assets/NOTICE.md.
import { Assets, EXPRESSIVE_CLIPS } from './assets.js';
import { buildCity } from './city.js';

export default {
  title: 'Special delivery',
  config: { mood: 'day', duration: 19, fog: [70, 200] },
  async build({ scene, kit, cine, THREE }) {
    const assets = new Assets();
    const city = await buildCity({ scene, cine, assets, cell: 8, seed: 9, houses: 'bc', lamps: true, rows: ['abcdef', '------', 'hbhchb', 'tpttpt'] });
    scene.fog.color.set('#cfe3f5');
    const zRoad = city.laneZ(1), zS = zRoad + 2.9, x0 = city.laneX(0), xDoor = city.laneX(4) + 1;
    const robotRig = await assets.character('robot-expressive/RobotExpressive', { height: 2.5, map: EXPRESSIVE_CLIPS, yaw: 0 });
    const bot = cine.actor('robot', robotRig, { height: 2.5, radius: 0.5, strideLen: 2.0 });
    const girl = cine.actor('girl', await assets.character('kenney-mini-characters/character-female-e', { height: 2.2 }), { height: 2.2, radius: 0.35 });
    const parcel = cine.prop('parcel', await assets.model('kenney-car-kit/box', { height: 1.0 }), { size: 1.0 });
    const cone = await assets.model('kenney-car-kit/cone', { height: 1.1 }); const xCone = xDoor - 9; cone.position.set(xCone, 0, zS); scene.add(cone);
    const car = await assets.model('kenney-car-kit/sedan', { size: 4.4 }); car.position.set(city.laneX(2), 0, zRoad - 1.7); car.rotation.y = Math.PI / 2; scene.add(car);

    cine.place(bot, [x0 - 6, 0, zS], 90); cine.place(girl, [xDoor, 0, zS + 0.3], -90);
    const tTrip = 6.4, xTrip = xCone - 1.2;
    cine.path(bot, [[x0 - 6, 0, zS], [xTrip, 0, zS]], { t: 1, dur: tTrip - 1, anim: 'carrywalk' });
    cine.act(bot, 'fall', { t: tTrip, dur: 2.6 }); cine.act(bot, 'stand', { t: tTrip + 2.6, dur: 3 });
    cine.attach(parcel, bot, { t0: 0, t1: tTrip + 0.15, offset: [0, 1.5, 0.8] });
    cine.toss(parcel, { t: tTrip + 0.15, dur: 1.5, from: [xTrip + 1.0, 2.0, zS], to: [xDoor - 1.5, 0, zS + 0.2], arc: 4.2, spin: 7, floor: 0.5 });
    cine.event(tTrip + 1.65, 'impact', { power: 0.8 });
    cine.turn(girl, bot, { t: 3, dur: 0.5 });
    cine.act(girl, 'idle', { t: 0, dur: tTrip + 1.0 }); cine.act(girl, 'startle', { t: tTrip + 1.55, dur: 1.2 }); cine.act(girl, 'oops', { t: tTrip + 2.8, dur: 2.2 }); cine.act(girl, 'shrug', { t: tTrip + 5.0, dur: 2 });
    cine.turn(girl, parcel, { t: tTrip + 1.7, dur: 0.3 });

    const street = [city.laneX(2), 2, zRoad];
    cine.shot({ t: 0, dur: 3.4, type: 'move', fov: 44, ease: 'soft', why: 'set the scene: a quiet street, a robot with a parcel, someone waiting at a door',
      from: { focus: street, dist: 46, azimuth: 80, angle: 0, elev: 22 }, to: { focus: [bot, girl], size: 'wide', azimuth: 120, angle: 0, elev: 10 } });
    cine.shot({ t: 3.4, dur: 3.0, type: 'track', focus: bot, size: 'full', azimuth: 140, angle: 0, lead: 0.5, smooth: 0.5, elev: 5, blend: 0.6, why: 'walk with him toward the door' });
    cine.shot({ t: tTrip - 0.2, dur: 1.1, type: 'static', focus: bot, aim: 'feet', size: 'close', azimuth: 130, angle: 0, elev: 3, why: 'the cone he has not seen: show the cause just before the trip' });
    cine.shot({ t: tTrip + 0.9, dur: 2.1, type: 'track', focus: parcel, size: 'wide', azimuth: 125, angle: 0, lead: 0.3, elev: 12, why: 'follow the parcel flying through the air' });
    cine.shot({ t: tTrip + 3.0, dur: 2.2, type: 'static', focus: girl, size: 'full', azimuth: 150, angle: 0, elev: 4, why: 'reaction: her face as it lands at her feet' });
    cine.shot({ t: tTrip + 5.2, dur: 3.0, type: 'move', fov: 40, why: 'pull out to show the whole mess: robot on the ground, parcel, her',
      from: { focus: [girl, parcel], size: 'wide', azimuth: 150, angle: 0, elev: 6 }, to: { focus: [bot, parcel, girl], size: 'wide', azimuth: 110, angle: 0, elev: 12 } });
    cine.shot({ t: tTrip + 8.2, dur: 4.4, type: 'move', fov: 42, ease: 'soft', why: 'end wide: the street as it was, now with a story in it',
      from: { focus: [bot, parcel, girl], size: 'wide', azimuth: 110, angle: 0, elev: 12 }, to: { focus: street, dist: 46, azimuth: 275, angle: 0, elev: 24 } });
  },
};
