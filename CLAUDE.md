# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A SCUMM-style point-and-click adventure engine in TypeScript on Phaser 4, plus a fully playable demo game ("Ned the Tentacle") that exercises every engine feature. The demo's art is SVG written in code (a DOTT / Return-to-Monkey-Island cartoon style: wobbly inked shapes, cel shading, paper grain), rasterized at runtime; its audio is procedural. The PNGs in `public/img/` (gallery, Blobbo, pillar, sconce, bird, rain) exercise the file pipeline and are rendered from SVG sources in `src/game/art/pngSources.ts` by `tools/gen-assets.mjs`.

Next to the demo lives the actual adventure, **„Folge dem Bass“** (`src/goa/`, German UI and dialog): it starts with the player getting off the bus on the Neckarbrücke (`startRoom: 'neckar'`, entry `bus`; the bus layer drives off in the opening scene) with a two-euro coin in the inventory; the password comes from Ali in the Picasso, his basement bar (`rooms/picasso.ts`, after the concept art in issue #5), reached past the Epplehaus and a döner stand (`rooms/doener.ts`: it redeems the stamp card; an ambient makes the player remark on the smell when passing the counter); the riddle chain (drink → deposit → jukebox → three ouzos during the refrain) is spelled out in the README, and its real-time part — the song loop with verse/refrain and "Trink!" beats running while the player keeps control — lives in `src/goa/jukebox.ts`. The bridge's left end leads to the edge of the forest (`rooms/waldrand.ts`, art in `art/waldrand.ts`, after the demo's forest): the path is closed for tree felling, the Goa's glow pulses behind the trees (an ambient tweens the `goa` layer's alpha on the beat) and the room's music `wald-wummern` is nothing but a distant bass — so the chapter can only end through Otto R.'s wormhole in the Hölderlinturm. Five red herrings look like a way past the forest barrier and fail on it (`rooms/waldrand.ts`): bolt cutters on the bridge, a pogo stick in the Picasso, a helium balloon at the Epplehaus (a pigeon pops it), the punt's pole at the jetty, a folding spade in the tower cellar. The adventure sets `GameContent.easyMode`: an options switch (normal by default, a per-game preference) that scripts read as `ctx.easyMode` — explicit hints only in easy mode, keep the normal mode's hints subtle. The Picasso's door leads out to the döner stand, then the Epplehaus (`rooms/epplehaus.ts`: Flaschenfloh the bottle collector, and eight pigeon actors that an ambient sends strolling and that scurry from the player), and from there to the Neckarbrücke (`rooms/neckar.ts`, art in `art/neckar.ts`): a Stocherkahn — an actor moved along a Bézier course by an ambient, so its hotspot and speech follow it — passes regularly; the worm-eaten leg of the Picasso's Zocker-Hocker (the rickety bar stool at the slot machines: sit on it and it collapses) sinks it, and a cap floats to the jetty at the Hölderlinturm — reached along the promenade on the quay wall (the walk area runs round the back of the corner house, an occluder layer; the scaling map sizes the player by the wall's waterline there). The tower's door is locked until the password „Put put“ is said in the right voice — Flaschenfloh first has to be fed himself (a full stamp card on the bridge buys a free `doener` at the döner stand; `flohSatt`), then, given the cap filled with the pretzel crumbs from Ali's counter (`muetzekruemel` — crumbs can't be carried by hand), feeds the pigeons calling „put, put, put“ and one of them (`taube3`) parrots it; caught while pecking (`putTaube`, `taubeCaught`), it opens the door at Otto R.'s intercom (`turmOpen`; `ottoTuer` and `taubeTuer` are the voice/pigeon actors on the bridge). Behind it lies the Hölderlinturm (`rooms/hoelderlinturm.ts`, art in `art/turm.ts`, after issue #11): a doll's house seen from the river with its front wall cut away — two floors (`FLOORS`: the Turmstube on the promenade's level, the vaulted cellar at the river's) as walk bands joined by a flight of stairs in one walk-area outline, a side view with constant scale, all on one screen. Otto R.'s Rössler attractor in the Turmstube switches the whole picture between three time layers via the flag `turmEra` (0 house style, 1 a 1987 EGA pixel grid — `PixGrid` draws in room coordinates and run-length-encodes 5 px blocks into SVG rects —, 2 a cartoon collage with feTurbulence photo textures); every layer is a `(state) => markup` SVG layer over one shared plan (`TM`, `FLOORS`), so hotspots fit all three. Otto (a pixel actor in the cellar whose `stance` is a blank `gone` pose outside layer 1) needs the black hole from under the rug upstairs — portable only in the modern layer — put on the PUT PUT cellar wall in 1987; he leaves the `taschenattraktor`. Afterwards the hole peels off the wall again in the modern layer (`wallHoleTaken`); combined with the pocket attractor it becomes the `wurmloch`, whose use takes the player (there and back — the item stays) to the Goa's entrance (`rooms/goaeingang.ts`): there the bouncer — a Goazwerg, a gnome in a felt sauna hat (a scaled-down puppet with extra frame headroom) — wants the password Chakabunga (`goaEntered`), Flaschenfloh is collecting empties, and through the gate the game goes on in the next chapter (`chapterDone`, „FORTSETZUNG FOLGT“ for now). `main.ts` registers one of the two games per page load — `?game=goa|demo`, else the last pick (localStorage), else the adventure — and the title screen's picker (SPIEL · DEMO) switches by reloading with `?game=`.

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
- Saving/loading is refused while a scene runs (`engine.canSaveOrLoadNow`); ambient tweens pass `ctx.tween(..., { skippable: false })` so Esc elsewhere doesn't snap them.
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

The adventure (`src/goa/`) has the same layout, reuses the demo's `toon.ts` toolkit, UI panel art and puppet rig (`characters.ts` exports `humanDraw`, `drawHumanFront`, `drawHumanSide`, `HumanLook` with `head`/`torso` hooks), and adds `strings.ts` (German UI), `music.ts` (procedural tracks via `GameContent.music`) and `startItems`. Its text is German — keep new content for it in German.

Spritesheet actors follow the animation key convention `<textureSet>-<pose>-<variant>` (pose: `idle|walk|talk`; variant: `front|back|side`) — that naming is the entire actor/engine contract.

The README's "Content reference" section is the authoritative, detailed guide to `RoomDef`, hotspots, layers, ambients, regions, multi-character parties, and the full `ScriptContext` API — consult it before adding content, and keep it updated when engine behavior changes (it is the project's user-facing documentation).

