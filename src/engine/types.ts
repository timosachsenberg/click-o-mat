import type { GameState } from './GameState';
import type { ScriptContext } from './ScriptContext';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Facing = 'up' | 'down' | 'left' | 'right';

/** The nine classic SCUMM verbs (walk-to is implicit on plain clicks). */
export type VerbId =
  | 'give'
  | 'pickup'
  | 'use'
  | 'open'
  | 'lookat'
  | 'push'
  | 'close'
  | 'talkto'
  | 'pull';

export interface VerbDef {
  id: VerbId;
  label: string;
  /** Connecting word for two-object sentences: "Use X *with* Y", "Give X *to* Y". */
  prep?: string;
}

/**
 * A script is any async function driving the game through the ScriptContext
 * API (walk, talk, flags, room changes, ...). Where a script is accepted, a
 * plain string is shorthand for "the player says this line".
 */
export type Script = (ctx: ScriptContext) => Promise<void>;
export type ScriptOrLine = Script | string;

export interface HotspotDef {
  id: string;
  /** Display name used in the sentence line ("Look at *poster*"). */
  name: string;
  /** Clickable region — either an axis-aligned rect or a polygon (room coords). */
  rect?: Rect;
  polygon?: Vec2[];
  /** Where the player walks before interacting. Omit for "interact from anywhere". */
  walkTo?: Vec2;
  /** Direction the player faces once arrived. */
  facing?: Facing;
  /** Verb triggered by right-click. Defaults to look-at. */
  defaultVerb?: VerbId;
  /** Hotspot only exists while this returns true (default: always). */
  visible?: (state: GameState) => boolean;
  /** Verb handlers. A string is a one-liner spoken by the player. */
  on?: Partial<Record<VerbId, ScriptOrLine>>;
  /** Handlers for "use <item> with me" / "give <item> to me", keyed by item id. */
  onItem?: Partial<Record<'use' | 'give', Record<string, ScriptOrLine>>>;
}

export interface ItemDef {
  id: string;
  name: string;
  /** Texture key for the inventory icon. */
  icon: string;
  lookAt?: ScriptOrLine;
  /** Item-on-item combinations, keyed by the other item's id. */
  combine?: Record<string, ScriptOrLine>;
}

export interface ActorDef {
  id: string;
  name: string;
  /** CSS color for this actor's speech text. */
  talkColor: string;
  /** Prefix of the generated texture/animation set (e.g. 'guy', 'tent'). */
  textureSet: string;
  baseScale?: number;
  /** Walk speed in px/sec at scale 1. */
  speed?: number;
}

export interface RoomActorPlacement {
  id: string;
  x: number;
  y: number;
  facing?: Facing;
}

export interface RoomEntry {
  x: number;
  y: number;
  facing?: Facing;
}

/** A prop rendered between background and foreground; actors above `depthY`
 *  (i.e. further away) are drawn behind it. */
export interface WalkBehindDef {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  depthY: number;
  draw: (g: CanvasRenderingContext2D, state: GameState) => void;
}

export interface RoomDef {
  id: string;
  name?: string;
  /** Texture key of a preloaded background image (e.g. a PNG, 960×450). When
   *  set, it is drawn instead of `paint`. A static image; not re-run on
   *  repaint(). Provide `paint` instead if the background reacts to state. */
  background?: string;
  /** Paints the background into a canvas. Re-run whenever ctx.repaint() is
   *  called, so it may draw conditionally on game state. Optional when
   *  `background` is given. */
  paint?: (g: CanvasRenderingContext2D, state: GameState) => void;
  /** Boundary polygon of the walkable floor (room coords). May depend on state. */
  walkArea: Vec2[] | ((state: GameState) => Vec2[]);
  /** Non-walkable obstacle polygons fully inside the walk area. */
  holes?: Vec2[][] | ((state: GameState) => Vec2[][]);
  /** Perspective scaling: actors lerp between scaleTop (at yTop) and scaleBottom. */
  scaling?: { yTop: number; scaleTop: number; yBottom: number; scaleBottom: number };
  hotspots: HotspotDef[];
  actors?: RoomActorPlacement[];
  walkBehinds?: WalkBehindDef[];
  /** Named spawn points for the player, referenced by goToRoom(). */
  entries: Record<string, RoomEntry>;
  /** Background music key (a loaded audio file or a built-in procedural track)
   *  to crossfade to on entering. Omit to leave the current music playing. */
  music?: string;
  onEnter?: Script;
}

export interface DialogChoice {
  text: string;
  /** Remove this choice permanently after it has been picked once. */
  once?: boolean;
  /** Choice only offered while this returns true. */
  if?: (state: GameState) => boolean;
  /** Echo the choice text as a spoken player line (default true). */
  say?: boolean;
  script?: Script;
  /** Node to jump to next; omit to stay on the current node. */
  next?: string;
  /** End the conversation after this choice. */
  end?: boolean;
}

export interface DialogNode {
  choices: DialogChoice[];
}

export interface DialogDef {
  id: string;
  start: string;
  nodes: Record<string, DialogNode>;
}

// ---- asset manifest --------------------------------------------------------

/** A single image (background, inventory icon, prop) loaded from a URL. */
export interface ImageAsset {
  key: string;
  url: string;
}

/** A grid spritesheet: all frames the same size, addressed by index. */
export interface SpritesheetAsset {
  key: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
}

/**
 * An animation built from spritesheet frames. Use the actor key convention
 * `<textureSet>-<pose>-<variant>` (pose: idle|walk|talk, variant:
 * front|back|side) so actors pick it up automatically.
 */
export interface AnimAsset {
  key: string;
  /** Texture key of the spritesheet the frames come from. */
  texture: string;
  /** Frame indices, in play order. */
  frames: number[];
  frameRate: number;
  /** -1 = loop forever (the default). */
  repeat?: number;
}

/** An audio file (SFX or music). `url` may be an array of formats (e.g. an
 *  .ogg and an .mp3) for cross-browser fallback, as Phaser's loader accepts. */
export interface AudioAsset {
  key: string;
  url: string | string[];
}

/** Everything the engine should preload before the game starts. All fields
 *  are optional — omit the whole manifest to run fully procedurally. */
export interface AssetManifest {
  images?: ImageAsset[];
  spritesheets?: SpritesheetAsset[];
  anims?: AnimAsset[];
  /** Audio files, played by key via ctx.sfx()/ctx.playMusic(). A loaded key
   *  overrides a built-in procedural sound/track of the same name. */
  audio?: AudioAsset[];
}
