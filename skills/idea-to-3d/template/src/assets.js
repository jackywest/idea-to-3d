// GLB/glTF asset loader: normalises scale and ground contact, harmonises materials, wires animation clips.
// Works on a local folder of models (default ./assets/<pack>/<file>.glb) or any resolver you pass in.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// Default clip-name map used by the director: director name -> clip name in the model.
export const KENNEY_CLIPS = { idle: 'idle', walk: 'walk', carrywalk: 'walk', run: 'sprint', talk: 'emote-yes', wave: 'interact-right', oops: 'emote-no', startle: 'jump', shrug: 'emote-no', point: 'interact-right', cheer: 'jump', carry: 'holding-both', reach: 'pick-up', sad: 'idle', push: 'interact-left', fall: 'die', stand: 'idle', hop: 'jump' };
export const EXPRESSIVE_CLIPS = { idle: 'Idle', walk: 'Walking', carrywalk: 'Walking', run: 'Running', talk: 'Yes', wave: 'Wave', oops: 'No', startle: 'Jump', shrug: 'No', point: 'ThumbsUp', cheer: 'Dance', carry: 'Idle', reach: 'Punch', sad: 'Sitting', push: 'Punch', fall: 'Death', stand: 'Standing', hop: 'WalkJump' };

export class Assets {
  // resolver(idOrPath) -> URL. Paths are refused unless they stay relative (no scheme, no "..").
  constructor({ resolver = id => `./assets/${id}.glb`, style = null } = {}) { this.resolver = resolver; this.loader = new GLTFLoader(); this.cache = new Map(); this.style = style; this.warnings = []; (window.__assetIds ||= new Set()); }
  async _gltf(id) {
    if (typeof id !== 'string' || !/^[A-Za-z0-9._\-\/]+$/.test(id) || id.includes('..') || id.startsWith('/')) throw new Error('asset id refused: ' + String(id).slice(0, 60));   // ids are plain relative names: no scheme, no .., no absolute path
    if (!this.cache.has(id)) {
      window.__assetIds.add(id);
      const url = this.resolver(id);
      if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith(location.origin) || url.includes('..')) throw new Error('asset URL refused: ' + id);
      this.cache.set(id, new Promise((ok, ko) => this.loader.load(url, ok, undefined, e => ko(new Error('cannot load asset ' + id + ': ' + (e?.message || e))))));
    }
    return this.cache.get(id);
  }
  _prep(root, { shadows = true, style = this.style } = {}) {
    root.traverse(o => {
      if (o.isMesh) { o.castShadow = shadows; o.receiveShadow = shadows; if (style === 'flat' && o.material) { o.material = o.material.clone(); o.material.flatShading = true; o.material.needsUpdate = true; } if (o.material && 'roughness' in o.material && o.material.roughness < 0.4) o.material.roughness = 0.6; if (o.material?.map) o.material.map.colorSpace = THREE.SRGBColorSpace; }
    });
  }
  // Static prop/building: scaled so its height (or longest side with `fit`) matches `height`/`size`, sitting on y = 0, centred on x/z.
  async model(id, { height = null, size = null, shadows = true, style = this.style, center = true, yaw = 0 } = {}) {
    const g = await this._gltf(id); const obj = SkeletonUtils.clone(g.scene); obj.rotation.y = yaw; this._prep(obj, { shadows, style });
    const box = new THREE.Box3().setFromObject(obj); const sz = box.getSize(new THREE.Vector3());
    const k = height ? height / (sz.y || 1) : size ? size / Math.max(sz.x, sz.y, sz.z, 1e-6) : 1;
    obj.scale.multiplyScalar(k);
    const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3());
    obj.position.set(center ? -c.x : 0, -b2.min.y, center ? -c.z : 0);
    const wrap = new THREE.Group(); wrap.add(obj); wrap.userData.assetId = id; wrap.userData.size = b2.getSize(new THREE.Vector3()); wrap.userData.clips = g.animations || [];
    return wrap;
  }
  // Animated character: returns a rig the Director understands: { group, mixer, clips{name:clip}, map, height }.
  async character(id, { height = 1.7, map = KENNEY_CLIPS, style = this.style, yaw = Math.PI } = {}) {   // yaw: Kenney models face -Z, the director expects +Z
    const g = await this._gltf(id); const obj = SkeletonUtils.clone(g.scene); obj.rotation.y = yaw; this._prep(obj, { style });
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj, true); const k = height / ((box.max.y - box.min.y) || 1); obj.scale.multiplyScalar(k);   // precise=true: measures skinned meshes in their bind pose
    obj.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(obj, true); obj.position.y -= b2.min.y;
    const group = new THREE.Group(); group.add(obj);
    const mixer = new THREE.AnimationMixer(obj); const clips = {}; for (const c of g.animations || []) clips[c.name] = c;
    for (const [k2, v] of Object.entries(map)) if (!clips[v] && !this.warnings.includes(`${id}:${v}`)) this.warnings.push(`${id}: clip "${v}" (for "${k2}") missing`);
    return { group, mixer, clips, map, height, assetId: id };
  }
}
