// Cinematic director: actors on timelines + motivated shots + camera that follows the story + objective audit.
// Everything is a pure function of time t, so renders are reproducible and the audit can sample any instant.
import * as THREE from 'three';
import { robotClips, resetRig } from './anims.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = { lin: x => x, inOut: x => x * x * (3 - 2 * x), in: x => x * x, out: x => 1 - (1 - x) * (1 - x), soft: x => x * x * x * (x * (6 * x - 15) + 10) };
const clamp01 = x => Math.min(1, Math.max(0, x));
const toV = p => p.isVector3 ? p.clone() : V(p[0], p[1], p[2]);
// How much world height a shot size frames, as a multiple of the subject height.
const SIZES = { extreme: 0.22, close: 0.4, medium: 0.95, full: 1.6, wide: 3.2, establishing: 9 };
const ANGLES = { front: 0, threequarter: 35, side: 90, back: 180, 'back-threequarter': 145 };

export class Director {
  constructor({ scene, camera, renderer }) {
    this.scene = scene; this.camera = camera; this.renderer = renderer;
    this.actors = new Map(); this.props = new Map(); this.obstacles = []; this.shots = []; this.events = []; this.groundAt = () => 0;
    this._ray = new THREE.Raycaster(); this._tmp = V(); this.shakeAmt = 0.18; this.duration = 12; this.fade = [];
  }

  // ---- cast ------------------------------------------------------------------------------------
  // rig: kit.robot() result (procedural clips) or { group, mixer, clips, map } for a GLB character.
  actor(name, rig, { height, radius = 0.45, clips = robotClips, strideLen = 1.6 } = {}) {
    const a = { name, rig, group: rig.group || rig, height: height || rig.height || 1.7, radius, clips, strideLen, segs: [], acts: [], start: null, bbox: new THREE.Box3(), kind: 'actor' };
    this.actors.set(name, a); this.scene.add(a.group); return a;
  }
  prop(name, obj, { size = null, held = false } = {}) {
    const p = { name, group: obj, keys: [], segs: [], size, held, kind: 'prop', bbox: new THREE.Box3() };
    this.props.set(name, p); if (!obj.parent) this.scene.add(obj); return p;
  }
  obstacle(obj) { this.obstacles.push(obj); obj.updateMatrixWorld(true); this._boxes = null; return obj; }
  ground(fn) { this.groundAt = fn; }

  // ---- actions: movement ----------------------------------------------------------------------
  place(who, pos, faceDeg = 0) { who.start = { pos: toV(pos), yaw: faceDeg * Math.PI / 180 }; return who; }
  // walk/run along waypoints [x,y,z]; y is ignored for actors (they follow the ground).
  path(who, pts, { t, dur, anim = 'walk', ease: e = 'lin', face = true, k = 1 } = {}) {
    const p3 = pts.map(toV); const curve = p3.length > 2 ? new THREE.CatmullRomCurve3(p3, false, 'centripetal') : new THREE.LineCurve3(p3[0], p3[1]);
    who.segs.push({ t0: t, t1: t + dur, curve, anim, ease: ease[e], face, k, len: curve.getLength() }); who.segs.sort((a, b) => a.t0 - b.t0); return who;
  }
  // play a body clip at a place (stands still), e.g. act(bot, 'wave', {t:3, dur:2})
  act(who, anim, { t, dur, k = 1, face = null } = {}) { who.acts.push({ t0: t, t1: t + dur, anim, k, face }); who.acts.sort((a, b) => a.t0 - b.t0); return who; }
  // turn to face something at time t (instant after `dur` seconds of turning)
  turn(who, target, { t, dur = 0.4 } = {}) { (who.turns ||= []).push({ t0: t, t1: t + dur, target }); who.turns.sort((a, b) => a.t0 - b.t0); return who; }
  // keyframed prop/any object: [{t, pos, rot(deg), scale, vis}], eased between keys
  keys(who, frames, { ease: e = 'inOut' } = {}) { who.keys = frames.map(f => ({ ...f })).sort((a, b) => a.t - b.t); who.keyEase = ease[e]; return who; }
  // ballistic drop with bounces: object released at t from `from` to ground y `floor`
  fall(who, { t, from, floor = 0, bounce = 0.35, rotate = 0 }) { who.fall = { t, from: toV(from), floor, bounce, rotate }; return who; }
  // attach a prop to an actor's hand between t0 and t1 (held props follow the hand; see handPos)
  attach(prop, actor, { t0, t1 = 1e9, offset = [0, 0.9, 0.7], hand = null }) { (prop.attach ||= []).push({ actor, t0, t1, offset: toV(offset), hand }); return prop; }
  // ballistic toss from A to B in `dur` seconds with arc height `arc`, then two small bounces; spins while airborne
  toss(who, { t, dur, from, to, arc = 2.5, spin = 6, floor = null, bounce = 0.3 }) { who.toss = { t, dur, from: toV(from), to: toV(to), arc, spin, floor: floor ?? toV(to).y, bounce }; return who; }
  event(t, name, data = {}) { this.events.push({ t, name, ...data }); this.events.sort((a, b) => a.t - b.t); }
  dip(t0, t1, color = '#000') { this.fade.push({ t0, t1, color }); }

