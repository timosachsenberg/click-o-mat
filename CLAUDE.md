# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A SCUMM-style point-and-click adventure engine in TypeScript on Phaser 4, plus a fully playable demo game ("Ned the Tentacle") that exercises every engine feature. The demo's art is SVG written in code (a DOTT / Return-to-Monkey-Island cartoon style: wobbly inked shapes, cel shading, paper grain), rasterized at runtime; its audio is procedural. The PNGs in `public/img/` (gallery, Blobbo, pillar, sconce, bird, rain) exercise the file pipeline and are rendered from SVG sources in `src/game/art/pngSources.ts` by `tools/gen-assets.mjs`.

Next to the demo lives the actual adventure, **„Folge dem Bass“** (`src/goa/`, German UI and dialog): it starts in the Picasso, Ali's basement bar (`rooms/picasso.ts`, after the concept art in issue #5), with a two-euro coin in the inventory. `main.ts` registers one of the two games per page load — `?game=goa|demo`, else the last pick (localStorage), else the adventure — and the title screen's picker (SPIEL · DEMO) switches by reloading with `?game=`.

## Commands

```bash
npm install                          # deps (Phaser, inkjs; Vite/TS/Playwright as dev deps)
npm run dev                          # Vite dev server on :5173, hot-reloads
npm run build                        # tsc --noEmit (strict type-check) then vite build → dist/
npm run preview                      # serve the built dist/

npx playwright install chromium      # one-time browser download before first test run
npm test                             # all e2e suites (~15 min) — starts its own dev server on :5199
node tests/run-all.mjs ink title     # run only suites whose filename contains these substrings
BASE_URL='https://site/?game=demo' node tests/smoke.mjs   # smoke-test a deployed build
```

There is no linter and no unit-test framework — the test suite is entirely end-to-end Playwright scripts in `tests/*.mjs` (plain Node scripts, not `@playwright/test`). Type-checking (`npm run build` or `npx tsc --noEmit`) is the static gate.

CI (`.github/workflows/`): `test.yml` runs `npm test` on every push to main; `deploy.yml` builds and publishes `dist/` to GitHub Pages.

## Architecture

The core split: **`src/engine/` is the reusable engine; `src/game/` (the demo) and `src/goa/` (the adventure) are game content.** Building or changing game content (rooms, items, dialogs, puzzles) should never require engine edits; engine changes are for new capabilities.

### Engine (`src/engine/`)

Four Phaser scenes registered in `src/main.ts`:

