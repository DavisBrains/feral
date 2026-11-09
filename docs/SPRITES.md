# Sprite pipeline

The habitat renders with PixiJS (WebGL) and falls back to Canvas2D. Both draw the same `World` state from `app/src/world.ts` using the atlas from `app/src/atlas.ts`.

## Phase 1, always present

Static mood frames from `design/phase1/runtime/creatures/<name>/<name>_<pose>.webp` (front, hungry, critical, fossil for Ash), the two habitats, foreground leaves, the MUNCH seed coin and the refusal stamp. Archive folders that start with an underscore are never loaded.

## Phase 2 drop in

Put `design/phase2/manifest.json` next to the strips. Strips may live anywhere under `design/phase2/` except `masters/`, `sources/`, `previews/` and underscore folders, and files ending `_256` are skipped so masters do not bloat the bundle. Rebuild (`npm run build` or `node build-file.mjs`). No code change is needed.

```json
{
  "frame_size": [128, 128],
  "foot_anchor": [64, 113],
  "fps": 8,
  "creatures": {
    "moss": {
      "idle":      { "file": "runtime/moss/moss_idle.webp", "frames": 6 },
      "walk":      { "file": "runtime/moss/moss_walk.webp", "frames": 8, "fps": 10 },
      "work":      { "file": "runtime/moss/moss_work.webp", "frames": 4 },
      "receive":   { "file": "runtime/moss/moss_receive.webp", "frames": 6 },
      "send":      { "file": "runtime/moss/moss_send.webp", "frames": 6 },
      "seed_open": { "file": "runtime/moss/moss_seed_open.webp", "frames": 8, "loop": false },
      "overlay_hungry":   { "file": "runtime/moss/moss_overlay_hungry.webp", "frames": 1 },
      "overlay_critical": { "file": "runtime/moss/moss_overlay_critical.webp", "frames": 1 }
    }
  }
}
```

Strips are horizontal, one cell per frame, left to right. If frames are trimmed, give `"rects": [[x, y, w, h, dx, dy], ...]` where x, y, w, h is the rectangle in the strip and dx, dy is its offset inside the logical cell. A list form `{"animations": [{"creature": "pip", "animation": "hatch", "sheet": "...", "frame_count": 10, "frame_rate": 12}]}` is also accepted.

Animation names the renderer asks for: `idle`, `walk`, `work`, `receive`, `send`, `fossil`, plus specials `seed_open`, `parent`, `ripple`, `hatch`, `first_bid`, `cooling`. Mood overlays: `overlay_hungry`, `overlay_critical` (or `hungry_overlay`, `critical_overlay`).

## Fallback rules

Any missing animation falls back to `idle`, then to the static phase 1 frame. A hungry or critical creature only uses an animated strip when that mood's overlay exists, so a mood is never hidden behind a generic idle. Walking is driven from code (path, facing, and a step bob when no walk strip exists). MUNCH particles are spawned only from verified snapshot deltas in `app/src/scene.ts`. Particle count is cosmetic. Balances in the HTML come from the snapshot or the live chain read, never from particles arriving.

Reduced motion (system setting, `?motion=reduce`, or the Motion button) turns travel, hatching and coin flights into short opacity changes with persistent state labels. `?renderer=canvas` forces the fallback.