  // ---- shots ----------------------------------------------------------------------------------
  // shot({ t, dur, type, focus, size, angle, elev, dist, lead, why, from, to, blend, aim })
  //   type: static | track | move | orbit | truck | pan ; move/pan take {from:{...}, to:{...}} sub-specs.
  //   why: one sentence, REQUIRED for any moving shot (motivation). No why = lint failure.
  shot(s) { s.fov ||= 42; this.shots.push(s); this.shots.sort((a, b) => a.t - b.t); return s; }

  // ---- evaluation -----------------------------------------------------------------------------
  yawAt(a, t) {
    const y0 = this._yawRaw(a, t), y1 = this._yawRaw(a, Math.max(0, t - 0.18)); let d = y0 - y1; d = Math.atan2(Math.sin(d), Math.cos(d)); return y1 + d * (Math.abs(d) > 0.01 ? 0.6 : 1);   // short smoothing so turns at path corners are not instant
  }
  _yawRaw(a, t) {
    // facing: last path/act/turn that defines it
    let yaw = a.start ? a.start.yaw : 0;
    if (!a.start && a.segs.length) { const c = a.segs[0].curve, d = c.getPointAt(0.02).sub(c.getPointAt(0)); yaw = Math.atan2(d.x, d.z); }
    for (const s of a.segs) { if (t < s.t0) break; const u = clamp01((t - s.t0) / (s.t1 - s.t0)); if (s.face) { const e = s.ease(u), e2 = Math.min(1, e + 0.01); const d = s.curve.getPointAt(Math.min(e2, 1)).sub(s.curve.getPointAt(Math.max(e2 - 0.02, 0))); if (d.x * d.x + d.z * d.z > 1e-8) yaw = Math.atan2(d.x, d.z); } }
    for (const s of a.acts) if (s.face != null && t >= s.t0) yaw = s.face * Math.PI / 180;
    for (const tn of a.turns || []) { if (t < tn.t0) break; const tp = this.posOf(tn.target, tn.t1); const dir = tp.sub(this.posAt(a, tn.t0)); const to = Math.atan2(dir.x, dir.z); const u = clamp01((t - tn.t0) / Math.max(tn.t1 - tn.t0, 1e-3)); let d = to - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw = yaw + d * ease.inOut(u); }
    return yaw;
  }
  posAt(a, t) {
    let p = a.start ? a.start.pos.clone() : (a.segs.length ? a.segs[0].curve.getPointAt(0) : V());
    for (const s of a.segs) { if (t < s.t0) break; const u = ease.lin(clamp01((t - s.t0) / (s.t1 - s.t0))); p = s.curve.getPointAt(clamp01(s.ease(u))); }
    p.y = this.groundAt(p.x, p.z); return p;
  }
  distAt(a, t) { let d = 0; for (const s of a.segs) { if (t < s.t0) break; d += s.len * clamp01(s.ease(clamp01((t - s.t0) / (s.t1 - s.t0)))); } return d; }
  animAt(a, t) {
    for (const s of a.acts) if (t >= s.t0 && t < s.t1) return { name: s.anim, p: t - s.t0, k: s.k };
    for (const s of a.segs) if (t >= s.t0 && t < s.t1) return { name: s.anim, p: this.distAt(a, t) / a.strideLen * 0.9 * (s.anim === 'run' ? 0.7 : 1), k: s.k, dist: true };
    return { name: a.defaultAnim || 'idle', p: t, k: 1 };
  }
  // world position of an actor/prop/point/array-centroid/function at time t
  posOf(f, t) {
    if (typeof f === 'function') return toV(f(t));
    if (Array.isArray(f) && typeof f[0] === 'number') return toV(f);
    if (Array.isArray(f)) { const c = V(); f.forEach(x => c.add(this.posOf(x, t))); return c.multiplyScalar(1 / f.length); }
    if (f.isVector3) return f.clone();
    if (f.kind === 'actor') return this.posAt(f, t);
    if (f.kind === 'prop') { this._evalProp(f, t); return f.group.getWorldPosition(V()); }
    return f.getWorldPosition ? f.getWorldPosition(V()) : V();
  }
  heightOf(f) { if (Array.isArray(f) && typeof f[0] !== 'number') return Math.max(...f.map(x => this.heightOf(x))); if (f.kind === 'actor') return f.height; if (f.kind === 'prop') return f.size || 0.6; return 1.5; }
  aimPoint(f, t, aim = 'chest') {
    if (Array.isArray(f) && typeof f[0] !== 'number') { const c = V(); f.forEach(x => c.add(this.aimPoint(x, t, aim))); return c.multiplyScalar(1 / f.length); }
    const p = this.posOf(f, t); if (f.kind === 'actor') { const k = { feet: 0.05, knee: 0.25, chest: 0.62, head: 0.9, hands: 0.45 }[aim] ?? 0.62; p.y += f.height * k; } else if (f.kind === 'prop') { /* world pos already centred */ } return p;
  }

