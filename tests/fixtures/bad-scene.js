// Deliberately bad: static scene, camera inside a wall, moving shot without a reason, subject out of frame.
export default {
  title: 'fixture bad', config: { mood: 'day', duration: 6 },
  build({ scene, kit, cine }) {
    scene.add(kit.ground(40, '#7bbf6a'));
    const wall = kit.box(10, 6, 10, '#c0705a', [0, 3, 0]); scene.add(wall); cine.obstacle(wall);
    const bot = cine.actor('bot', kit.robot(), { height: 3 }); cine.place(bot, [30, 0, 30], 0);
    cine.shot({ t: 0, dur: 6, type: 'static', focus: [0, 3, 0], dist: 0.5, azimuth: 0, angle: 0, elev: 0 });   // camera inside the wall, nothing moves
    cine.shot({ t: 3, dur: 3, type: 'orbit', focus: bot, a0: 0, a1: 200, size: 'full' });                          // orbit with no "why"
  },
};
