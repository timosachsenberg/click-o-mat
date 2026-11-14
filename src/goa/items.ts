import { throwWormhole } from './rooms/waldrand';
import type { ScriptContext } from '../engine/ScriptContext';
import type { ItemDef } from '../engine/types';

export const ITEMS: Record<string, ItemDef> = {
  euro: {
    id: 'euro',
    name: 'Zwei-Euro-Münze',
    icon: 'icon-euro',
    lookAt: async (ctx) => {
      await ctx.playerSay('Zwei Euro. Mein gesamtes Vermögen.');
      await ctx.playerSay('Genug für eine Nacht im Wald. Hoffe ich.');
    },
  },
  magicwoman: {
    id: 'magicwoman',
    name: 'Magic Woman',
    icon: 'icon-magicwoman',
    lookAt: async (ctx) => {
      await ctx.playerSay('Eine Dose Magic Woman. Energydrink, Geschmacksrichtung „Lila“.');
      await ctx.playerSay('Kleingedruckt: „Nicht geeignet für Kinder, Schwangere und Beamte.“');
    },
    // Drink it: "Benutze Magic Woman".
    use: async (ctx) => {
      ctx.removeItem('magicwoman');
      ctx.sfx('open');
      await ctx.playerSay('*Gluck, gluck, gluck.*');
      ctx.addItem('dose', { silent: true });
      await ctx.playerSay('Woah. Ich kann Farben hören.');
      await ctx.playerSay('Und den Bass. Ganz weit weg. Im Wald.');
    },
  },
  dose: {
    id: 'dose',
    name: 'leere Dose',
    icon: 'icon-dose',
    lookAt: 'Leer. Aber nicht wertlos: Da ist Pfand drauf.',
    use: 'Die ist leer. Die Energie ist jetzt in mir.',
  },
  cent25: {
    id: 'cent25',
    name: '25-Cent-Stück',
    icon: 'icon-cent25',
    lookAt: async (ctx) => {
      await ctx.playerSay('Ein 25-Cent-Stück. Das Pfand für die Dose.');
      await ctx.playerSay('Ich wusste gar nicht, dass es die gibt.');
    },
  },
  ouzo: {
    id: 'ouzo',
    name: 'Alis Ouzo',
    icon: 'icon-ouzo',
    lookAt: 'Alis Feierabend-Ouzo. Schnell weg damit, bevor der Refrain vorbei ist.',
    use: 'Anis? Nein danke. Der ist für jemand anderen.',
  },
  stuhlbein: {
    id: 'stuhlbein',
    name: 'wurmstichiges Stuhlbein',
    icon: 'icon-stuhlbein',
    lookAt: async (ctx) => {
      await ctx.playerSay('Ein Stuhlbein, löchrig wie ein Emmentaler. Drinnen knuspert es.');
      await ctx.playerSay('Holzwürmer. Und so wie die mampfen, haben sie seit Wochen nichts Frisches gehabt.');
    },
    use: (ctx) => ctx.playerSay(ctx.easyMode ? 'Ich bin doch kein Holzwurm. Die Würmer brauchen was Größeres.' : 'Ich bin doch kein Holzwurm.'),
  },
  muetze: {
    id: 'muetze',
    name: 'Burschenschaftsmütze',
    icon: 'icon-muetze',
    lookAt: async (ctx) => {
      await ctx.playerSay('Eine Couleurmütze, grün-weiß-rot. Noch ein bisschen nass.');
      await ctx.playerSay('Innen eingestickt: „Eigentum der Verbindung. Finder bitte Bier zurückbringen.“');
    },
    use: (ctx) => ctx.playerSay(ctx.easyMode ? 'Aufsetzen? Über meine Mütze? Nee. Aber als Beutel taugt sie bestimmt.' : 'Aufsetzen? Über meine Mütze? Nee.'),
  },
  loch: {
    id: 'loch',
    name: 'tragbares Loch',
    icon: 'icon-loch',
    lookAt: async (ctx) => {
      await ctx.playerSay('Ein tragbares schwarzes Loch. Dünn wie ein Pfannkuchen, tief wie das Weltall.');
      await ctx.playerSay('In der Zeichentrick-Ebene gelten offenbar Trickfilm-Gesetze. Ich frag lieber nicht, wie.');
    },
    use: 'Auf den Boden legen und reinspringen? Nein. Ich weiß nicht, wo das rauskommt.',
    // A black hole plus a strange attractor: a wormhole that knows where the chaos is.
    combine: { taschenattraktor: makeWormhole },
  },
  taschenattraktor: {
    id: 'taschenattraktor',
    name: 'Taschen-Attraktor',
    icon: 'icon-taschenattraktor',
    lookAt: async (ctx) => {
      await ctx.playerSay('Otto R.s Taschen-Attraktor. Eine Rössler-Spirale zum Mitnehmen.');
      await ctx.playerSay('Sie summt leise. Und zwar im Takt von einem Bass, ganz weit weg.');
    },
    use: async (ctx) => {
      await ctx.playerSay('Ich dreh an der Spirale ...');
      ctx.sfx('zap');
      await ctx.playerSay('Nichts. Die Spirale dreht sich, aber ins Leere.');
      if (ctx.easyMode) await ctx.playerSay('Ihr fehlt was Dunkles, Rundes, um das sie kreisen kann.');
    },
  },
  muetzekruemel: {
    id: 'muetzekruemel',
    name: 'Mütze voller Brezelkrümel',
    icon: 'icon-muetzekruemel',
    lookAt: async (ctx) => {
      await ctx.playerSay('Die Burschenschaftsmütze, randvoll mit Brezelkrümeln. Hart wie Granit, salzig wie das Meer.');
      await ctx.playerSay('Für Menschen ungeeignet. Für Tauben ein Festmahl.');
    },
    use: 'Aufsetzen? Dann rieseln mir die Krümel in den Kragen. Nein danke.',
  },
  taube: {
    id: 'taube',
    name: 'Put-Put-Taube',
    icon: 'icon-taube',
    lookAt: async (ctx) => {
      await ctx.playerSay('Die Taube, die alles nachplappert. Sie sitzt erstaunlich zufrieden in meiner Hand.');
      await ctx.playerSay('Ab und zu sagt sie „Put put“. Mit perfekter Betonung.');
    },
    use: async (ctx) => {
      await ctx.playerSay('Na, sag mal was.');
      await ctx.playerSay('*Taube:* „Put put.“');
      await ctx.playerSay('Genau so. Das muss nur noch jemand hören, der Wert drauf legt.');
    },
  },
  stempelkarte: {
    id: 'stempelkarte',
    name: 'volle Stempelkarte',
    icon: 'icon-stempelkarte',
    lookAt: async (ctx) => {
      await ctx.playerSay('Eine Stempelkarte vom Neckar-Kebap. Zehn Felder, zehn Stempel. Voll!');
      await ctx.playerSay('„Bei vollen Stempeln: ein Döner gratis.“ Irgendwer hat die verloren. Der Arme. Ich Glücklicher.');
    },
  },
  doener: {
    id: 'doener',
    name: 'Döner mit alles',
    icon: 'icon-doener',
    lookAt: 'Ein Döner mit alles. Warm, schwer, die Soße tropft schon. Er riecht nach Glück.',
    use: async (ctx) => {
      await ctx.playerSay('Ich könnte ... nein.');
      await ctx.playerSay(ctx.easyMode ? 'Flaschenfloh sah aus, als hätte er seit gestern nichts gegessen. Der braucht ihn dringender.' : 'Irgendwer braucht den dringender als ich.');
    },
  },
  // ---- red herrings: both look like a way past the forest barrier
  pogostick: {
    id: 'pogostick',
    name: 'Pogo-Stick',
    icon: 'icon-pogostick',
    lookAt: 'Ein Pogo-Stick aus den Neunzigern. Die Feder ist noch voll gespannt. Wie ich, eigentlich.',
    use: (ctx) => ctx.playerSay(ctx.state.currentRoom === 'picasso' ? 'Hier drin? Ich würde mir den Kopf an der Decke stoßen. Oder an Ali.' : 'Einfach so loshüpfen? Ich heb mir die Sprungkraft für was Hohes auf.'),
  },
  ballon: {
    id: 'ballon',
    name: 'Heliumballon',
    icon: 'icon-ballon',
    lookAt: 'Ein pinker Herzballon mit Helium. Er zieht ganz schön an der Schnur. Ob der mich trägt?',
    use: 'Helium einatmen und mit Micky-Maus-Stimme reden? Später. Der Ballon hat Größeres vor.',
  },
  wurmloch: {
    id: 'wurmloch',
    name: 'Wurmloch-Paar',
    icon: 'icon-wurmloch',
    lookAt: async (ctx) => {
      await ctx.playerSay('Der Taschen-Attraktor hat das Loch in zwei Hälften gedreht. Zwei Enden, ein Tunnel: ein Wurmloch-Paar.');
      await ctx.playerSay('Was ins eine reinfällt, kommt beim anderen raus. Ich müsste nur ein Ende dahin kriegen, wo ich hinwill.');
    },
    use: useWormhole,
  },
};

