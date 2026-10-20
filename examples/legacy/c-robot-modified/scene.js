export default {
  title: 'Hello, robot (night, with a dog)',
  config: { mood: 'night', duration: 8, camera: { radius: 12, height: 3.6, target: [0, 2.0, 0], sway: 0.25 } },
  build({ scene, kit, THREE }) {
    const { box: kbox, group: kgroup, fireflies, terrain, scatter, grassBlade, flowerGeo, pine, roundTree, bush, fence, windmill, house, rock, robot, clouds, rng, cyl, box, ball } = kit;
    const r = rng(21);
    const land = terrain({ size: 120, seg: 90, height: 5, flatRadius: 7, seed: 4 });
    land.mesh.material.color.set('#8fa6b8'); scene.add(land.mesh); const H = land.heightAt;
    const keep = [[0, 0, 3.2], [-7, -6, 3], [10, -15, 3.5]];                  // clear zones: hero, cottage, windmill
    scene.add(scatter(grassBlade(), '#5da84d', 1800, { radius: 40, minR: 1.4, rng: r, heightAt: H, scale: [0.8, 1.7], avoid: keep, tilt: 0.4 }));
    scene.add(scatter(flowerGeo(), '#ff6f91', 120, { radius: 22, minR: 2.2, rng: r, heightAt: H, yOff: 0.35, scale: [0.8, 1.4], jitter: 0.5, avoid: keep }));
    scene.add(scatter(flowerGeo(), '#ffd447', 120, { radius: 22, minR: 2.2, rng: r, heightAt: H, yOff: 0.35, scale: [0.8, 1.4], jitter: 0.2, avoid: keep }));
    // path of stones from the cottage to the hero
    for (let i = 0; i < 9; i++) { const k = i / 8, x = -7 + 7 * k + Math.sin(k * 5) * 0.5, z = -6 + 6 * k; const s = cyl(0.55, 0.6, 0.12, '#d6c7a3', [x, H(x, z) + 0.05, z], null, null, 8); scene.add(s); }
    const cot = house(3, 2.1, '#f2e4c4', '#c0503f'); cot.position.set(-7, H(-7, -6), -6); cot.rotation.y = 0.6; scene.add(cot);
    const chim = box(0.4, 1.1, 0.4, '#8a6a52', [-6.3, H(-7, -6) + 3.1, -6.3]); scene.add(chim);
    const wm = windmill(); wm.group.position.set(10, H(10, -15), -15); wm.group.rotation.y = -0.5; scene.add(wm.group); this.blades = wm.blades;
    const f = fence(7); f.position.set(-3.2, H(-3.2, -2.8), -2.8); f.rotation.y = 0.35; scene.add(f);
    for (let i = 0; i < 26; i++) {                                              // forest ring
      const a = r() * 6.28, d = 12 + r() * 22, x = Math.cos(a) * d, z = Math.sin(a) * d;
      const t = (i % 3 ? kit.pine(3 + r() * 3, i % 2 ? '#2f7a4d' : '#3d8c4f') : kit.roundTree(3 + r() * 2, '#6dbb55')); t.position.set(x, H(x, z), z); t.rotation.y = r() * 6; scene.add(t);
    }
    for (let i = 0; i < 6; i++) { const x = -4 + i * 2.6 + r(), z = 4 + r() * 3; const b = bush(0.5 + r() * 0.3); b.position.set(x, H(x, z), z); scene.add(b); }
    for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = 3 + r() * 14, x = Math.cos(a) * d, z = Math.sin(a) * d; const s = rock(0.2 + r() * 0.45, '#8b9099'); s.position.set(x, H(x, z), z); scene.add(s); }
    this.clouds = [];                                               // no clouds at night
    // night: windows and lantern glow, fireflies
    scene.add(box(0.55, 0.55, 0.06, '#ffd27a', [-7 + Math.sin(0.6) * 1.55 + Math.cos(0.6) * 0.8, H(-7, -6) + 1.3, -6 + Math.cos(0.6) * 1.55 - Math.sin(0.6) * 0.8], [0, 0.6, 0], { glow: true }));
    const wl = new THREE.PointLight('#ffb25a', 20, 12); wl.position.set(-5.5, H(-7, -6) + 1.5, -4.6); scene.add(wl);
    this.ff = fireflies(70, { radius: 16, y: [0.4, 3], seed: 3 }); scene.add(this.ff);
    this.bot = robot(); this.bot.group.position.set(0, H(0, 0), 0.5); this.bot.group.rotation.y = 0.35; scene.add(this.bot.group);
    // lantern in the left hand: glowing ball + a real light that follows the hand
    this.bot.armL.add(ball(0.24, '#ffcf6b', [0, -1.25, 0.12], { glow: true }));
    this.lantern = new THREE.PointLight('#ffcf6b', 22, 14); this.lantern.position.set(0, -1.25, 0.3); this.bot.armL.add(this.lantern);
    // a small dog (boxes) that trots around the robot
    this.dog = kgroup(kbox(0.9, 0.45, 0.4, '#c98b4e', [0, 0.5, 0]), kbox(0.36, 0.34, 0.34, '#c98b4e', [0.55, 0.75, 0]), kbox(0.1, 0.2, 0.1, '#7a4a22', [0.55, 1.0, 0.12]), kbox(0.1, 0.2, 0.1, '#7a4a22', [0.55, 1.0, -0.12]), kbox(0.4, 0.08, 0.08, '#c98b4e', [-0.6, 0.7, 0], [0, 0, 0.5]));
    this.legs = [[0.3, 0.14], [0.3, -0.14], [-0.3, 0.14], [-0.3, -0.14]].map(([x, z]) => { const l = kbox(0.1, 0.3, 0.1, '#7a4a22', [x, 0.2, z]); this.dog.add(l); return l; });
    scene.add(this.dog);
    this.bflies = [0, 1, 2, 3].map(i => { const b = new THREE.Group(); b.add(box(0.22, 0.02, 0.14, i % 2 ? '#ffb347' : '#8ec5ff', [-0.11, 0, 0]), box(0.22, 0.02, 0.14, i % 2 ? '#ffb347' : '#8ec5ff', [0.11, 0, 0])); scene.add(b); return b; });
  },
  update(t, { kit }) {
    const k = t / 8 * Math.PI * 2;
    this.bot.armR.rotation.z = 2.5 + Math.sin(k * 2) * 0.45;      // slower wave (was k * 4)
    this.bot.armL.rotation.z = -0.35;
    this.bot.head.rotation.z = Math.sin(k) * 0.1; this.bot.head.rotation.y = Math.sin(k) * 0.15;
    this.bot.group.position.y = Math.abs(Math.sin(k * 2)) * 0.05;
    this.blades.rotation.z = -k * 2;
    kit.animateFireflies(this.ff, t);
    const a = k;                                                   // dog: one lap per loop, faces its direction of travel
    this.dog.position.set(Math.cos(a) * 3.4, Math.abs(Math.sin(t * 10)) * 0.05, 0.5 + Math.sin(a) * 3.4); this.dog.rotation.y = -a - Math.PI / 2 + Math.PI;
    this.legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 10 + (i % 2) * Math.PI) * 0.5; });
    kit.driftClouds(this.clouds, t, 0.8);
    this.bflies.forEach((b, i) => { const a = k * (1 + i * 0.25) + i * 1.7; b.position.set(Math.cos(a) * (2.5 + i * 0.8), 1.4 + Math.sin(a * 2) * 0.4, Math.sin(a) * (2.5 + i * 0.8)); b.children[0].rotation.z = Math.sin(t * 22 + i) * 0.7; b.children[1].rotation.z = -Math.sin(t * 22 + i) * 0.7; });
  },
};
