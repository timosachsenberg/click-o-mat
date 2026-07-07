# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A SCUMM-style point-and-click adventure engine in TypeScript on Phaser 4, plus a fully playable demo game ("Ned the Tentacle") that exercises every engine feature. Nearly all demo art and audio are generated procedurally at runtime (the few PNGs in `public/img/` are placeholders regenerable via `tools/gen-assets.mjs`).

## Commands

```bash
npm install                          # deps (Phaser, inkjs; Vite/TS/Playwright as dev deps)
npm run dev                          # Vite dev server on :5173, hot-reloads
npm run build                        # tsc --noEmit (strict type-check) then vite build → dist/
npm run preview                      # serve the built dist/

npx playwright install chromium      # one-time browser download before first test run
npm test                             # all e2e suites (~15 min) — starts its own dev server on :5199
node tests/run-all.mjs ink title     # run only suites whose filename contains these substrings
BASE_URL=https://site/ node tests/smoke.mjs   # smoke-test a deployed build
```

There is no linter and no unit-test framework — the test suite is entirely end-to-end Playwright scripts in `tests/*.mjs` (plain Node scripts, not `@playwright/test`). Type-checking (`npm run build` or `npx tsc --noEmit`) is the static gate.

CI (`.github/workflows/`): `test.yml` runs `npm test` on every push to main; `deploy.yml` builds and publishes `dist/` to GitHub Pages.

## Architecture

The core split: **`src/engine/` is the reusable engine, `src/game/` is game content.** Building or changing game content (rooms, items, dialogs, puzzles) should never require engine edits; engine changes are for new capabilities.

### Engine (`src/engine/`)

Four Phaser scenes registered in `src/main.ts`:

- **`BootScene`** — generates every procedural texture/animation, preloads the global asset manifest, then hands off.
- **`TitleScene`** — New Game / Continue menu; the start click doubles as the browser audio-unlock gesture.
- **`RoomScene`** — the current room: layer stack, actors, camera/scrolling, hotspot hit-testing, regions, ambients, and the verb-interaction state machine.
- **`UIScene`** — persistent overlay: verb grid, sentence line, inventory, dialog choices, options menu.

They are tied together by the **`Engine` singleton** (`engine/Engine.ts`), which holds the content registries, the live `GameState` (flags, per-character inventory + location), current verb/item selection, save/load (localStorage, `SAVE_SLOTS` slots incl. quick + auto), and a cross-scene `EventEmitter`.

**Game scripts never touch Phaser directly.** All content handlers (hotspot verbs, `onEnter` cutscenes, dialogs, ambients, regions) receive a **`ScriptContext`** (`engine/ScriptContext.ts`) — an async/await API (`ctx.walkTo`, `ctx.say`, `ctx.setFlag`, `ctx.goToRoom`, `ctx.repaint`, `ctx.tween`, …). This indirection is what makes cutscene fast-forward (Esc) work: scripts run to completion instantly with all state intact.

Other load-bearing pieces:

- `types.ts` — all content-definition types (`RoomDef`, `HotspotDef`, `LayerDef`, …). Start here to understand the content contract.
- **Depth model:** a room is a stack of `LayerDef`s sharing one depth axis with actors, whose depth is their feet-y. `Layer.BEHIND < 0…roomHeight (occluder baselines) < Layer.FRONT`. Each layer has exactly one source: `image`, `paint(g, state)`, or `anim`. Diagonal occluders are built by slicing art into layers with different baselines (see `stairhall.ts`).
- **State-driven visuals:** layer `paint`, `walkArea`, `holes`, and `visible` all receive `GameState`; `ctx.repaint()` re-derives everything from flags. Durable changes must go through flags + repaint — direct `ctx.layerObj()` tweens are transient cutscene staging only.
- `Pathfinder.ts` — visibility graph + Dijkstra over the walk polygon minus holes.
- `Audio.ts` — one WebAudio graph mixing procedural chiptune/SFX and loaded files; a loaded key overrides a procedural one of the same name.
- `DialogRunner.ts` / `InkDialogRunner.ts` — native branching dialog trees, and ink (inkjs) conversations whose full state serializes into a normal save flag. The ink runner is structurally typed so games without ink don't depend on inkjs.
- Logical resolution is fixed in `constants.ts`: 960×600 total, top 450 is the room viewport, bottom 150 the UI band. Rooms may be larger than a screen (`RoomDef.size`) — the camera scrolls, and all content coordinates are world coordinates.

### Game content (`src/game/`)

Everything is registered in `src/game/index.ts` (`CONTENT: GameContent`): rooms map, `items.ts`, `actors.ts`, `dialogs.ts`, player/start location. One file per room in `rooms/`. Assets are declared per-room (`RoomDef.assets`, lazily loaded on first entry) rather than in a global manifest — keep new PNGs on the room that uses them. PNG files live in `public/img/` and URLs must be prefixed with `import.meta.env.BASE_URL` (the site deploys under a GitHub Pages subpath; `vite.config.ts` sets `base: './'`).

Spritesheet actors follow the animation key convention `<textureSet>-<pose>-<variant>` (pose: `idle|walk|talk`; variant: `front|back|side`) — that naming is the entire actor/engine contract.

The README's "Content reference" section is the authoritative, detailed guide to `RoomDef`, hotspots, layers, ambients, regions, multi-character parties, and the full `ScriptContext` API — consult it before adding content, and keep it updated when engine behavior changes (it is the project's user-facing documentation).

## Testing conventions

- Suites drive the real game in Chromium via dev-only debug hooks `window.__engine` and `window.__audio` (exposed in `main.ts` only when `import.meta.env.DEV`) — this is why the runner requires a Vite dev server, not a built bundle.
- Each suite is a standalone `.mjs` script that exits non-zero on failure; `tests/run-all.mjs` lists them in `ALL_SUITES` (ordered fast → slow) — **add new suites to that list**.
- Suites read `BASE_URL` and `SHOT_DIR` from the environment; failure screenshots go to `tests/screenshots/` (git-ignored).
- Clicks map game coordinates through the FIT-scaled canvas bounding box (see any suite's `gx`/`gy` helpers).

## Conventions

- TypeScript is `strict` with `noUnusedLocals`; the build is type-check + bundle only (`noEmit`, Vite does the emit).
- Commit messages follow conventional-commit style (`feat:`, `fix:`).
- Right-click is a game input; `main.ts` suppresses the context menu.
- Procedural textures are canvas-backed, and some GPU/driver combos corrupt canvas-texture alpha in WebGL — sometimes only in the draw path, undetectable by upload-side probes (opaque black boxes). The game therefore defaults to the Canvas renderer; `?renderer=webgl|auto` opts into WebGL, where `src/engine/renderCompat.ts` reroutes canvas uploads through `ImageData` as a hardening. Keep this in mind when touching texture generation, and keep `tests/verify-renderer.mjs` passing.
