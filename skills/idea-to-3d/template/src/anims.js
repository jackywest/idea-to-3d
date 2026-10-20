// Procedural body clips for the kit robot (and any rig exposing {head, armL, armR, legL, legR, group}).
// Each clip is a pure function (rig, p, k): p = seconds since the clip started, k = speed/intensity factor.
// The director resets the pose before every clip, so clips only SET rotations (never accumulate).
const S = Math.sin, C = Math.cos, PI = Math.PI;
const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);

export const robotClips = {
  idle: (r, p) => { r.torso.position.y = 0.85 + S(p * 2) * 0.02; r.head.rotation.y = S(p * 0.8) * 0.12; r.armL.rotation.z = -0.06 - S(p * 2) * 0.02; r.armR.rotation.z = 0.06 + S(p * 2) * 0.02; },
  walk: (r, p, k = 1) => { const w = p * 6 * k; r.legL.rotation.x = S(w) * 0.6; r.legR.rotation.x = -S(w) * 0.6; r.armL.rotation.x = -S(w) * 0.5; r.armR.rotation.x = S(w) * 0.5; r.armL.rotation.z = -0.08; r.armR.rotation.z = 0.08; r.group.position.y += Math.abs(S(w)) * 0.08; r.torso.rotation.z = S(w) * 0.04; r.head.rotation.z = -S(w) * 0.03; },
  run: (r, p, k = 1) => { const w = p * 9 * k; r.legL.rotation.x = S(w) * 0.95; r.legR.rotation.x = -S(w) * 0.95; r.armL.rotation.x = -S(w) * 0.9; r.armR.rotation.x = S(w) * 0.9; r.armL.rotation.z = -0.1; r.armR.rotation.z = 0.1; r.group.position.y += Math.abs(S(w)) * 0.18; r.group.rotation.x = 0.12; },
  wave: (r, p) => { r.armR.rotation.z = 2.6 + S(p * 9) * 0.4; r.armL.rotation.z = -0.1; r.head.rotation.z = S(p * 3) * 0.08; },
  talk: (r, p) => { r.armR.rotation.z = 0.5 + S(p * 5) * 0.25; r.armR.rotation.x = -0.6 + S(p * 7) * 0.2; r.armL.rotation.z = -0.15; r.head.rotation.x = S(p * 6) * 0.06; r.head.rotation.y = S(p * 1.5) * 0.15; },
  point: (r, p) => { const a = ease(p / 0.3); r.armR.rotation.x = -1.45 * a; r.armR.rotation.z = 0.15; r.armL.rotation.z = -0.1; r.head.rotation.y = -0.1 * a; },
  reach: (r, p) => { const a = ease(p / 0.5); r.armL.rotation.x = -1.35 * a; r.armR.rotation.x = -1.35 * a; r.torso.rotation.x = 0.25 * a; r.head.rotation.x = 0.2 * a; },
  carry: (r, p) => { r.armL.rotation.x = -1.2; r.armR.rotation.x = -1.2; r.armL.rotation.z = 0.35; r.armR.rotation.z = -0.35; r.torso.position.y = 0.85 + S(p * 2) * 0.02; },
  carrywalk: (r, p, k = 1) => { const w = p * 6 * k; r.legL.rotation.x = S(w) * 0.5; r.legR.rotation.x = -S(w) * 0.5; r.armL.rotation.x = -1.2; r.armR.rotation.x = -1.2; r.armL.rotation.z = 0.35; r.armR.rotation.z = -0.35; r.group.position.y += Math.abs(S(w)) * 0.06; },
  startle: (r, p) => { const a = ease(p / 0.12), back = a * (1 - ease((p - 0.5) / 0.6) * 0.6); r.armL.rotation.z = -2.2 * a; r.armR.rotation.z = 2.2 * a; r.group.position.y += S(Math.min(p / 0.35, 1) * PI) * 0.35; r.torso.rotation.x = -0.3 * back; r.head.rotation.x = -0.25 * back; },
  oops: (r, p) => { const a = ease(p / 0.15); r.armL.rotation.z = -2.0 * a; r.armR.rotation.z = 2.0 * a; r.head.rotation.x = 0.35 * a; r.head.rotation.z = S(p * 12) * 0.12 * a; },
  shrug: (r, p) => { const a = S(Math.min(p / 0.8, 1) * PI); r.armL.rotation.z = -0.7 * a; r.armR.rotation.z = 0.7 * a; r.head.rotation.z = 0.15 * a; r.torso.position.y = 0.85 + 0.06 * a; },
  sad: (r, p) => { const a = ease(p / 0.6); r.head.rotation.x = 0.45 * a; r.torso.rotation.x = 0.12 * a; r.armL.rotation.z = -0.05; r.armR.rotation.z = 0.05; },
  cheer: (r, p) => { r.armL.rotation.z = -2.7 + S(p * 8) * 0.2; r.armR.rotation.z = 2.7 - S(p * 8) * 0.2; r.group.position.y += Math.abs(S(p * 6)) * 0.25; },
  push: (r, p) => { r.armL.rotation.x = -1.5; r.armR.rotation.x = -1.5; r.torso.rotation.x = 0.35; r.legL.rotation.x = S(p * 5) * 0.4; r.legR.rotation.x = -S(p * 5) * 0.4; },
};

export function resetRig(r) {
  for (const k of ['head', 'armL', 'armR', 'legL', 'legR', 'torso']) if (r[k]) r[k].rotation.set(0, 0, 0);
  if (r.torso) r.torso.position.y = 0.85;
}

// Clips for kit.dog(): idle, walk, run (+ aliases the Director uses). Pure functions of p (seconds) like the robot clips.
export const dogClips = {
  idle: (r, p) => { r.tail.rotation.y = Math.sin(p * 5) * 0.5; r.head.rotation.z = Math.sin(p * 1.5) * 0.06; },
  walk: (r, p, k = 1) => { const w = p * 7 * k; r.legs.forEach((l, i) => { l.rotation.z = Math.sin(w + (i % 2) * Math.PI + (i > 1 ? Math.PI / 2 : 0)) * 0.5; }); r.tail.rotation.y = Math.sin(w) * 0.5; r.group.position.y += Math.abs(Math.sin(w)) * 0.03; },
  run: (r, p, k = 1) => { const w = p * 12 * k; r.legs.forEach((l, i) => { l.rotation.z = Math.sin(w + (i > 1 ? Math.PI * 0.8 : 0) + (i % 2) * 0.35) * 0.9; }); r.tail.rotation.y = Math.sin(w * 0.8) * 0.6; r.group.position.y += Math.abs(Math.sin(w)) * 0.12; r.head.rotation.z = Math.sin(w) * 0.08; },
};
export function resetDog(r) { r.legs.forEach(l => l.rotation.set(0, 0, 0)); r.tail.rotation.set(0, 0, 0.5); r.head.rotation.set(0, 0, 0); }
