# Design rules that make a scene look intentional

1. **One hero, readable from far.** The hero is the largest or brightest object and sits near the camera target. Its silhouette must read against the background (blue robot on green, white tower on a dark sea).
2. **Three depth layers.** Foreground (rocks, grass, a fence), midground (the hero), background (hills, a house, trees). A flat row of objects looks like a toy shelf.
3. **Limited palette.** 4 to 6 colours per scene, one accent. Pick them as hex codes up front and reuse them.
4. **Scale honesty.** Objects keep believable proportions to each other (a door is taller than a dog). Use the hero as the unit.
5. **One motion that tells the story.** A wave, a sweep, a trot. Add at most two secondary motions at different speeds. Loop seamlessly: use `Math.sin(t / duration * 2π * k)` with an integer `k`.
6. **Light tells the mood.** Night needs a visible light source (lantern, window, beam) plus a `PointLight` for it. Day needs shadows on the ground. Do not rely on ambient only.
7. **Camera.** Default `radius` about 5 to 6 times the hero height, `height` about 1 to 2 times it, `target` at the hero's chest. Keep `sway` below 0.35 so the scene does not feel seasick. Size `radius` so that the farthest moving object (a boat on its orbit, a dog circling) stays in frame: `radius >= 1.3 * (orbit radius + object size)`.
8. **Fog is free depth.** The mood fog starts at 30 units; keep scenery inside about 25 units of the origin.
9. **Check pixels, not intentions.** After capture, look for: objects intersecting the floor, objects hidden behind others, an empty half of the frame, a hero smaller than a fifth of the frame height.
10. **Never a bare floor.** An empty ground with two objects reads as unfinished. Every scene gets: relief (`terrain`), hundreds of scattered small things (`scatter`: grass, flowers, pebbles), a forest or background silhouette, sky life (`clouds`, stars, moon) and one living detail (butterflies, birds, fireflies, water). Aim for 15 to 40 distinct objects plus scattered instances.
11. **Keep it cheap.** Under 400 meshes, no per-frame object creation, shadows only from the sun.