## Testing conventions

- Suites drive the real game in Chromium via dev-only debug hooks `window.__engine` and `window.__audio` (exposed in `main.ts` only when `import.meta.env.DEV`) — this is why the runner requires a Vite dev server, not a built bundle.
- The suites drive the **demo**: their default `BASE_URL` (and the one `run-all.mjs` passes) carries `?game=demo`; `verify-goa.mjs` covers the adventure and the game picker, `verify-hoelderlin.mjs` the tower's time layers and riddle. Build URL variants with `new URL(BASE)` + `searchParams`, not string concatenation.
- Each suite is a standalone `.mjs` script that exits non-zero on failure; `tests/run-all.mjs` lists them in `ALL_SUITES` (ordered fast → slow) — **add new suites to that list**.
- Suites read `BASE_URL` and `SHOT_DIR` from the environment; failure screenshots go to `tests/screenshots/` (git-ignored).
- Clicks map game coordinates through the FIT-scaled canvas bounding box (see any suite's `gx`/`gy` helpers).

## Conventions

- TypeScript is `strict` with `noUnusedLocals`; the build is type-check + bundle only (`noEmit`, Vite does the emit).
- Commit messages follow conventional-commit style (`feat:`, `fix:`).
- Right-click is a game input; `main.ts` suppresses the context menu.
- Procedural textures (SVG layers/sprites included — they're rasterized into canvases) are canvas-backed, and some GPU/driver combos corrupt canvas-texture alpha in WebGL — sometimes only in the draw path, undetectable by upload-side probes (opaque black boxes). The game therefore defaults to the Canvas renderer; `?renderer=webgl|auto` opts into WebGL, where `src/engine/renderCompat.ts` reroutes canvas uploads through `ImageData` as a hardening. Keep this in mind when touching texture generation, and keep `tests/verify-renderer.mjs` passing.