  _evalProp(p, t) {
    const g = p.group; let done = false;
    for (const at of p.attach || []) if (t >= at.t0 && t < at.t1) { const a = at.actor, pos = this.posAt(a, t), yaw = this.yawAt(a, t); const off = at.offset.clone().multiplyScalar(a.height / 3).applyAxisAngle(V(0, 1, 0), yaw); g.position.copy(pos).add(off); g.rotation.set(0, yaw, 0); g.visible = true; done = true; }
    if (!done && p.toss && t >= p.toss.t) {
      const k = p.toss, dt = t - k.t; if (dt <= k.dur) { const u = dt / k.dur; g.position.lerpVectors(k.from, k.to, u); g.position.y += 4 * k.arc * u * (1 - u); g.rotation.set(u * k.spin * 0.4, u * k.spin, u * k.spin * 0.3); }
      else { let bt = dt - k.dur, v = Math.sqrt(2 * 9.8 * k.arc) * k.bounce * 1.8, y = 0; for (let i = 0; i < 3; i++) { const air = 2 * v / 9.8; if (bt < air) { y = v * bt - 0.5 * 9.8 * bt * bt; break; } bt -= air; v *= k.bounce * 1.5; } g.position.set(k.to.x, k.floor + y, k.to.z); g.rotation.set(0.3, k.spin, 0.1); }
      done = true;
    }
    if (!done && p.fall && t >= p.fall.t) { const f = p.fall, dt = t - f.t, G = 9.8, h = Math.max(f.from.y - f.floor, 0.01); const t0 = Math.sqrt(2 * h / G); let y, tt = dt; if (tt < t0) y = f.from.y - 0.5 * G * tt * tt; else { let v = Math.sqrt(2 * G * h) * f.bounce, tb = tt - t0; y = f.floor; for (let i = 0; i < 4; i++) { const air = 2 * v / G; if (tb < air) { y = f.floor + v * tb - 0.5 * G * tb * tb; break; } tb -= air; v *= f.bounce; } } g.position.set(f.from.x, y, f.from.z); g.rotation.set(0, 0, f.rotate * Math.min(1, dt / t0)); done = true; }
    if (!done && p.keys.length) {
      const k = p.keys; let a = k[0], b = k[0];
      if (t <= k[0].t) a = b = k[0]; else if (t >= k[k.length - 1].t) a = b = k[k.length - 1]; else for (let i = 0; i < k.length - 1; i++) if (t >= k[i].t && t <= k[i + 1].t) { a = k[i]; b = k[i + 1]; break; }
      const u = a === b ? 0 : (p.keyEase || ease.inOut)((t - a.t) / (b.t - a.t));
      if (a.pos) g.position.lerpVectors(toV(a.pos), toV(b.pos || a.pos), u);
      if (a.rot) g.rotation.set(...[0, 1, 2].map(i => THREE.MathUtils.degToRad((a.rot[i] ?? 0) + ((b.rot || a.rot)[i] - a.rot[i]) * u)));
      if (a.scale != null) g.scale.setScalar(a.scale + ((b.scale ?? a.scale) - a.scale) * u);
      if (a.vis != null) g.visible = t < (b.t) ? a.vis : (b.vis ?? a.vis);
    }
  }

