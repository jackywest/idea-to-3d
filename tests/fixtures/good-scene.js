// Minimal cinematic scene used by the tests: one actor walking past a wall, one motivated tracking shot, one reveal.
import { Assets } from './assets.js';
export default {
  title: 'fixture good', config: { mood: 'day', duration: 8 },
  async build({ scene, kit, cine }) {
    scene.add(kit.ground(40, '#7bbf6a'));
    const wall = kit.box(6, 4, 0.5, '#c0705a', [0, 2, -6]); scene.add(wall); cine.obstacle(wall);
    const bot = cine.actor('bot', kit.robot(), { height: 3 });
    cine.place(bot, [-10, 0, 0], 90); cine.path(bot, [[-10, 0, 0], [10, 0, 0]], { t: 0.5, dur: 6, anim: 'walk' });
    cine.shot({ t: 0, dur: 4, type: 'track', focus: bot, size: 'full', azimuth: 0, angle: 90, elev: 5, why: 'follow the walker' });
    cine.shot({ t: 4, dur: 4, type: 'move', focus: bot, from: { focus: bot, size: 'full', azimuth: 20, angle: 0, elev: 6 }, to: { focus: bot, size: 'wide', azimuth: 60, angle: 0, elev: 14 }, why: 'pull back and reveal the wall behind' });
  },
};