- **`BootScene`** — loads the global asset manifest (files via Phaser's loader; `svgImages`/`svgActors` rasterized into textures with their animations), waits for the UI theme's web font, then hands off.
- **`TitleScene`** — New Game / Continue menu; the start click doubles as the browser audio-unlock gesture.
- **`RoomScene`** — the current room: layer stack, actors, camera/scrolling, hotspot hit-testing, regions, ambients, and the verb-interaction state machine.
- **`UIScene`** — persistent overlay: verb grid, sentence line, inventory, dialog choices, options menu.

They are tied together by the **`Engine` singleton** (`engine/Engine.ts`), which holds the content registries, the live `GameState` (flags, per-character inventory + location), current verb/item selection, save/load (localStorage, `SAVE_SLOTS` slots incl. quick + auto, namespaced by `GameContent.id`), the UI strings, the optional game `launcher`, and a cross-scene `EventEmitter`.

**Game scripts never touch Phaser directly.** All content handlers (hotspot verbs, `onEnter` cutscenes, dialogs, ambients, regions) receive a **`ScriptContext`** (`engine/ScriptContext.ts`) — an async/await API (`ctx.walkTo`, `ctx.say`, `ctx.setFlag`, `ctx.goToRoom`, `ctx.repaint`, `ctx.tween`, …). This indirection is what makes cutscene fast-forward (Esc) work: scripts run to completion instantly with all state intact.

Other load-bearing pieces:

- `types.ts` — all content-definition types (`RoomDef`, `HotspotDef`, `LayerDef`, …). Start here to understand the content contract.
- **Depth model:** a room is a stack of `LayerDef`s sharing one depth axis with actors, whose depth is their feet-y. `Layer.BEHIND < 0…roomHeight (occluder baselines) < Layer.FRONT`. Each layer has exactly one source: `image`, `svg` (markup or `(state) => markup`), `paint(g, state)`, or `anim`. Diagonal occluders are built by slicing art into layers with different baselines (see `stairhall.ts`).
- **SVG layers** (`engine/svgTex.ts`, `RoomScene.prepareSvgLayers`): decoding is async, so a room's svg layers are rasterized under the transition fade before `loadRoom` builds it (always enter rooms via `enterRoom`/`transitionTo`, never `loadRoom` directly). Each distinct markup is cached per layer (current + previous room kept); a repaint yielding new markup swaps the texture once decoded — `await ctx.repaint()` to wait. SVG-as-image can't use web fonts or external files.
- **State-driven visuals:** layer `svg`/`paint`, `walkArea`, `holes`, and `visible` all receive `GameState`; `ctx.repaint()` re-derives everything from flags. Prefer static backdrops plus small state overlay layers. Durable changes must go through flags + repaint — direct `ctx.layerObj()` tweens are transient cutscene staging only.
- `strings.ts` — every piece of engine-written UI text (`UIStrings`, English defaults); a game overrides any subset via `GameContent.strings` (the adventure: `src/goa/strings.ts`). Don't hard-code new UI text in engine scenes — add a field.
- **Custom actor poses:** `SvgActorAsset.poses` may define poses beyond idle/walk/talk; `ActorDef.stance(state)` swaps idle for one durably (re-derived on repaint), `ctx.animate(actor, pose, ms?)` plays one as transient cutscene staging.
- `Pathfinder.ts` — visibility graph + Dijkstra over the walk polygon minus holes.
- `Audio.ts` — one WebAudio graph mixing procedural chiptune/SFX and loaded files; a loaded key overrides a procedural one of the same name.
- `DialogRunner.ts` / `InkDialogRunner.ts` — native branching dialog trees, and ink (inkjs) conversations whose full state serializes into a normal save flag. The ink runner is structurally typed so games without ink don't depend on inkjs.
- Logical resolution is fixed in `constants.ts`: 960×600 total, top 450 is the room viewport, bottom 150 the UI band. Rooms may be larger than a screen (`RoomDef.size`) — the camera scrolls, and all content coordinates are world coordinates.

### Game content (`src/game/`)

Each game registers one `CONTENT: GameContent` in its `index.ts`; the demo's (`src/game/index.ts`) has the rooms map, `items.ts`, `actors.ts`, `dialogs.ts`, player/start location, the global SVG manifest (cast + icons + UI panel) and the UI `theme` (bundled Fredoka font, panel/slot art, verb colours).

Art lives in `src/game/art/`: `toon.ts` is the style toolkit (`wobble`, `crookedRect`, `inked`, `glow`, `vignette`, `grainOverlay` — seeded, so markup is stable for the texture cache); `characters.ts` rigs Norb/Pia/Ned as SVG puppets posed from joint angles; `icons.ts`, `ui.ts`, `pngSources.ts`. Each room file draws its own SVG layers with the toolkit. Keep hotspot rects aligned with the art when redrawing.

One file per room in `rooms/`. Assets are declared per-room (`RoomDef.assets`, lazily loaded on first entry) rather than in a global manifest — keep new PNGs on the room that uses them. PNG files live in `public/img/` and URLs must be prefixed with `import.meta.env.BASE_URL` (the site deploys under a GitHub Pages subpath; `vite.config.ts` sets `base: './'`).

The adventure (`src/goa/`) has the same layout, reuses the demo's `toon.ts` toolkit, UI panel art and puppet rig (`characters.ts` exports `humanDraw`, `drawHumanFront`, `HumanLook` with `head`/`torso` hooks), and adds `strings.ts` (German UI), `music.ts` (procedural tracks via `GameContent.music`) and `startItems`. Its text is German — keep new content for it in German.

Spritesheet actors follow the animation key convention `<textureSet>-<pose>-<variant>` (pose: `idle|walk|talk`; variant: `front|back|side`) — that naming is the entire actor/engine contract.

The README's "Content reference" section is the authoritative, detailed guide to `RoomDef`, hotspots, layers, ambients, regions, multi-character parties, and the full `ScriptContext` API — consult it before adding content, and keep it updated when engine behavior changes (it is the project's user-facing documentation).

## Testing conventions

- Suites drive the real game in Chromium via dev-only debug hooks `window.__engine` and `window.__audio` (exposed in `main.ts` only when `import.meta.env.DEV`) — this is why the runner requires a Vite dev server, not a built bundle.
- The suites drive the **demo**: their default `BASE_URL` (and the one `run-all.mjs` passes) carries `?game=demo`; `verify-goa.mjs` covers the adventure and the game picker. Build URL variants with `new URL(BASE)` + `searchParams`, not string concatenation.
- Each suite is a standalone `.mjs` script that exits non-zero on failure; `tests/run-all.mjs` lists them in `ALL_SUITES` (ordered fast → slow) — **add new suites to that list**.
- Suites read `BASE_URL` and `SHOT_DIR` from the environment; failure screenshots go to `tests/screenshots/` (git-ignored).
- Clicks map game coordinates through the FIT-scaled canvas bounding box (see any suite's `gx`/`gy` helpers).

## Conventions

- TypeScript is `strict` with `noUnusedLocals`; the build is type-check + bundle only (`noEmit`, Vite does the emit).
- Commit messages follow conventional-commit style (`feat:`, `fix:`).
- Right-click is a game input; `main.ts` suppresses the context menu.
- Procedural textures (SVG layers/sprites included — they're rasterized into canvases) are canvas-backed, and some GPU/driver combos corrupt canvas-texture alpha in WebGL — sometimes only in the draw path, undetectable by upload-side probes (opaque black boxes). The game therefore defaults to the Canvas renderer; `?renderer=webgl|auto` opts into WebGL, where `src/engine/renderCompat.ts` reroutes canvas uploads through `ImageData` as a hardening. Keep this in mind when touching texture generation, and keep `tests/verify-renderer.mjs` passing.
