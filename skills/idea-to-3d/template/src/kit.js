// Small low-poly toolbox. Everything is built from THREE primitives, no external asset, no network.
import * as THREE from 'three';

const cache = new Map();
export function mat(color, o) {
  o = o || {};
  const key = color + JSON.stringify(o);
  if (!cache.has(key)) {
    cache.set(key, o.glow
      ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: o.rough ?? 0.9, metalness: o.metal ?? 0 }));
  }
  return cache.get(key);
}

function place(m, pos, rot) {
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export const box = (w, h, d, color, pos, rot, o) => place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, o)), pos, rot);
export const cyl = (rt, rb, h, color, pos, rot, o, seg = 10) => place(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, o)), pos, rot);
export const cone = (r, h, color, pos, rot, o, seg = 8) => place(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color, o)), pos, rot);
export const ball = (r, color, pos, o) => place(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(color, o)), pos);
export const group = (...kids) => { const g = new THREE.Group(); kids.forEach(k => k && g.add(k)); return g; };

export function ground(size, color, y = 0) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(size, 48), mat(color));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true;
  return m;
}
export function tree(h = 2, leaf = '#3f8f5a', trunk = '#7a5230') {
  return group(cyl(0.12, 0.16, h * 0.4, trunk, [0, h * 0.2, 0]), cone(h * 0.32, h * 0.7, leaf, [0, h * 0.7, 0]), cone(h * 0.24, h * 0.5, leaf, [0, h * 1.0, 0]));
}
export function rock(s = 1, color = '#7d8590') { const r = ball(s, color); r.scale.set(1, 0.7, 0.9); r.position.y = s * 0.4; return r; }
export function house(w = 2, h = 1.6, wall = '#e8d9b8', roof = '#b9503f') {
  return group(box(w, h, w, wall, [0, h / 2, 0]), cone(w * 0.85, h * 0.6, roof, [0, h + h * 0.3, 0], [0, Math.PI / 4, 0], undefined, 4),
    box(0.35, 0.7, 0.05, '#5b3d27', [0, 0.35, w / 2 + 0.01]), box(0.4, 0.4, 0.05, '#bfe3ff', [w * 0.28, h * 0.62, w / 2 + 0.01], null, { glow: true }));
}
export function lamp(color = '#ffd27a') {
  return group(cyl(0.05, 0.07, 2.2, '#2b2f36', [0, 1.1, 0]), ball(0.2, color, [0, 2.3, 0], { glow: true }));
}
export function stars(n = 300, radius = 60, seed = 7) {
  const g = new THREE.BufferGeometry(); const p = new Float32Array(n * 3); let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, b = Math.acos(1 - rnd() * 0.95); p.set([Math.cos(a) * Math.sin(b) * radius, Math.cos(b) * radius, Math.sin(a) * Math.sin(b) * radius], i * 3); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.5, sizeAttenuation: true, fog: false }));
}
export function sign(text, { w = 2, h = 0.6, bg = '#14181f', fg = '#ffffff' } = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = fg; x.font = `bold ${c.height * 0.55}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
}

// Robot: returns {group, head, armL, armR, eyes, legL, legR} so a scene can animate the parts.
export function robot({ body = '#f1f3f7', accent = '#ff8a3d', eye = '#6cf3ff', dark = '#1c2230', scale = 1 } = {}) {
  const g = new THREE.Group();
  const torso = group(cyl(0.55, 0.62, 1.05, body, [0, 1.45, 0], null, { rough: 0.45 }, 14), cyl(0.58, 0.58, 0.14, accent, [0, 1.12, 0], null, null, 14), box(0.5, 0.34, 0.06, dark, [0, 1.55, 0.55], null), box(0.34, 0.12, 0.07, eye, [0, 1.55, 0.56], null, { glow: true }), ball(0.13, accent, [0.22, 1.28, 0.5], { glow: true }));
  const head = group(box(1.0, 0.78, 0.82, body, [0, 0, 0], null, { rough: 0.45 }), box(0.86, 0.56, 0.06, dark, [0, 0.02, 0.43]),
    cyl(0.14, 0.14, 0.12, accent, [-0.56, 0, 0], [0, 0, Math.PI / 2], null, 12), cyl(0.14, 0.14, 0.12, accent, [0.56, 0, 0], [0, 0, Math.PI / 2], null, 12),
    cyl(0.03, 0.03, 0.35, dark, [0, 0.55, 0]), ball(0.1, accent, [0, 0.78, 0], { glow: true }));
  const eyeL = box(0.18, 0.2, 0.05, eye, [-0.22, 0.04, 0.47], null, { glow: true });
  const eyeR = box(0.18, 0.2, 0.05, eye, [0.22, 0.04, 0.47], null, { glow: true });
  const smile = box(0.3, 0.05, 0.05, eye, [0, -0.16, 0.47], null, { glow: true });
  head.add(eyeL, eyeR, smile); head.position.set(0, 2.45, 0);
  const mkArm = (sd) => { const a = group(ball(0.19, accent, [0, 0, 0]), cyl(0.12, 0.1, 0.7, body, [0, -0.38, 0], null, { rough: 0.45 }, 10), ball(0.17, dark, [0, -0.78, 0]), ball(0.2, accent, [0, -0.98, 0])); a.position.set(sd * 0.74, 1.88, 0); return a; };
  const armL = mkArm(-1), armR = mkArm(1);
  const mkLeg = (sd) => group(cyl(0.16, 0.14, 0.62, dark, [sd * 0.28, 0.5, 0], null, null, 10), box(0.4, 0.2, 0.55, accent, [sd * 0.28, 0.1, 0.07]));
  const legL = mkLeg(-1), legR = mkLeg(1);
  g.add(torso, head, armL, armR, legL, legR);
  g.scale.setScalar(scale);
  return { group: g, head, armL, armR, eyes: [eyeL, eyeR], legL, legR };
}

// ---- Richer scenery -------------------------------------------------------------------------
// Deterministic value noise (no Math.random).
function hash(x, z, seed) { const n = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); }
export function noise2(x, z, seed = 1) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi, seed), b = hash(xi + 1, zi, seed), c = hash(xi, zi + 1, seed), d = hash(xi + 1, zi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// Hilly ground with vertex colours. flatRadius keeps the middle calm for the hero. Returns { mesh, heightAt(x,z) }.
export function terrain({ size = 60, seg = 70, height = 3, scale = 0.09, seed = 3, flatRadius = 6, colors = ['#4f8f4a', '#79b45a', '#c7d58a'], edge = null } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const hAt = (x, z) => {
    const r = Math.hypot(x, z), flat = clamp((r - flatRadius) / (flatRadius * 1.6)), n = noise2(x * scale, z * scale, seed) * 0.7 + noise2(x * scale * 2.3, z * scale * 2.3, seed + 5) * 0.3;
    const rim = edge === null ? 1 : 1 - clamp((r - size * 0.32) / (size * 0.18));
    return (n * height * flat) * rim - (edge === null ? 0 : (1 - rim) * edge);
  };
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c0 = new THREE.Color(colors[0]), c1 = new THREE.Color(colors[1]), c2 = new THREE.Color(colors[2]), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = hAt(x, z); pos.setY(i, y);
    const k = clamp(y / (height * 0.9)); (k < 0.5 ? tmp.copy(c0).lerp(c1, k * 2) : tmp.copy(c1).lerp(c2, (k - 0.5) * 2)).offsetHSL(0, 0, (hash(x, z, 9) - 0.5) * 0.05);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  mesh.receiveShadow = true;
  // toNonIndexed keeps colours; recompute flat normals
  mesh.geometry.computeVertexNormals();
  return { mesh, heightAt: hAt };
}
// Many copies of one shape in a single draw call. Colour jitter makes fields look hand-made.
export function scatter(geo, color, n, { radius = 20, minR = 0, rng: r = rng(1), heightAt = () => 0, scale = [0.8, 1.3], jitter = 0.08, yOff = 0, avoid = [], tilt = 0 } = {}) {
  const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.9 }), n);
  const d = new THREE.Object3D(), c = new THREE.Color(color), t = new THREE.Color();
  let placed = 0, tries = 0;
  while (placed < n && tries++ < n * 30) {
    const a = r() * Math.PI * 2, rr = minR + Math.sqrt(r()) * (radius - minR), x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    const s = scale[0] + r() * (scale[1] - scale[0]);
    d.position.set(x, heightAt(x, z) + yOff, z); d.rotation.set((r() - 0.5) * tilt, r() * 6.28, (r() - 0.5) * tilt); d.scale.setScalar(s); d.updateMatrix();
    m.setMatrixAt(placed, d.matrix); m.setColorAt(placed, t.copy(c).offsetHSL((r() - 0.5) * jitter, 0, (r() - 0.5) * jitter)); placed++;
  }
  m.count = placed; m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  return m;
}
export const grassBlade = () => { const g = new THREE.ConeGeometry(0.07, 0.55, 4); g.translate(0, 0.27, 0); return g; };
export const flowerGeo = () => new THREE.IcosahedronGeometry(0.1, 0);
export function pine(h = 3, leaf = '#2f7a4d', trunk = '#6b4a2b') { return group(cyl(0.1, 0.18, h * 0.3, trunk, [0, h * 0.15, 0]), cone(h * 0.34, h * 0.45, leaf, [0, h * 0.45, 0], null, null, 7), cone(h * 0.28, h * 0.4, leaf, [0, h * 0.68, 0], null, null, 7), cone(h * 0.2, h * 0.36, leaf, [0, h * 0.88, 0], null, null, 7)); }
export function roundTree(h = 3, leaf = '#5fae4f', trunk = '#7a5230') { return group(cyl(0.12, 0.2, h * 0.5, trunk, [0, h * 0.25, 0]), ball(h * 0.3, leaf, [0, h * 0.62, 0]), ball(h * 0.22, leaf, [h * 0.14, h * 0.8, 0.05]), ball(h * 0.2, leaf, [-h * 0.15, h * 0.7, -0.05])); }
export function bush(s = 0.6, color = '#4f9a48') { return group(ball(s, color, [0, s * 0.6, 0]), ball(s * 0.7, color, [s * 0.8, s * 0.45, 0.1]), ball(s * 0.6, color, [-s * 0.7, s * 0.4, -0.1])); }
export function fence(n = 6, gap = 0.9, color = '#a9794a') { const g = new THREE.Group(); for (let i = 0; i < n; i++) g.add(box(0.12, 0.9, 0.12, color, [i * gap, 0.45, 0])); g.add(box((n - 1) * gap + 0.2, 0.1, 0.06, color, [(n - 1) * gap / 2, 0.7, 0]), box((n - 1) * gap + 0.2, 0.1, 0.06, color, [(n - 1) * gap / 2, 0.35, 0])); return g; }
export function windmill({ wall = '#f0e6d2', roof = '#b04a3a', blade = '#ffffff' } = {}) {
  const g = new THREE.Group(); g.add(cyl(0.9, 1.4, 3.6, wall, [0, 1.8, 0], null, null, 10), cone(1.2, 1.3, roof, [0, 4.2, 0], null, null, 10), box(0.5, 0.8, 0.1, '#5b3d27', [0, 0.4, 1.35]));
  const blades = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = group(box(0.14, 2.6, 0.04, '#7a5230', [0, 1.4, 0]), box(0.55, 1.7, 0.03, blade, [0.3, 1.7, 0.03])); b.rotation.z = i * Math.PI / 2; blades.add(b); }
  blades.position.set(0, 3.7, 1.05); blades.add(ball(0.2, '#3b2a1a', [0, 0, 0])); g.add(blades); return { group: g, blades };
}
export function cloud(seed = 1) { const r = rng(seed), g = new THREE.Group(); for (let i = 0; i < 5; i++) { const b = ball(0.9 + r() * 0.8, '#ffffff', [(i - 2) * 1.1, r() * 0.4, (r() - 0.5) * 0.8], { glow: true }); b.castShadow = false; b.scale.y = 0.65; g.add(b); } return g; }
export function driftClouds(list, t, speed = 0.6, range = 55) { list.forEach((c, i) => { const x = ((c.userData.x0 + t * speed * (0.6 + (i % 3) * 0.3) + range) % (range * 2)) - range; c.position.x = x; }); }
export function clouds(n = 6, { seed = 4, y = [14, 22], range = 55 } = {}) { const r = rng(seed), list = []; for (let i = 0; i < n; i++) { const c = cloud(seed + i); c.userData.x0 = (r() * 2 - 1) * range; c.position.set(c.userData.x0, y[0] + r() * (y[1] - y[0]), -10 - r() * 40); c.scale.setScalar(1.2 + r()); list.push(c); } return list; }
// Water with gentle waves; call kit.animateWater(w, t) in update.
export function water(size = 120, color = '#2a7fb8', seg = 60) { const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.25, metalness: 0.15 })); m.receiveShadow = true; m.userData.base = Float32Array.from(g.attributes.position.array); return m; }
export function animateWater(m, t, amp = 0.18) { const p = m.geometry.attributes.position, b = m.userData.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3], z = b[i * 3 + 2]; p.setY(i, Math.sin(x * 0.35 + t * 1.2) * amp + Math.cos(z * 0.3 + t * 0.9) * amp * 0.8); } p.needsUpdate = true; m.geometry.computeVertexNormals(); }
// Glowing drifting points (fireflies, dust, embers). Call kit.animateFireflies(f, t).
export function fireflies(n = 40, { radius = 10, y = [0.5, 3.5], color = '#ffe98a', seed = 5, size = 0.18 } = {}) { const r = rng(seed), geo = new THREE.BufferGeometry(), p = new Float32Array(n * 3), seeds = []; for (let i = 0; i < n; i++) { seeds.push([r() * 6.28, r() * 6.28, 0.3 + r() * 0.7, Math.sqrt(r()) * radius, y[0] + r() * (y[1] - y[0])]); } geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); pts.userData.s = seeds; animateFireflies(pts, 0); return pts; }
export function animateFireflies(pts, t) { const p = pts.geometry.attributes.position, s = pts.userData.s; for (let i = 0; i < s.length; i++) { const [a, b, sp, r, y] = s[i]; p.setXYZ(i, Math.cos(a + t * sp * 0.3) * r, y + Math.sin(b + t * sp) * 0.5, Math.sin(a + t * sp * 0.3) * r); } p.needsUpdate = true; }
export function moon(color = '#fdf6d8') { const g = new THREE.Group(); g.add(ball(3, color, [0, 0, 0], { glow: true })); g.children[0].castShadow = false; return g; }

export const ease = { inOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, out: t => 1 - Math.pow(1 - t, 3) };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
// Seeded random: same seed, same scene, every time.
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
export { THREE };
