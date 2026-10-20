# Bundled assets (CC0)

Everything in `assets/` is CC0 1.0 (see `assets/NOTICE.md` and each pack's `LICENSE.txt`). Ids are `<pack>/<file>` and go straight into `assets.model(id)` / `assets.character(id)`.

**kenney-car-kit**: box, cone, delivery, sedan, taxi

**kenney-city-commercial**: building-a, building-b, building-c, building-d, building-e, building-f, building-g, building-skyscraper-a

**kenney-city-roads**: light-square, road-crossroad, road-straight

**kenney-city-suburban**: building-type-b, building-type-c, tree-large, tree-small

**kenney-mini-characters**: character-female-b, character-female-d, character-female-e, character-male-a, character-male-c

**kenney-space-kit**: desk_computerCorner, gate_simple, machine_barrelLarge, machine_generator, machine_generatorLarge, platform_large, satelliteDish_large

**robot-expressive**: RobotExpressive


## Scale and facing (already handled by the loader)

- `assets.model(id, {height | size})` rescales so height (or longest side) matches, puts the base on y = 0, centres x/z.
- `assets.character(id, {height, map})` returns a rig the Director can drive. Kenney characters face -Z in the file; the loader turns them (`yaw: Math.PI`) so +Z is the front everywhere. RobotExpressive faces +Z (`yaw: 0`).
- Clip names differ per model: pass a `map` from director names (`idle walk carrywalk run talk wave oops startle shrug point cheer carry reach sad push fall stand hop`) to clip names. Ready-made: `KENNEY_CLIPS`, `EXPRESSIVE_CLIPS`. Missing clips fall back to idle and are listed in `assets.warnings`.
- Character height 2.2 m next to a 10 m building reads as "cartoon", not "realistic": keep the ratio.

## Using your own models

Put `.glb` files under `assets/<your-pack>/` (embedded textures preferred; a `Textures/` folder next to the file also works). Only use models you have the right to use, and keep their licence text next to them. Imported files are untrusted data: the loader only reads inside the project, refuses `..` and URLs with a scheme, and never executes anything from a model.
