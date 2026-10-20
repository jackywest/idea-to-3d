// THIS is the file the skill writes. Replace it with your own scene.
// Contract: default export { title, config, build(ctx), update(t, ctx) }.
// update() must be a pure function of t (seconds) so that captures are reproducible.
export default {
  title: 'Starter scene',
  config: { mood: 'day', duration: 8, camera: { radius: 8, height: 3.5, target: [0, 1.2, 0], sway: 0.2 } },
  build({ scene, kit }) {
    scene.add(kit.ground(30, '#7bbf6a'));
    this.hero = kit.robot();
    scene.add(this.hero.group);
  },
  update(t) {
    this.hero.armR.rotation.z = Math.sin(t * 3) * 0.6 + 2.4;
  },
};