  // body transforms + clips for time t
  evalActors(t) {
    for (const a of this.actors.values()) {
      const pos = this.posAt(a, t), yaw = this.yawAt(a, t), an = this.animAt(a, t);
      a.group.position.copy(pos); a.group.rotation.set(0, yaw, 0);
      if (a.vanish && a.segs.length) a.group.visible = t >= a.segs[0].t0 - 1e-6 && t <= a.segs[a.segs.length - 1].t1 + 1e-6;
      if (a.rig.mixer) this._glbPose(a, t, an);
      else { resetRig(a.rig); const c = a.clips[an.name] || a.clips.idle; c(a.rig, an.p, an.k); }
      a.bbox.setFromCenterAndSize(pos.clone().add(V(0, a.height / 2, 0)), V(a.radius * 2, a.height, a.radius * 2));      // nominal body volume (collisions)
      a.visBox = a.visBox || new THREE.Box3();
    }
    for (const p of this.props.values()) { this._evalProp(p, t); p.bbox.setFromObject(p.group); }
  }
  // GLB characters: clips picked by name, crossfaded 0.25 s, time driven by travelled distance (no foot sliding)
  _glbPose(a, t, an) {
    const m = a.rig.mixer, map = a.rig.map || {}, prev = this.animAt(a, Math.max(0, t - 0.25)), blend = prev.name !== an.name ? clamp01((t - this._animStart(a, t)) / 0.25) : 1;
    const set = (name, w, p) => { const clip = a.rig.clips[map[name] || name] || a.rig.clips[map.idle || 'idle'] || Object.values(a.rig.clips)[0]; if (!clip) return; const act = m.clipAction(clip); act.enabled = true; act.setEffectiveWeight(w); act.setEffectiveTimeScale(0); act.time = ((p % 1) + 1) % 1 * clip.duration; act.paused = false; };
    for (const act of m._actions) act.setEffectiveWeight(0);
    set(an.name, blend, an.p / (an.dist ? 1 : (this._clipDur(a, an.name) || 1)));
    if (blend < 1) set(prev.name, 1 - blend, prev.p / (prev.dist ? 1 : (this._clipDur(a, prev.name) || 1)));
    m.update(0);
  }
  _clipDur(a, n) { const c = a.rig.clips[(a.rig.map || {})[n] || n]; return c ? c.duration : 1; }
  _animStart(a, t) { let s = 0; for (const x of a.acts) if (t >= x.t0 && t < x.t1) return x.t0; for (const x of a.segs) if (t >= x.t0 && t < x.t1) return x.t0; return s; }

