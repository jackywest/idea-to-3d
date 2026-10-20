// Small city builder on top of Assets: an ASCII map becomes roads, buildings that face the street, trees, lamps.
// Legend:  - road along X   | road along Z   + crossroad   . empty ground   a-n commercial building   S skyscraper   h suburban house   t tree   p small park   (space) = nothing
// Everything stays on a grid of `cell` metres, so scale and spacing are coherent by construction.
import * as THREE from 'three';
import { rng } from './kit.js';

const P = { com: 'kenney-city-commercial', road: 'kenney-city-roads', sub: 'kenney-city-suburban', car: 'kenney-car-kit' };
const COM = 'abcdefghijklmn';

export async function buildCity({ scene, cine, assets, rows, cell = 8, seed = 3, ground = '#9fb59a', groundSize = 220, lamps = true, bldScale = 1, houses = 'abc', skyscrapers = ['a'], tint = ['#ffd9b0', '#cfe6ff', '#d9f2dc', '#ffcfe0', '#fff2b0', '#e4d6ff', '#ffffff'] }) {
  const rnd = rng(seed), R = rows.length, C = Math.max(...rows.map(r => r.length));
  const at = (i, j) => (rows[i] || '')[j] || ' ';
  const isRoad = ch => ch === '-' || ch === '|' || ch === '+';
  const world = (i, j) => new THREE.Vector3((j - (C - 1) / 2) * cell, 0, (i - (R - 1) / 2) * cell);
  const g = new THREE.Mesh(new THREE.CircleGeometry(groundSize, 48), new THREE.MeshStandardMaterial({ color: ground, roughness: 1 })); g.rotation.x = -Math.PI / 2; g.position.y = -0.02; g.receiveShadow = true; scene.add(g);
  const root = new THREE.Group(); scene.add(root);
  const city = { root, cell, rows, world, roads: [], buildings: [], lanes: {} };
  const put = (obj, pos, rotY = 0) => { obj.position.copy(pos); obj.rotation.y = rotY; root.add(obj); return obj; };

  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
    const ch = at(i, j), c = world(i, j);
    if (isRoad(ch)) {
      const id = ch === '+' ? 'road-crossroad' : 'road-straight';
      const t = await assets.model(`${P.road}/${id}`, { size: cell, center: false }); t.position.set(0, 0, 0);
      const wrap = new THREE.Group(); wrap.add(t); t.position.set(-cell / 2, 0, -cell / 2); t.scale.set(1, 1, 1);
      // models are centred by Assets.model; re-centre on the cell and scale footprint to exactly one cell
      const box = new THREE.Box3().setFromObject(t), sz = box.getSize(new THREE.Vector3()); t.scale.set(cell / sz.x, 1, cell / sz.z); t.position.set(0, 0, 0);
      const b2 = new THREE.Box3().setFromObject(t); t.position.set(-(b2.min.x + b2.max.x) / 2, -b2.min.y, -(b2.min.z + b2.max.z) / 2);
      put(wrap, c, ch === '-' ? Math.PI / 2 : 0); city.roads.push({ i, j, ch, pos: c.clone() });
    } else if (COM.includes(ch) || ch === 'S' || ch === 'h') {
      const name = ch === 'S' ? `${P.com}/building-skyscraper-${skyscrapers[Math.floor(rnd() * skyscrapers.length)]}` : ch === 'h' ? `${P.sub}/building-type-${houses[Math.floor(rnd() * houses.length)]}` : `${P.com}/building-${ch}`;
      const b = await assets.model(name, { size: null, height: null }); const k = cell * 0.95 * bldScale; b.scale.setScalar(k);
      // face the street
      const dirs = [[1, 0, 0], [-1, 0, Math.PI], [0, 1, Math.PI / 2], [0, -1, -Math.PI / 2]]; let rot = 0, best = 99;
      for (const [di, dj, r] of dirs) { const n = at(i + di, j + dj); if (isRoad(n)) { best = 0; rot = r; break; } }
      if (tint && tint.length) { const col = new THREE.Color(tint[Math.floor(rnd() * tint.length)]); b.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.copy(col); } }); }   // multiplies the colour map: pastel variety instead of grey blocks
      const w = put(b, c, rot); city.buildings.push(w); cine?.obstacle(w);
    } else if (ch === 't' || ch === 'p') {
      const n = ch === 'p' ? 4 : 1;
      for (let q = 0; q < n; q++) { const t = await assets.model(`${P.sub}/tree-${rnd() > 0.5 ? 'large' : 'small'}`, { height: 3 + rnd() * 2.5 }); const off = n > 1 ? new THREE.Vector3((rnd() - 0.5) * cell * 0.7, 0, (rnd() - 0.5) * cell * 0.7) : new THREE.Vector3(); put(t, c.clone().add(off), rnd() * 6); }
    }
  }
  if (lamps) for (const r of city.roads) { if (r.ch === '+') continue; const side = (r.i + r.j) % 2 ? 1 : -1; const l = await assets.model(`${P.road}/light-square`, { height: 4.2 }); const off = r.ch === '-' ? new THREE.Vector3(0, 0, side * cell * 0.46) : new THREE.Vector3(side * cell * 0.46, 0, 0); put(l, r.pos.clone().add(off), r.ch === '-' ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2)); }
  city.laneZ = (i, off = 0) => world(i, 0).z + off;            // z of a road row (x-road)
  city.laneX = (j, off = 0) => world(0, j).x + off;            // x of a road column (z-road)
  city.sidewalk = cell * 0.34;                                  // offset from road centre line to the sidewalk
  return city;
}

export async function addCars(city, assets, cine, list) {
  const out = [];
  for (const [name, h] of list) { const c = await assets.model(`${P.car}/${name}`, { size: city.cell * 0.55 }); out.push(c); }
  return out;
}
