/** Helper for procedural placeholder art: draw into a Phaser canvas texture. */
export function makeCanvasTex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D) => void
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`Could not create canvas texture ${key}`);
  const g = tex.getContext();
  g.clearRect(0, 0, w, h);
  draw(g);
  tex.refresh();
}

/** Redraw an existing canvas texture in place (used by ctx.repaint()). */
export function redrawCanvasTex(
  scene: Phaser.Scene,
  key: string,
  draw: (g: CanvasRenderingContext2D) => void
): void {
  const tex = scene.textures.get(key) as Phaser.Textures.CanvasTexture;
  const g = tex.getContext();
  g.clearRect(0, 0, tex.width, tex.height);
  draw(g);
  tex.refresh();
}