  // ---- camera ---------------------------------------------------------------------------------
  // pose (pos, target, fov) for a shot sub-spec at absolute time t
  _pose(s, t, local) {
    const focus = s.focus, aim = s.aim || 'chest';
    const sm = s.type === 'track' ? (s.smooth ?? 0.5) : 0;
    let f0 = this.aimPoint(focus, t, aim);
    if (sm > 0) { const acc = V(); const N = 6; for (let i = 0; i < N; i++) acc.add(this.aimPoint(focus, t - sm * i / (N - 1), aim)); f0 = acc.multiplyScalar(1 / N); }
    const fAim = s.lead ? f0.clone().lerp(this.aimPoint(focus, t + s.lead, aim), 0.5) : f0.clone();   // look slightly ahead, never lose the subject
    const H = this.heightOf(focus);
    let span = (typeof s.size === 'number' ? s.size : SIZES[s.size || 'medium']) * H;
    if (Array.isArray(focus) && typeof focus[0] !== 'number') { // auto-frame a group: fit its spread
      const pts = focus.map(x => this.posOf(x, t)); const bb = new THREE.Box3().setFromPoints(pts); const sz = bb.getSize(V()); span = Math.max(span, Math.max(sz.x, sz.z) * 0.9 + H, sz.y + H);
    }
    const fov = (s.fov || 42) * Math.PI / 180, aspect = this.camera.aspect || 16 / 9;
    const dist = s.dist ?? (span / (2 * Math.tan(fov / 2))) * (aspect < 1 ? 1.2 : 1);
    let yawBase = 0; const sf = Array.isArray(focus) ? null : focus;
    if (sf && sf.kind === 'actor') yawBase = this.yawAt(sf, t);
    const ang = (typeof s.angle === 'number' ? s.angle : (ANGLES[s.angle || 'threequarter'] ?? 35)) * Math.PI / 180 + (s.angleDelta || 0);
    const az = yawBase + ang * (s.side === 'left' ? -1 : 1) + (s.azimuth ? s.azimuth * Math.PI / 180 : 0);
    const el = (s.elev ?? 8) * Math.PI / 180;
    const pos = V(f0.x + Math.sin(az) * Math.cos(el) * dist, f0.y + Math.sin(el) * dist + (s.height || 0), f0.z + Math.cos(az) * Math.cos(el) * dist);
    if (s.slide) { const side = V(Math.cos(az), 0, -Math.sin(az)); pos.addScaledVector(side, s.slide); }
    return { pos, target: fAim, focus: f0, fov: s.fov || 42, dist };
  }
  shotAt(t) { let cur = null, idx = -1; this.shots.forEach((s, i) => { if (t >= s.t - 1e-6) { cur = s; idx = i; } }); return { shot: cur, idx }; }
  _shotPose(s, t) {
    const local = t - s.t, u = clamp01(local / s.dur), e = (ease[s.ease || 'inOut'] || ease.inOut)(u);
    if (s.type === 'move' || s.type === 'pan') {
      const A = this._pose({ ...s, ...s.from }, t, local), B = this._pose({ ...s, ...s.to }, t, local);
      return { pos: A.pos.lerp(B.pos, s.type === 'pan' && s.holdPos ? 0 : e), target: A.target.lerp(B.target, e), focus: A.focus.lerp(B.focus, e), fov: A.fov + (B.fov - A.fov) * e };
    }
    const spec = { ...s };
    if (s.type === 'orbit') { spec.azimuth = (s.a0 ?? 0) + ((s.a1 ?? 90) - (s.a0 ?? 0)) * e; }
    if (s.type === 'push') { const d0 = s.d0 ?? s.size0, d1 = s.d1 ?? s.size1; spec.size = typeof d0 === 'number' || typeof d1 === 'number' ? d0 + (d1 - d0) * e : SIZES[d0] + (SIZES[d1] - SIZES[d0]) * e; }
    if (s.type === 'truck') { spec.slide = (s.s0 ?? -2) + ((s.s1 ?? 2) - (s.s0 ?? -2)) * e; }
    return this._pose(spec, t, local);
  }
  cameraPose(t) {
    const { shot, idx } = this.shotAt(t); if (!shot) return null;
    let pose = this._shotPose(shot, Math.min(t, shot.t + shot.dur));
    const prev = idx > 0 ? this.shots[idx - 1] : null;
    if (prev && shot.blend > 0 && t - shot.t < shot.blend) { const pp = this._shotPose(prev, Math.min(shot.t, prev.t + prev.dur)), u = ease.inOut((t - shot.t) / shot.blend); pose = { pos: pp.pos.lerp(pose.pos, u), target: pp.target.lerp(pose.target, u), focus: pp.focus.lerp(pose.focus, u), fov: pp.fov + (pose.fov - pp.fov) * u }; }
    // handheld impact shake from events
    let sh = 0; for (const e of this.events) if (e.name === 'impact' && t >= e.t && t < e.t + 0.6) sh += (e.power ?? 1) * Math.exp(-(t - e.t) * 7);
    if (sh > 0.001) { pose.pos.x += Math.sin(t * 61) * this.shakeAmt * sh * 0.3; pose.pos.y += Math.sin(t * 73 + 1) * this.shakeAmt * sh * 0.3; pose.target.x += Math.sin(t * 53 + 2) * this.shakeAmt * sh * 0.2; }
    this._applyOffset(pose, shot);
    this._safeguard(pose, shot);
    return { ...pose, shot };
  }
  // One stable camera swing per shot: chosen once by sampling the shot, so the camera never pops between angles.
  _applyOffset(pose, shot) {
    if (!this.obstacles.length) return;
    if (shot._off === undefined) shot._off = this._chooseOffset(shot);
    const o = shot._off; if (!o || (!o.az && !o.el)) return;
    const d = pose.pos.clone().sub(pose.focus), r = Math.hypot(d.x, d.z), el = Math.min(Math.atan2(d.y, r) + o.el * Math.PI / 180, 1.35), az = Math.atan2(d.x, d.z) + o.az * Math.PI / 180, L = d.length();
    pose.pos.copy(pose.focus).add(V(Math.sin(az) * Math.cos(el) * L, Math.sin(el) * L, Math.cos(az) * Math.cos(el) * L));
  }
  _chooseOffset(shot) {
    const boxes = this._boxes || (this._boxes = this.obstacles.map(o => new THREE.Box3().setFromObject(o)));
    const N = 12, samples = []; this.evalActors(shot.t);
    for (let i = 0; i <= N; i++) { const t = shot.t + shot.dur * i / N; this.evalActors(t); const p = this._shotPose(shot, t); samples.push({ t, pos: p.pos, target: p.target, focus: p.focus }); }
    const ok = (smp, az, el) => { const d = smp.pos.clone().sub(smp.focus), r = Math.hypot(d.x, d.z), e = Math.min(Math.atan2(d.y, r) + el * Math.PI / 180, 1.35), a = Math.atan2(d.x, d.z) + az * Math.PI / 180, L = d.length(); const pos = smp.focus.clone().add(V(Math.sin(a) * Math.cos(e) * L, Math.sin(e) * L, Math.cos(a) * Math.cos(e) * L));
      if (pos.y < 0.4 || boxes.some(b => b.containsPoint(pos))) return false; if (boxes.some(b => b.containsPoint(smp.focus))) return true; this._ray.set(smp.focus, pos.clone().sub(smp.focus).normalize()); this._ray.far = L; return !this._ray.intersectObjects(this.obstacles, true).some(h => !this._isFocus(h.object, shot)); };
    let best = { az: 0, el: 0, frac: -1 };
    const cands = []; for (const el of [0, 10, 20, 35]) for (const az of [0, 12, -12, 25, -25, 40, -40, 60, -60, 90, -90, 130, -130, 180]) cands.push({ az, el });
    cands.sort((a, b) => (Math.abs(a.az) + a.el * 1.2) - (Math.abs(b.az) + b.el * 1.2));
    for (const c of cands) { const frac = samples.filter(smp => ok(smp, c.az, c.el)).length / samples.length; if (frac > best.frac + 1e-9) best = { ...c, frac }; if (frac >= 0.97) break; }
    return best;
  }
  // never inside geometry, never below ground. If something blocks the view, look for the nearest clear angle
  // (swing azimuth, then raise elevation) before resorting to pulling the camera in front of the occluder.
  _safeguard(pose, shot) {
    const gy = this.groundAt(pose.pos.x, pose.pos.z) + 0.35; if (pose.pos.y < gy) pose.pos.y = gy;
    if (!this.obstacles.length) return;
    const boxes = this._boxes || (this._boxes = this.obstacles.map(o => new THREE.Box3().setFromObject(o)));
    if (boxes.some(b => b.containsPoint(pose.focus))) return;
    const clear = (pos) => { if (boxes.some(b => b.containsPoint(pos))) return false; const d = pos.clone().sub(pose.focus), L = d.length(); if (L < 1e-3) return true; this._ray.set(pose.focus, d.normalize()); this._ray.far = L; return !this._ray.intersectObjects(this.obstacles, true).some(h => !this._isFocus(h.object, shot)); };
    if (clear(pose.pos)) return;
    const off = pose.pos.clone().sub(pose.focus), r = Math.hypot(off.x, off.z), el0 = Math.atan2(off.y, r), az0 = Math.atan2(off.x, off.z), dist = off.length();
    for (const dEl of [0, 12, 25, 40]) for (const dAz of [0, 15, -15, 30, -30, 50, -50, 75, -75, 110, -110]) {
      const el = Math.min(el0 + dEl * Math.PI / 180, 1.35), az = az0 + dAz * Math.PI / 180;
      const c = pose.focus.clone().add(V(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist));
      if (c.y >= gy && clear(c)) { pose.pos.copy(c); pose.moved = true; return; }
    }
    const dir = pose.pos.clone().sub(pose.focus).normalize(); this._ray.set(pose.focus, dir); this._ray.far = dist;
    const hits = this._ray.intersectObjects(this.obstacles, true).filter(h => !this._isFocus(h.object, shot));
    if (hits.length) { const d = Math.max(hits[0].distance - 0.5, Math.min(dist, 1.2)); pose.pos.copy(pose.focus).addScaledVector(dir, d); pose.pulled = true; }
  }
  _isFocus(obj, shot) { const f = shot.focus; const list = Array.isArray(f) && typeof f[0] !== 'number' ? f : [f]; return list.some(x => x && x.group && (x.group === obj || x.group.getObjectById(obj.id))); }

