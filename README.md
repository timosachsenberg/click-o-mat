# Point-and-Click Adventure Engine (Phaser 4)

A SCUMM-style point-and-click adventure engine — everything you need to build
something in the spirit of *Day of the Tentacle*. Written in TypeScript on
[Phaser 4](https://phaser.io/), with a small data-driven content layer so you
describe rooms, items, and dialog as plain objects rather than wiring up scenes
by hand.

The repo ships with a short, fully playable demo ("Ned the Tentacle") that
exercises every feature.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle into dist/
```

All character art, icons, and sound in the demo are generated procedurally at
runtime, so there are **no binary assets** — the whole thing is code. Replace
`BootScene` with a real asset loader when you have art.

## Feature checklist

| Feature | Where |
| --- | --- |
| Nine-verb interface (Give, Pick up, Use, Open, Look at, Push, Close, Talk to, Pull) | `engine/verbs.ts`, `engine/UIScene.ts` |
| Sentence line ("Use battery with Zap-O-Matic") | `engine/UIScene.ts` |
| Left-click walk / right-click default verb | `engine/RoomScene.ts` |
| Walkable-area pathfinding around obstacles (visibility graph + Dijkstra) | `engine/Pathfinder.ts` |
| Directional walk / idle / talk character animations | `engine/Actor.ts`, `engine/BootScene.ts` |
| Perspective scaling (actors shrink toward the back wall) | `engine/Actor.ts` |
| Walk-behind props (depth sorting around furniture) | `engine/RoomScene.ts` |
| Inventory with paging + item icons | `engine/UIScene.ts` |
| Use-item-on-hotspot and item-on-item combinations | `engine/RoomScene.ts`, `engine/UIScene.ts` |
| Branching dialog trees (conditions, one-shot choices, jumps) | `engine/DialogRunner.ts` |
| Async scripting API (walk, say, wait, flags, cutscenes) | `engine/ScriptContext.ts` |
| Flags / world state driving conditional art and hotspots | `engine/GameState.ts` |
| Room transitions with fade + named entry points | `engine/RoomScene.ts` |
| Save / load (localStorage) — `F5` / `F9` | `engine/Engine.ts` |
| Camera flash / shake, title cards, bleep SFX | `engine/ScriptContext.ts`, `engine/Sfx.ts` |
| Debug overlay (walk area, holes, hotspots) — press `D` | `engine/RoomScene.ts` |

## Controls

- **Left-click floor** — walk there.
- **Left-click a verb, then a hotspot** — perform that verb.
- **Right-click a hotspot** — its default verb (look/open/talk, as configured).
- **Click an inventory item** — arm it for "Use … with"; click another item to combine.
- **During dialog** — click a line to choose it; click anywhere to skip speech.
- **`F5` / `F9`** — save / load. **`D`** — toggle the debug overlay.

## Architecture

Three Phaser scenes run together:

- **`BootScene`** generates all textures + animations, then starts the game.
- **`RoomScene`** owns the current room: background, walk-behinds, actors,
  hotspot hit-testing, and the verb-interaction state machine.
- **`UIScene`** is a persistent overlay: sentence line, verb grid, inventory,
  and dialog choices.

The **`Engine`** singleton (`engine`) ties them together and holds the live
`GameState` (flags, inventory, location). Game logic never touches Phaser
directly — it runs through **`ScriptContext`**, an `async`/`await` API:

```ts
async open(ctx) {
  if (ctx.flag('cabinetOpen')) return ctx.playerSay("It's already open.");
  await ctx.walkTo('norb', 665, 332);
  ctx.sfx('deny');
  await ctx.playerSay('Locked. Naturally.');
}
```

## Authoring content

All game content lives under `src/game/` and is registered in
`src/game/index.ts`. Nothing in `src/engine/` needs to change to build a new
game.

### A room (`src/game/rooms/*.ts`)

```ts
export const myRoom: RoomDef = {
  id: 'kitchen',
  paint: (g, state) => { /* draw background into a canvas ctx */ },
  walkArea: [ {x,y}, ... ],            // floor polygon (can be a fn of state)
  holes: [ [ {x,y}, ... ] ],           // obstacles carved out of the floor
  scaling: { yTop, scaleTop, yBottom, scaleBottom },
  walkBehinds: [ /* props actors can pass behind */ ],
  entries: { start: { x, y, facing } },// named spawn points
  hotspots: [ /* see below */ ],
  onEnter: async (ctx) => { /* optional cutscene */ },
};
```

`paint`, `walkArea`, and `holes` all receive the current `GameState`, so a room
redraws and re-computes its geometry from state whenever you call
`ctx.repaint()` — that's how the cabinet opens and the plant slides aside.

### A hotspot

```ts
{
  id: 'cabinet',
  name: 'wall cabinet',                // shown in the sentence line
  rect: { x, y, w, h },                // or polygon: [{x,y}, ...]
  walkTo: { x, y }, facing: 'up',      // where the player stands to interact
  defaultVerb: 'open',                 // used on right-click
  visible: (state) => !state.getFlag('hidden'),
  on: {
    lookat: 'A sturdy little cabinet.',        // string = player one-liner
    open: async (ctx) => { /* full script */ },
  },
  onItem: {
    use: { key: async (ctx) => { ... } },      // "Use key with cabinet"
    give: { coin: 'It has no pockets.' },
  },
}
```

Any handler is either a **string** (spoken by the player) or an **async
function** receiving the `ScriptContext`. Missing verbs fall back to sensible
default responses (`engine/verbs.ts`).

### Items, actors, dialogs

- **Items** (`items.ts`): id, name, icon texture, `lookAt`, and `combine` map
  for item-on-item.
- **Actors** (`actors.ts`): id, name, speech color, texture set, speed.
- **Dialogs** (`dialogs.ts`): nodes of choices, each with optional `if`
  condition, `once` flag, `script`, and `next`/`end` to control flow.

## The demo puzzle

Bring Ned the Tentacle something *warm, fuzzy, and radioactive*:

1. Take the **battery** off the lab table.
2. Go to the hallway; **push** the ficus aside to uncover a **key**.
3. Back in the lab, **use the key** on the cabinet to free a **hamster**.
4. **Use the battery** on the Zap-O-Matic to power it, then **use the hamster**
   on it to irradiate him into a *glowing hamster*.
5. **Give the glowing hamster** to Ned. Roll credits.

## Notes on scaling this up

- **Real assets:** swap `BootScene` for `scene.load.spritesheet(...)` /
  `load.image(...)` and delete the procedural drawing. The `Actor` animation
  keys (`<set>-<pose>-<variant>`) are the only contract to keep.
- **More save slots:** `Engine.save/load` take no slot argument today; add a
  slot id and key by it.
- **Larger rooms / scrolling:** the camera is currently fixed to one screen;
  set world bounds and `camera.startFollow(player.sprite)` in `RoomScene`.