/** Black hole + Otto's pocket attractor = a wormhole to where the chaos is. */
export async function makeWormhole(ctx: ScriptContext): Promise<void> {
  ctx.removeItem('loch');
  ctx.removeItem('taschenattraktor');
  ctx.sfx('zap');
  ctx.flash(0xb06aff, 260);
  ctx.addItem('wurmloch', { silent: true });
  await ctx.playerSay('Ich leg den Taschen-Attraktor aufs Loch ...');
  await ctx.playerSay('Die Spirale fängt an zu kreisen, schneller und schneller, und das Loch kreist mit.');
  await ctx.playerSay('Und dann teilt es sich. Zwei Löcher, ein Tunnel dazwischen. Ein Wurmloch-Paar! Und es wummert. Im Takt.');
}

/** The wormhole pair is used at the edge of the forest: one end over the
 *  barrier, the other stays. Anywhere else there's nowhere to throw it. */
async function useWormhole(ctx: ScriptContext): Promise<void> {
  if (ctx.state.currentRoom === 'waldrand') {
    await throwWormhole(ctx);
    return;
  }
  await ctx.playerSay('Zwei Enden. Eins hier, eins da, wo ich hinwill. Nur: Von hier aus kann ich die Goa nicht mal sehen.');
  await ctx.playerSay(ctx.easyMode ? 'Am Waldrand, an der Absperrung: Da könnte ich ein Ende einfach rüberwerfen.' : 'Ich müsste näher ran. So nah, dass ich ein Ende rüberwerfen kann.');
}
