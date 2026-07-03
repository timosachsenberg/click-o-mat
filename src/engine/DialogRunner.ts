import type { Engine } from './Engine';
import type { DialogChoice, DialogDef, DialogNode } from './types';

/**
 * Runs a dialog tree: repeatedly shows the current node's available choices
 * in the UI, echoes the picked line, runs its script, and follows `next`
 * until a choice ends the conversation or a node runs out of choices.
 */
export async function runDialog(eng: Engine, def: DialogDef): Promise<void> {
  eng.dialogMode = true;
  eng.uiScene.setDialogMode(true);
  const ctx = eng.makeContext();
  try {
    let nodeId: string | undefined = def.start;
    while (nodeId) {
      const node: DialogNode | undefined = def.nodes[nodeId];
      if (!node) break;
      const currentNode = nodeId;
      const available: Array<{ choice: DialogChoice; key: string }> = node.choices
        .map((choice, i) => ({ choice, key: `${def.id}:${currentNode}:${i}` }))
        .filter((e) => !(e.choice.once && eng.state.usedChoices.includes(e.key)))
        .filter((e) => !e.choice.if || e.choice.if(eng.state));
      if (available.length === 0) break;

      const picked = await eng.uiScene.presentChoices(available.map((e) => e.choice.text));
      if (picked < 0 || picked >= available.length) break;
      const entry = available[picked];

      if (entry.choice.once) eng.state.usedChoices.push(entry.key);
      if (entry.choice.say !== false) await ctx.playerSay(entry.choice.text);
      if (entry.choice.script) await entry.choice.script(ctx);
      if (entry.choice.end) break;
      nodeId = entry.choice.next ?? nodeId;
    }
  } finally {
    eng.dialogMode = false;
    eng.uiScene.setDialogMode(false);
  }
}