  // ---- main: set everything to time t ----------------------------------------------------------
  eval(t) {
    const p = this.cameraPose(t); this.lastPose = p;       // pose first (it may sample other instants), then settle every body at t
    this.evalActors(t);
    if (p) { this.camera.position.copy(p.pos); this.camera.lookAt(p.target); if (this.camera.fov !== p.fov) { this.camera.fov = p.fov; this.camera.updateProjectionMatrix(); } }
    let fade = 0, col = '#000'; for (const f of this.fade) { if (t >= f.t0 && t <= f.t1) { const m = (f.t0 + f.t1) / 2; fade = 1 - Math.abs(t - m) / ((f.t1 - f.t0) / 2); col = f.color; } }
    this.fadeNow = { a: clamp01(fade), color: col };
    return p;
  }

  // ---- audit: objective checks over the whole timeline ----------------------------------------
  audit({ fps = 8, t1 = this.duration, minFrac = 0.1 } = {}) {
    const cam = this.camera, rep = { samples: 0, problems: [], stats: {}, shots: this.shots.length, details: { penetration: [], cameraInGeometry: [], offFrame: [], jerk: [], occluded: [] } };
    const note = (k, o) => { const arr = rep.details[k]; if (arr.length < 8) arr.push(o); };
    const prevPos = V(); let prevVel = V(), prevT = 0, jerk = 0, moved = 0, maxSpeed = 0, inGeo = 0, occl = 0, offFrame = 0, small = 0, noShot = 0, pen = 0, floating = 0, pulled = 0, motion = 0, cuts = 0;
    const lastPos = new Map(); const frustum = new THREE.Frustum(), m4 = new THREE.Matrix4(); const fracs = [];
    cam.aspect = cam.aspect || 16 / 9;
    const dt = 1 / fps; let n = 0;
    for (let t = 0; t <= t1 + 1e-6; t += dt, n++) {
      const p = this.eval(t); this.scene.updateMatrixWorld(true); cam.updateMatrixWorld(true); rep.samples++;
      if (!p) { noShot++; continue; }
      const sh = p.shot, isCut = (t - sh.t) < dt * 1.6 && !(sh.blend > 0); if (isCut && n > 0) cuts++;
      // camera kinematics (ignore cuts)
      const vel = p.pos.clone().sub(prevPos).multiplyScalar(1 / dt);
      if (n > 1 && !isCut && !(sh.blend > 0 && t - sh.t < sh.blend)) { const acc = vel.clone().sub(prevVel).length() / dt; if (acc > 90) { jerk++; note('jerk', { t: +t.toFixed(2), shot: this.shots.indexOf(sh), acc: Math.round(acc) }); } maxSpeed = Math.max(maxSpeed, vel.length()); }
      prevPos.copy(p.pos); prevVel = vel;
      // subject visibility (primary focus)
      const f = sh.focus, list = Array.isArray(f) && typeof f[0] !== 'number' ? f : [f];
      const hasObj = list.some(x => x && x.kind);
      if (hasObj) {
        m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(m4);
        let minX = 9, maxX = -9, minY = 9, maxY = -9, vis = false;
        for (const x of list) { if (!x || !x.kind) continue; const bb = x.kind === 'actor' ? new THREE.Box3().setFromObject(x.group) : x.bbox.clone(); for (const c of [[bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.max.y, bb.max.z], [bb.min.x, bb.max.y, bb.min.z], [bb.max.x, bb.min.y, bb.max.z]]) { const v = V(...c).project(cam); if (v.z < 1) { vis = true; minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); } } }
        const frac = vis ? (maxY - minY) / 2 : 0; fracs.push(frac);
        if (!vis || maxX < -1 || minX > 1 || maxY < -1 || minY > 1) { offFrame++; note('offFrame', { t: +t.toFixed(2), shot: this.shots.indexOf(sh) }); } else if (frac < minFrac && !(sh.size === 'wide' || sh.size === 'establishing')) small++;
        // occlusion of the primary subject centre
        if (this.obstacles.length) { const c = this.aimPoint(list[0], t, sh.aim || 'chest'); const d = c.clone().sub(cam.position); const L = d.length(); this._ray.set(cam.position, d.normalize()); this._ray.far = L - 0.2; const h = this._ray.intersectObjects(this.obstacles, true).filter(h => !this._isFocus(h.object, sh)); if (h.length) { occl++; note('occluded', { t: +t.toFixed(2), shot: this.shots.indexOf(sh) }); } }
      }
      if (p.pulled) pulled++; if (p.moved) moved++;
      // camera inside obstacle volume
      for (const o of this.obstacles) { const bb = this._boxes ? this._boxes[this.obstacles.indexOf(o)] : new THREE.Box3().setFromObject(o); if (bb.containsPoint(cam.position)) { inGeo++; note('cameraInGeometry', { t: +t.toFixed(2), shot: this.shots.indexOf(sh), cam: cam.position.toArray().map(v => +v.toFixed(1)), box: [bb.min, bb.max].map(v => v.toArray().map(x => +x.toFixed(1))) }); break; } }
      // body penetration + feet on ground
      const acts = [...this.actors.values()].filter(x => x.group.visible); let penHere = false;
      for (let i = 0; i < acts.length; i++) {
        const a = acts[i]; const lp = lastPos.get(a); const cp = a.group.position.clone(); if (lp) motion += cp.distanceTo(lp); lastPos.set(a, cp);
        const g = this.groundAt(cp.x, cp.z); if (Math.abs(a.group.position.y - g) > 0.6 * (a.height / 3) && !a.canJump) floating++;
        for (let j = i + 1; j < acts.length; j++) { if (a.allow?.includes(acts[j].name)) continue; const A = a.bbox.clone().expandByScalar(-a.radius * 0.35), B = acts[j].bbox.clone().expandByScalar(-acts[j].radius * 0.35); if (A.intersectsBox(B)) { penHere = true; note('penetration', { t: +t.toFixed(2), a: a.name, b: acts[j].name }); } }
        for (const o of this.obstacles) { if (a.allow?.includes('*obstacle')) continue; const ob = new THREE.Box3().setFromObject(o).expandByScalar(-0.12); const ab = a.bbox.clone().expandByScalar(-a.radius * 0.4); if (ob.intersectsBox(ab)) { penHere = true; note('penetration', { t: +t.toFixed(2), a: a.name, b: 'obstacle' }); break; } }
      }
      if (penHere) pen++;
      for (const p2 of this.props.values()) { if (p2.group.visible) { const lp = lastPos.get(p2); const cp = p2.group.position.clone(); if (lp) motion += cp.distanceTo(lp); lastPos.set(p2, cp); } }
    }
    const S = rep.samples, pct = x => +(100 * x / S).toFixed(1);
    rep.stats = { durationS: t1, shots: this.shots.length, cuts, avgShotS: +(t1 / Math.max(this.shots.length, 1)).toFixed(2), subjectFracMedian: +(fracs.sort((a, b) => a - b)[Math.floor(fracs.length / 2)] || 0).toFixed(2), subjectFracMin: +(fracs[0] || 0).toFixed(2), subjectOffFramePct: pct(offFrame), subjectTooSmallPct: pct(small), occludedPct: pct(occl), cameraInGeometryPct: pct(inGeo), cameraPulledPct: pct(pulled), cameraReframedPct: pct(moved), penetrationPct: pct(pen), floatingPct: pct(floating), jerkEvents: jerk, maxCamSpeed: +maxSpeed.toFixed(1), totalMotionUnits: +motion.toFixed(1), actors: this.actors.size, noShotSamples: noShot };
    const q = rep.stats, bad = rep.problems;
    if (q.noShotSamples > 0) bad.push('no shot covers part of the timeline');
    if (q.subjectOffFramePct > 3) bad.push(`subject out of frame ${q.subjectOffFramePct}% of the time`);
    if (q.subjectTooSmallPct > 8) bad.push(`subject too small ${q.subjectTooSmallPct}% of the time`);
    if (q.occludedPct > 8) bad.push(`subject occluded ${q.occludedPct}% of the time`);
    if (q.cameraInGeometryPct > 0) bad.push(`camera inside geometry ${q.cameraInGeometryPct}%`);
    if (q.penetrationPct > 2) bad.push(`bodies/obstacles interpenetrate ${q.penetrationPct}%`);
    if (q.floatingPct > 2) bad.push(`feet off the ground ${q.floatingPct}%`);
    if (q.jerkEvents > 3) bad.push(`${q.jerkEvents} abrupt camera accelerations`);
    if (q.totalMotionUnits < t1 * 0.4) bad.push('scene is nearly static: little actor or prop movement');
    const moving = this.shots.filter(s => ['track', 'move', 'orbit', 'truck', 'pan', 'push'].includes(s.type) && !s.why); if (moving.length) bad.push(`${moving.length} moving shot(s) without a "why" (motivation)`);
    rep.pass = bad.length === 0; return rep;
  }
}
