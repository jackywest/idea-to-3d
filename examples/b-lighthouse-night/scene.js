export default {
  title: 'Lighthouse, midnight',
  config: { mood: 'night', duration: 12, camera: { radius: 33, height: 11, target: [0, 4.5, 0], sway: 0.3 } },
  build({ scene, kit, THREE }) {
    const { terrain, scatter, pine, rock, cyl, cone, ball, box, group, water, fireflies, rng, house, moon } = kit;
    const r = rng(5);
    this.sea = water(220, '#1b5f9e', 70); this.sea.position.y = -0.6; scene.add(this.sea);
    // island: hills that fall below the waterline at the rim
    const isl = terrain({ size: 46, seg: 60, height: 5.5, flatRadius: 3, seed: 12, edge: 9, scale: 0.14, colors: ['#3d4a45', '#4c6a4a', '#7b8a6a'] });
    scene.add(isl.mesh); const H = isl.heightAt;
    for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = 4 + r() * 10, x = Math.cos(a) * d, z = Math.sin(a) * d; const h = H(x, z); if (h < 0.2) continue; const s = rock(0.3 + r() * 0.9, i % 2 ? '#4a505c' : '#5a6270'); s.position.set(x, h, z); s.rotation.y = r() * 6; scene.add(s); }
    for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = 7 + r() * 7, x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.hypot(x - 4, z - 3) < 3.5 || H(x, z) < 0.4) continue; const t = pine(2 + r() * 2.5, '#1f5b43'); t.position.set(x, H(x, z), z); t.rotation.y = r() * 6; scene.add(t); }
    for (let i = 0; i < 25; i++) { const a = r() * 6.28, d = 20 + r() * 40, s = rock(1 + r() * 2.2, '#2b303a'); s.position.set(Math.cos(a) * d, -0.2, Math.sin(a) * d); scene.add(s); }   // sea stacks
    // lighthouse at the centre
    const base = H(0, 0), tower = group();
    for (let i = 0; i < 5; i++) tower.add(cyl(0.95 - i * 0.1, 1.08 - i * 0.1, 1.05, i % 2 ? '#f4f4f4' : '#d9483b', [0, 0.52 + i * 1.05, 0], null, { rough: 0.6 }, 12));
    tower.add(cyl(1.15, 0.95, 0.22, '#2b2f36', [0, 5.35, 0], null, null, 12), cyl(0.62, 0.62, 1.0, '#fff2b0', [0, 5.95, 0], null, { glow: true }, 12), cone(0.95, 0.9, '#2b2f36', [0, 6.9, 0], null, null, 12), ball(0.15, '#2b2f36', [0, 7.45, 0]), box(0.45, 0.8, 0.1, '#5b3d27', [0, 0.4, 0.98]));
    tower.position.y = base; scene.add(tower);
    const cot = house(2.2, 1.4, '#cdbb9a', '#6b3f37'); cot.position.set(4, H(4, 3), 3); cot.rotation.y = -0.8; scene.add(cot);
    const win = box(0.5, 0.5, 0.06, '#ffd27a', [4 + 0.6, H(4, 3) + 0.95, 3 + 0.2], [0, -0.8, 0], { glow: true }); scene.add(win);
    this.beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 26, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff0a8', transparent: true, opacity: 0.17, side: THREE.FrontSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.beam.geometry.translate(0, -13, 0); this.beam.rotation.z = Math.PI / 2;
    this.pivot = new THREE.Group(); this.pivot.position.set(0, base + 6.0, 0); this.pivot.add(this.beam); scene.add(this.pivot);
    this.light = new THREE.PointLight('#ffe9a0', 60, 40); this.light.position.set(0, base + 6.0, 0); scene.add(this.light);
    const lw = new THREE.PointLight('#ffb25a', 6, 8); lw.position.set(4.6, H(4, 3) + 1, 3.3); scene.add(lw);
    const mn = moon(); mn.position.set(-60, 55, -90); scene.add(mn);
    this.boat = group(box(1.6, 0.4, 0.6, '#8a5a34', [0, 0, 0]), box(1.0, 0.3, 0.5, '#6b4527', [-0.1, 0.3, 0]), cone(0.45, 1.5, '#f4efe2', [0.15, 1.2, 0], null, null, 3), cyl(0.03, 0.03, 1.4, '#3b2a1a', [0.15, 0.9, 0]), ball(0.1, '#ffb25a', [-0.7, 0.55, 0], { glow: true }));
    scene.add(this.boat);
    this.gulls = [0, 1, 2].map(i => { const w = group(box(0.55, 0.04, 0.22, '#f2f2f2', [-0.28, 0, 0]), box(0.55, 0.04, 0.22, '#f2f2f2', [0.28, 0, 0])); scene.add(w); return w; });
    this.sparks = fireflies(60, { radius: 30, y: [0.1, 0.5], color: '#9fc8ff', seed: 8, size: 0.25 }); scene.add(this.sparks);
  },
  update(t, { kit }) {
    const k = t / 12 * Math.PI * 2;
    this.pivot.rotation.y = k;
    kit.animateWater(this.sea, t, 0.22);
    kit.animateFireflies(this.sparks, t);
    const bx = Math.cos(k * 0.5) * 14, bz = Math.sin(k * 0.5) * 14;
    this.boat.position.set(bx, -0.35 + Math.sin(t * 2) * 0.14, bz); this.boat.rotation.set(Math.sin(t * 1.7) * 0.05, -k * 0.5 - Math.PI / 2 + Math.PI, Math.sin(t * 2) * 0.1);
    this.gulls.forEach((g, i) => { const a = k * (i % 2 ? -2 : 2) + i * 2.1, R = 7 + i * 1.5; g.position.set(Math.cos(a) * R, 9 + Math.sin(t * 1.5 + i) * 0.7, Math.sin(a) * R); g.rotation.y = -a + (i % 2 ? Math.PI : 0); const f = Math.sin(t * 9 + i) * 0.5; g.children[0].rotation.z = f; g.children[1].rotation.z = -f; });
  },
};
