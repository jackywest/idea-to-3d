// C · Information, staged. Three tasks ride a conveyor into an "AI" gate and come out as three finished results.
// The camera follows the information: input -> gate -> result. Assets: Kenney space kit + RobotExpressive (CC0).
import { Assets, EXPRESSIVE_CLIPS } from './assets.js';

const TASKS = [
  { name: 'EMAIL', out: 'REPLIED', bg: '#2f6df6', t: 3.4 },
  { name: 'INVOICE', out: 'PAID', bg: '#f08a24', t: 5.6 },
  { name: 'REPORT', out: 'READY', bg: '#8b5cf6', t: 7.8 },
];
const XIN = -17, XG = -1.2, XOUT = 15, ZL = 0, TRAVEL = 3.2;

export default {
  title: 'One click, three tasks',
  config: { mood: 'studio', duration: 23, fog: [70, 180] },
  async build({ scene, kit, cine, THREE }) {
    const assets = new Assets(), { box, group, sign, ball, cyl } = kit;
    scene.fog.color.set('#2a3146');
    // floor and tiles
    const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: '#33405e', roughness: 0.85 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    for (let i = -5; i <= 5; i++) { const t = await assets.model('kenney-space-kit/platform_large', { size: 6 }); t.position.set(i * 6.4, 0.01, ZL); scene.add(t); }
    // conveyors (input / output) with moving cleats
    this.cleats = [];
    const belt = (x0, x1) => { const len = x1 - x0, b = group(box(len, 0.35, 2.4, '#1b1e26', [0, 0.35, 0]), box(len, 0.1, 0.25, '#f08a24', [0, 0.55, 1.2]), box(len, 0.1, 0.25, '#f08a24', [0, 0.55, -1.2])); b.position.set((x0 + x1) / 2, 0, ZL); scene.add(b);
      for (let i = 0; i < Math.round(len / 1.6); i++) { const c = box(0.18, 0.06, 2.0, '#39414f', [0, 0.54, 0]); c.userData = { x0, x1, k: i, n: Math.round(len / 1.6), len }; scene.add(c); this.cleats.push(c); } };
    belt(XIN - 2, XG - 1.6); belt(XG + 1.6, XOUT + 2);
    // the AI gate (octagon) with a glowing core, flanked by machines
    const gate = await assets.model('kenney-space-kit/gate_simple', { height: 6.2 }); gate.position.set(XG, 0, ZL); gate.rotation.y = Math.PI / 2; scene.add(gate); cine.obstacle(gate);
    this.core = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: '#6ee7ff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); this.core.position.set(XG, 3.2, ZL); this.core.rotation.y = Math.PI / 2; scene.add(this.core);
    this.glow = new THREE.PointLight('#6ee7ff', 8, 22); this.glow.position.set(XG, 3.2, ZL + 0.5); scene.add(this.glow);
    for (const [name, x, z, h] of [['machine_generatorLarge', XG - 1, -6.5, 5], ['machine_barrelLarge', XG + 4.5, -6.8, 4.5], ['satelliteDish_large', XG - 14, -10, 6], ['machine_generator', XG + 11, -7, 3.2]]) { const m = await assets.model('kenney-space-kit/' + name, { height: h }); m.position.set(x, 0, z); m.rotation.y = x < XG ? 0.4 : -0.4; scene.add(m); cine.obstacle(m); }
    const desk = await assets.model('kenney-space-kit/desk_computerCorner', { height: 2.6 }); desk.position.set(XG - 12.5, 0, -5.5); desk.rotation.y = 0; scene.add(desk);
    // section signs
    const lab = (txt, x, c) => { const s = sign(txt, { w: 5, h: 1.3, bg: c, fg: '#ffffff' }); s.position.set(x, 7.6, ZL - 0.2); scene.add(s); const post = box(0.2, 7, 0.2, '#39414f', [x, 3.5, ZL - 0.4]); scene.add(post); return s; };
    lab('INPUT', XIN + 4, '#2a3550'); lab('AI', XG, '#0e7490'); lab('RESULT', XOUT - 4, '#14532d');
    // tokens: tasks in, results out
    const mkToken = (txt, bg, s) => { const g = group(box(1.5 * s, 1.5 * s, 1.5 * s, bg, [0, 0.75 * s, 0])); const a = sign(txt, { w: 1.4 * s, h: 0.8 * s, bg: '#ffffff', fg: bg }); a.position.set(0, 0.8 * s, 0.76 * s); const b = a.clone(); b.rotation.y = Math.PI; b.position.z = -0.76 * s; g.add(a, b); const a2 = a.clone(); a2.rotation.y = Math.PI / 2; a2.position.set(0.76 * s, 0.8 * s, 0); g.add(a2); const b2 = a.clone(); b2.rotation.y = -Math.PI / 2; b2.position.set(-0.76 * s, 0.8 * s, 0); g.add(b2); return g; };
    this.tokens = []; this.pass = [];
    for (const [i, tk] of TASKS.entries()) {
      const tin = cine.prop('in-' + tk.name, mkToken(tk.name, tk.bg, 1), { size: 1.5 }), yb = 0.55;
      const start = [XIN, yb, ZL], gate0 = [XG - 0.5, yb, ZL];
      cine.keys(tin, [{ t: 0, pos: start, vis: true }, { t: tk.t, pos: start, vis: true }, { t: tk.t + TRAVEL, pos: gate0, vis: true }, { t: tk.t + TRAVEL + 0.001, pos: gate0, vis: false }], { ease: 'lin' });
      const tOut = tk.t + TRAVEL + 0.7, xEnd = XOUT - 1 - i * 2.6, dur = (xEnd - (XG + 0.5)) / 3.5;
      const tout = cine.prop('out-' + tk.name, mkToken(tk.out, '#22c55e', 0.8), { size: 1.2 });
      cine.keys(tout, [{ t: 0, pos: [XG + 0.5, yb, ZL], vis: false }, { t: tOut, pos: [XG + 0.5, yb, ZL], vis: true }, { t: tOut + dur, pos: [xEnd, yb, ZL], vis: true }], { ease: 'lin' });
      this.pass.push(tk.t + TRAVEL);
    }
    const done = sign('DONE ✓', { w: 6, h: 1.8, bg: '#16a34a', fg: '#ffffff' }); done.position.set(XOUT - 2, 5, ZL); done.scale.setScalar(0.001); scene.add(done); this.done = done;
    // operator
    const bot = cine.actor('operator', await assets.character('robot-expressive/RobotExpressive', { height: 3, map: EXPRESSIVE_CLIPS, yaw: 0 }), { height: 3, radius: 0.7 });
    cine.place(bot, [XG - 7, 0, -4.2], 20);
    const kl = new THREE.PointLight('#ffd9a0', 30, 26); kl.position.set(XG - 6, 7, 4); scene.add(kl); const kl2 = new THREE.PointLight('#8ab4ff', 18, 30); kl2.position.set(XG + 8, 8, 6); scene.add(kl2);
    cine.act(bot, 'wave', { t: 0.4, dur: 2.2 }); cine.act(bot, 'talk', { t: 2.8, dur: 4 }); cine.act(bot, 'point', { t: 7, dur: 2.5 }); cine.act(bot, 'idle', { t: 9.5, dur: 3 }); cine.act(bot, 'cheer', { t: 14.4, dur: 4.2 }); cine.act(bot, 'point', { t: 18.8, dur: 4.2 });
    this.bot = bot; this.sparks = kit.fireflies(60, { radius: 3, y: [0.5, 6], color: '#9ff3ff', seed: 12, size: 0.25 }); this.sparks.position.set(XG, 0, ZL); scene.add(this.sparks);
    this.tokenProps = [...cine.props.values()];

    const gateF = [XG, 3.2, ZL], inT = i => cine.props.get('in-' + TASKS[i].name), outT = i => cine.props.get('out-' + TASKS[i].name);
    // shots: the camera follows the information
    cine.shot({ t: 0, dur: 3.4, type: 'move', fov: 42, ease: 'soft', why: 'the whole line first: input on the left, the AI gate, results on the right',
      from: { focus: [XG, 2, ZL], dist: 32, azimuth: 18, angle: 0, elev: 18 }, to: { focus: [XG - 5, 2.5, ZL], dist: 22, azimuth: 28, angle: 0, elev: 10 } });
    cine.shot({ t: 3.4, dur: 3.2, type: 'track', focus: inT(0), size: 'establishing', azimuth: 15, angle: 0, lead: 0.6, smooth: 0.4, elev: 8, blend: 0.6, why: 'ride along with the first task: an email travelling toward the gate' });
    cine.shot({ t: 6.6, dur: 2.2, type: 'move', fov: 38, why: 'the gate is where the magic happens: push in as the task goes through',
      from: { focus: [gateF, inT(0)], dist: 17, azimuth: 24, angle: 0, elev: 8 }, to: { focus: gateF, dist: 10, azimuth: 8, angle: 0, elev: 4 } });
    cine.shot({ t: 8.8, dur: 3.4, type: 'track', focus: outT(0), size: 'establishing', azimuth: -22, angle: 0, lead: 0.5, smooth: 0.4, elev: 8, blend: 0.5, why: 'follow the result out the other side: the email is now replied' });
    cine.shot({ t: 12.2, dur: 3.2, type: 'move', fov: 40, why: 'all three results line up: pan over to the finished stack',
      from: { focus: outT(0), size: 'establishing', azimuth: -20, angle: 0, elev: 8 }, to: { focus: [outT(0), outT(1), outT(2)], size: 'establishing', azimuth: -18, angle: 0, elev: 10 } });
    cine.shot({ t: 15.4, dur: 3.2, type: 'static', focus: bot, size: 'full', azimuth: 20, angle: 0, elev: 6, why: 'the operator reacts: three tasks, one click' });
    cine.shot({ t: 18.6, dur: 4.4, type: 'move', fov: 42, ease: 'soft', why: 'close on the full line: input, AI, result',
      from: { focus: bot, size: 'wide', azimuth: 20, angle: 0, elev: 6 }, to: { focus: [XG + 2, 2, ZL], dist: 44, azimuth: 8, angle: 0, elev: 14 } });
  },
  update(t, { kit }) {
    // belts move, the gate pulses when a task passes, sparks swirl, the DONE sign pops in
    for (const c of this.cleats) { const { x0, x1, k, n, len } = c.userData; c.position.x = x0 + 1 + ((k * len / n + t * 2.2) % len) * (1) - 0 + 0; if (c.position.x > x1 + 0) c.position.x = x0 + 1 + ((k * len / n + t * 2.2) % len); c.position.x = ((c.position.x - x0 - 1) % (len - 2)) + x0 + 1; c.position.z = 0; }
    let p = 0; for (const tp of this.pass) p = Math.max(p, Math.exp(-Math.pow((t - tp) * 1.6, 2)));
    this.core.material.opacity = 0.25 + 0.55 * p; this.glow.intensity = 6 + 40 * p; this.core.scale.setScalar(1 + 0.08 * Math.sin(t * 8) * p);
    kit.animateFireflies(this.sparks, t);
    const k = Math.min(Math.max((t - 14.6) / 0.5, 0), 1); this.done.scale.setScalar(Math.max(0.001, 1 - Math.pow(1 - k, 3) * (1 + 0.15 * Math.sin(k * 9))));
  },
};
