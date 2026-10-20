// A prop with keyframes that change scale, rotation and visibility late in the timeline: early instants must not inherit them.
export default {
  title: 'fixture keys', config: { mood: 'day', duration: 10 },
  build({ scene, kit, cine }) {
    scene.add(kit.ground(30, '#7bbf6a'));
    const p = cine.prop('p', kit.box(1, 1, 1, '#c8914f'));
    cine.keys(p, [{ t: 0, pos: [0, 0.5, 0], vis: true }, { t: 4, pos: [3, 0.5, 0] }, { t: 7, pos: [3, 2, 0], rot: [0, 90, 0], scale: 0.2, vis: true }, { t: 7.1, pos: [3, 2, 0], scale: 0.2, vis: false }], { ease: 'lin' });
    const a = cine.actor('a', kit.robot(), { height: 3 }); cine.place(a, [-3, 0, 0], 0);
    cine.shot({ t: 0, dur: 10, type: 'static', focus: [0, 1, 0], dist: 9, azimuth: 0, angle: 0, elev: 10, why: 'overview' });
  },
};
