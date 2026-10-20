// Runtime: renderer, mood lighting, orbit camera, deterministic clock. You normally edit only scene.js.
import * as THREE from 'three';
import * as kit from './kit.js';
import { Director } from './cine.js';
import { Assets } from './assets.js';
import sceneDef from './scene.js';

const MOODS = {
  day:    { top: '#4a9be8', sky: '#bfe3ff', fog: '#cfe8ff', gnd: '#b0a58e', amb: 0.8, sun: '#fff1d0', sunI: 3.3, sunPos: [14, 18, 10], exposure: 1.18 },
  sunset: { top: '#4b4f9c', sky: '#ff9f6e', fog: '#ffb48a', gnd: '#6b4a4a', amb: 0.5, sun: '#ffa660', sunI: 2.6, sunPos: [-14, 6, 8], exposure: 1.1 },
  night:  { top: '#050818', sky: '#1a2560', fog: '#121a45', gnd: '#1b2a3a', amb: 0.5, sun: '#8fa8ff', sunI: 1.3, sunPos: [-8, 14, 6], stars: true, exposure: 1.2 },
  studio: { top: '#1d2333', sky: '#3a4562', fog: '#2a3146', gnd: '#2a3042', amb: 1.0, sun: '#ffffff', sunI: 3.0, sunPos: [6, 12, 9], exposure: 1.3 },
};

const q = new URLSearchParams(location.search);
const state = { ready: false, errors: [], frame: 0 };
window.__i3d = state;
window.addEventListener('error', e => state.errors.push(String(e.message)));

const cfg = Object.assign({ mood: 'day', camera: { radius: 9, height: 4, target: [0, 1.5, 0], sway: 0.15 }, pixel: false, duration: 12 }, sceneDef.config || {});
if (q.get('mood') && MOODS[q.get('mood')]) cfg.mood = q.get('mood');
if (q.get('pixel')) cfg.pixel = q.get('pixel') === '1';
const mood = MOODS[cfg.mood] || MOODS.day;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !cfg.pixel, preserveDrawingBuffer: true }); window.__renderer = renderer;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = mood.exposure || 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(cfg.pixel ? 0.4 : Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(mood.fog, cfg.fog ? cfg.fog[0] : 35, cfg.fog ? cfg.fog[1] : 110);
const dome = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(mood.top) }, bot: { value: new THREE.Color(mood.sky) } },
  vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float h; void main(){ gl_FragColor = vec4(mix(bot, top, pow(clamp(h,0.0,1.0), 0.55)), 1.0); }' }));
scene.add(dome);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(mood.sky, mood.gnd, mood.amb * 1.6));
const sun = new THREE.DirectionalLight(mood.sun, mood.sunI);
sun.position.set(...mood.sunPos); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
scene.add(sun);
if (mood.stars) scene.add(kit.stars());

const cine = new Director({ scene, camera, renderer }); cine.duration = cfg.duration; window.__cine = cine;
const ctx = { THREE, kit, scene, camera, renderer, mood: cfg.mood, config: cfg, cine, assets: new Assets() };
const fadeEl = document.createElement('div'); fadeEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0'; document.body.appendChild(fadeEl);
let free = false;
document.getElementById('title').textContent = sceneDef.title || 'Idea to 3D';
if (q.has('capture') || q.get('embed')) document.getElementById('hud').style.display = 'none';   // clean frames for QA videos and embeds
try { await sceneDef.build(ctx); } catch (e) { state.errors.push('build: ' + e.message); console.error(e); }

// Orbit camera (drag + wheel), gentle auto sway.
const cam = { az: 0.6, el: Math.atan2(cfg.camera.height, cfg.camera.radius), r: cfg.camera.radius, drag: null, user: false };
canvas.addEventListener('pointerdown', e => { cam.drag = [e.clientX, e.clientY]; cam.user = true; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', () => cam.drag = null);
canvas.addEventListener('pointermove', e => { if (!cam.drag) return; cam.az -= (e.clientX - cam.drag[0]) * 0.006; cam.el = kit.clamp(cam.el + (e.clientY - cam.drag[1]) * 0.005, 0.05, 1.45); cam.drag = [e.clientX, e.clientY]; });
canvas.addEventListener('wheel', e => { e.preventDefault(); cam.r = kit.clamp(cam.r * (1 + e.deltaY * 0.001), 2, 40); }, { passive: false });
let paused = false;
addEventListener('keydown', e => { if (e.code === 'Space') { paused = !paused; e.preventDefault(); } if (e.code === 'KeyC' && cine.shots.length) { free = !free; cam.user = true; } });

function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let fixedT = q.has('t') ? parseFloat(q.get('t')) : null;   // ?t=3.5 freezes the scene at 3.5 s (deterministic captures)
let clock0 = performance.now(), paused0 = 0;

const orbitSpd = parseFloat(q.get('orbit') || '0') || 0;
const manual = q.has('capture');                              // ?capture=1: no free-running loop, render only when __setTime is called (fast, deterministic)
function draw(tt) {
  try { sceneDef.update && sceneDef.update(tt, ctx); } catch (e) { if (state.errors.length < 5) state.errors.push('update: ' + e.message); }
  if (cine.shots.length && !free) { cine.eval(tt); fadeEl.style.background = cine.fadeNow.color; fadeEl.style.opacity = cine.fadeNow.a; }
  else {
    if (cine.actors.size || cine.props.size) cine.evalActors(tt);
    const sway = cam.user ? 0 : Math.sin(tt / cfg.duration * Math.PI * 2) * cfg.camera.sway;
    const a = cam.az + sway + orbitSpd * tt, T = cfg.camera.target;   // ?orbit=0.4 adds a steady turn (rad/s), handy for demos
    camera.position.set(T[0] + Math.sin(a) * Math.cos(cam.el) * cam.r, T[1] + Math.sin(cam.el) * cam.r, T[2] + Math.cos(a) * Math.cos(cam.el) * cam.r);
    camera.lookAt(T[0], T[1], T[2]);
  }
  dome.position.copy(camera.position);
  renderer.render(scene, camera);
  state.frame++; state.ready = true;
}
window.__setTime = t => { fixedT = t; if (manual) draw(cfg.duration ? t % cfg.duration : t); };
function frame(now) {
  const t = fixedT ?? (paused ? paused0 : (now - clock0) / 1000 * (reduce ? 0.3 : 1));
  if (!paused && fixedT === null) paused0 = t;
  draw(cfg.duration ? t % cfg.duration : t);
  if (!manual) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
