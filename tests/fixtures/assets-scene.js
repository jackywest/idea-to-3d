// Exercises the asset loader: texture loading, refused paths, broken file, missing clip fallback.
import { Assets } from './assets.js';
export default {
  title: 'fixture assets', config: { mood: 'day', duration: 4 },
  async build({ scene, kit, cine }) {
    const A = new Assets(); const r = window.__assetTest = { errors: {}, warnings: [] };
    scene.add(kit.ground(30, '#7bbf6a'));
    const b = await A.model('kenney-city-commercial/building-a', { height: 8 }); scene.add(b);
    let tex = null; b.traverse(o => { if (o.isMesh && o.material && o.material.map) tex = o.material.map; }); r.textureWidth = tex && tex.image ? tex.image.width : 0;
    for (const [k, id] of [['traversal', '../../etc/passwd'], ['scheme', 'https://example.com/x'], ['missing', 'nope/none'], ['broken', 'bad/broken']]) { try { await A.model(id); r.errors[k] = 'LOADED'; } catch (e) { r.errors[k] = String(e.message).slice(0, 60); } }
    const ch = await A.character('kenney-mini-characters/character-male-a', { height: 2, map: { idle: 'idle', walk: 'does-not-exist' } }); const a = cine.actor('c', ch, { height: 2 }); cine.place(a, [0, 0, 0], 0); cine.path(a, [[0, 0, 0], [4, 0, 0]], { t: 0, dur: 3, anim: 'walk' });
    r.warnings = A.warnings;
    cine.shot({ t: 0, dur: 4, type: 'track', focus: a, size: 'full', azimuth: 20, angle: 0, elev: 5, why: 'follow the walker' });
  },
};
