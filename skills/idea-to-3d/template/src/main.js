// Runtime: renderer, mood lighting, orbit camera, deterministic clock. You normally edit only scene.js.
import * as THREE from 'three';
import * as kit from './kit.js';
import sceneDef from './scene.js';

const MOODS = {
  day:    { top: '#4a9be8', sky: '#bfe3ff', fog: '#cfe8ff', gnd: '#6a8f4a', amb: 0.55, sun: '#fff1d0', sunI: 3.0, sunPos: [10, 16, 8], exposure: 1.05 },
  sunset: { top: '#4b4f9c', sky: '#ff9f6e', fog: '#ffb48a', gnd: '#6b4a4a', amb: 0.5, sun: '#ffa660', sunI: 2.6, sunPos: [-14, 6, 8], exposure: 1.1 },
  night:  { top: '#050818', sky: '#1a2560', fog: '#121a45', gnd: '#1b2a3a', amb: 0.5, sun: '#8fa8ff', sunI: 1.3, sunPos: [-8, 14, 6], stars: true, exposure: 1.2 },
  studio: { top: '#20242c', sky: '#2c313b', fog: '#2c313b', gnd: '#15171c', amb: 0.6, sun: '#ffffff', sunI: 2.6, sunPos: [5, 10, 8], exposure: 1.0 },
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !cfg.pixel, preserveDrawingBuffer: true });
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = mood.exposure || 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(cfg.pixel ? 0.4 : Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(mood.fog, 35, 110);
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

const ctx = { THREE, kit, scene, camera, renderer, mood: cfg.mood, config: cfg };
document.getElementById('title').textContent = sceneDef.title || 'Idea to 3D';
try { sceneDef.build(ctx); } catch (e) { state.errors.push('build: ' + e.message); console.error(e); }

// Orbit camera (drag + wheel), gentle auto sway.
const cam = { az: 0.6, el: Math.atan2(cfg.camera.height, cfg.camera.radius), r: cfg.camera.radius, drag: null, user: false };
canvas.addEventListener('pointerdown', e => { cam.drag = [e.clientX, e.clientY]; cam.user = true; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', () => cam.drag = null);
canvas.addEventListener('pointermove', e => { if (!cam.drag) return; cam.az -= (e.clientX - cam.drag[0]) * 0.006; cam.el = kit.clamp(cam.el + (e.clientY - cam.drag[1]) * 0.005, 0.05, 1.45); cam.drag = [e.clientX, e.clientY]; });
canvas.addEventListener('wheel', e => { e.preventDefault(); cam.r = kit.clamp(cam.r * (1 + e.deltaY * 0.001), 2, 40); }, { passive: false });
let paused = false;
addEventListener('keydown', e => { if (e.code === 'Space') { paused = !paused; e.preventDefault(); } });

function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let fixedT = q.has('t') ? parseFloat(q.get('t')) : null;   // ?t=3.5 freezes the scene at 3.5 s (deterministic captures)
window.__setTime = t => { fixedT = t; };                     // used by capture.mjs
let clock0 = performance.now(), paused0 = 0;

function frame(now) {
  let t = fixedT ?? (paused ? paused0 : (now - clock0) / 1000 * (reduce ? 0.3 : 1));
  if (!paused && fixedT === null) paused0 = t;
  const tt = cfg.duration ? t % cfg.duration : t;
  try { sceneDef.update && sceneDef.update(tt, ctx); } catch (e) { if (state.errors.length < 5) state.errors.push('update: ' + e.message); }
  const sway = cam.user ? 0 : Math.sin(tt / cfg.duration * Math.PI * 2) * cfg.camera.sway;
  const a = cam.az + sway, T = cfg.camera.target;
  camera.position.set(T[0] + Math.sin(a) * Math.cos(cam.el) * cam.r, T[1] + Math.sin(cam.el) * cam.r, T[2] + Math.cos(a) * Math.cos(cam.el) * cam.r);
  camera.lookAt(T[0], T[1], T[2]);
  dome.position.copy(camera.position);
  renderer.render(scene, camera);
  state.frame++; state.ready = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
