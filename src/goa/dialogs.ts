import type { DialogChoice, DialogDef } from '../engine/types';
import { SONGS, playSong, type SongId } from './jukebox';

/** Ordering at the bar: the free choice of drinks. Shared by talking to Ali
 *  and by handing him the coin. */
function drinkChoices(back: Partial<DialogChoice>): DialogChoice[] {
  return [
    {
      text: 'Eine Red Cow?',
      script: async (ctx) => {
        await ctx.say('ali', 'Aus.');
      },
    },
    {
      text: 'Ein Flying Pony?',
      script: async (ctx) => {
        await ctx.say('ali', 'Auch aus.');
      },
    },
    {
      text: 'Eine Magic Woman?',
      script: async (ctx) => {
        await ctx.say('ali', 'Die haben wir.');
      },
    },
    {
      text: 'Dann eine Magic Woman.',
      end: true,
      script: async (ctx) => {
        await ctx.say('ali', 'Gute Wahl, mein Lieber.');
        await ctx.playerSay('Ich hatte eine Wahl?');
        await ctx.say('ali', 'Du durftest alle drei vorlesen.');
        if (!ctx.hasItem('euro')) {
          await ctx.say('ali', 'Zwei Euro.');
          await ctx.playerSay('Hab ich nicht mehr.');
          return;
        }
        ctx.removeItem('euro');
        ctx.face('ali', 'up');
        await ctx.wait(800);
        ctx.sfx('open');
        ctx.face('ali', 'down');
        ctx.setFlag('boughtDrink');
        ctx.addItem('magicwoman');
        await ctx.playerSay('Meine letzten zwei Euro. Gut angelegt. Hoffentlich.');
      },
    },
    { text: 'Doch nichts.', ...back },
  ];
}

/** What the guests make of each song. Only one of them has the refrain. */
const SONG_REACTIONS: Record<SongId, Array<['ali' | 'cop', string]>> = {
  pfand: [['cop', 'Pfandbetrug ist auch Betrug. Selbst im Schlager.']],
  baggersee: [['ali', 'Barfuß. Im Keller. Mutig.']],
  polonaise: [['cop', 'Polonaise ohne Anmeldung ist eine Versammlung.']],
  gemuetlichkeit: [['ali', 'Oh! Mein Lied.']],
};

function songChoice(id: SongId): DialogChoice {
  return {
    text: `„${SONGS[id].title}“`,
    say: false,
    end: true,
    script: async (ctx) => {
      await playSong(ctx, id);
      for (const [who, line] of SONG_REACTIONS[id]) {
        if (who === 'cop' && ctx.flag('copAsleep')) continue;
        await ctx.say(who, line);
      }
    },
  };
}

export const DIALOGS: Record<string, DialogDef> = {
  ali: {
    id: 'ali',
    start: 'root',
    nodes: {
      root: {
        choices: [
          {
            text: 'Ich suche die Goa im Wald.',
            if: (s) => !s.getFlag('knowsPartykiller') && !s.getFlag('copAsleep'),
            script: async (ctx) => {
              await ctx.say('ali', 'Nicht so laut. Neben dir sitzt der Partykiller.');
              await ctx.playerSay('Ist der nicht im Ruhestand?');
              await ctx.say('ali', 'Er schon. Seine Anzeigen nicht.');
              await ctx.say('cop', 'Ich kann euch übrigens hören.');
              ctx.setFlag('knowsPartykiller');
            },
          },
          {
            text: 'Und die Goa? Nur ganz leise?',
            if: (s) => !!s.getFlag('knowsPartykiller') && !s.getFlag('copAsleep'),
            script: async (ctx) => {
              await ctx.say('ali', 'Nicht, solange er zuhört.');
              await ctx.say('cop', 'Ich höre immer zu. Vierzig Jahre Nachtschicht.');
            },
          },
          {
            text: 'Also. Die Party im Wald?',
            if: (s) => !!s.getFlag('copAsleep') && !s.getFlag('password'),
            script: async (ctx) => {
              await ctx.say('ali', 'Folge dem Bass. Am Eingang sagst du Chakabunga.');
              await ctx.playerSay('Chakabunga.');
              await ctx.say('ali', 'Genau, mein Lieber. Und jetzt weißt du auch, wofür du die Energie brauchst.');
              ctx.setFlag('password', 'Chakabunga');
              ctx.sfx('win');
              ctx.toast('Passwort erhalten: Chakabunga');
            },
          },
          {
            text: 'Wie war das Passwort nochmal?',
            if: (s) => !!s.getFlag('password'),
            script: async (ctx) => {
              await ctx.say('ali', 'Chakabunga. Und jetzt ab in den Wald, mein Lieber.');
            },
          },
          {
            text: 'Was ist das für ein Glas neben dir?',
            once: true,
            script: async (ctx) => {
              await ctx.say('ali', 'Mein Feierabend-Ouzo. Finger weg, mein Lieber.');
              await ctx.say('cop', 'Ich hab ein Auge drauf.');
              if (ctx.easyMode) await ctx.say('ali', 'Außer bei meinem Lied. Da singen wir alle mit. Mit geschlossenen Augen.');
            },
          },
          {
            text: 'Was gibt’s zu trinken?',
            if: (s) => !s.getFlag('boughtDrink'),
            next: 'drinks',
            script: async (ctx) => {
              await ctx.say('ali', 'Steht alles auf der Karte.');
            },
          },
          {
            text: 'Tschüss, Ali.',
            end: true,
            script: async (ctx) => {
              await ctx.say('ali', 'Mach’s gut, mein Lieber.');
            },
          },
        ],
      },
      drinks: { choices: drinkChoices({ next: 'root' }) },
    },
  },

  // The jukebox, once the coin is stuck in it: the credit never runs out.
  jukebox: {
    id: 'jukebox',
    start: 'songs',
    nodes: {
      songs: {
        choices: [
          songChoice('pfand'),
          songChoice('baggersee'),
          songChoice('polonaise'),
          songChoice('gemuetlichkeit'),
          { text: 'Lieber nichts.', say: false, end: true },
        ],
      },
    },
  },

  // Handing Ali the coin goes straight to ordering.
  'ali-order': {
    id: 'ali-order',
    start: 'drinks',
    nodes: {
      drinks: { choices: drinkChoices({ end: true }) },
    },
  },

  cop: {
    id: 'cop',
    start: 'root',
    nodes: {
      root: {
        choices: [
          {
            text: 'Guten Abend.',
            once: true,
            script: async (ctx) => {
              await ctx.say('cop', 'Ob der gut ist, entscheide ich.');
            },
          },
          {
            text: 'Sie sind also der Partykiller?',
            once: true,
            if: (s) => !!s.getFlag('knowsPartykiller'),
            script: async (ctx) => {
              await ctx.say('cop', 'Polizeihauptmeister außer Dienst.');
              await ctx.say('cop', 'Ich hab mehr Partys aufgelöst, als du je besuchen wirst.');
              await ctx.playerSay('Und jetzt?');
              await ctx.say('cop', 'Jetzt sitz ich hier. Und höre zu.');
            },
          },
          {
            text: 'Sie sehen müde aus.',
            script: async (ctx) => {
              await ctx.say('cop', 'Müde? Ich? Ich schlafe nicht. Ich lauere.');
              await ctx.playerSay('Und mal einen trinken?');
              await ctx.say('cop', 'Nie. Außer die Musik verlangt es. Dann muss man. Das ist quasi Vorschrift.');
              if (ctx.easyMode) {
                await ctx.say('cop', 'Drei Stück, und ich tanz auf dem Tresen. Hat man mir erzählt.');
                await ctx.playerSay('...Interessant.');
              }
            },
          },
          {
            text: 'Schönen Abend noch.',
            end: true,
            script: async (ctx) => {
              await ctx.say('cop', 'Ich hab dich im Auge.');
            },
          },
        ],
      },
    },
  },

  // Otto R. on the Hölderlinturm's intercom: he wants the password.
  turmtuer: {
    id: 'turmtuer',
    start: 'root',
    nodes: {
      root: {
        choices: [
          {
            text: 'Wer ist da überhaupt?',
            once: true,
            script: async (ctx) => {
              await ctx.say('ottoTuer', 'Otto R. Chaosforscher. Ich hüte den Turm. Und den Attraktor.');
              await ctx.say('ottoTuer', 'Ich steck in einer anderen Zeitebene fest. Deshalb klinge ich so blechern.');
              await ctx.playerSay('Wie komm ich rein?');
              await ctx.say('ottoTuer', 'Mit der Parole. Und die verrat ich nicht.');
              if (ctx.easyMode) await ctx.say('ottoTuer', 'Steht aber eh an jeder zweiten Wand in Tübingen.');
            },
          },
          {
            text: 'Chakabunga?',
            script: async (ctx) => {
              await ctx.say('ottoTuer', 'Das ist die Parole für den Wald. Hier ist der Turm. Andere Party.');
            },
          },
          {
            text: 'Hölderlin?',
            once: true,
            script: async (ctx) => {
              await ctx.say('ottoTuer', 'Wohnt hier nicht mehr. Schon länger nicht. Seit 1843, um genau zu sein.');
            },
          },
          {
            text: 'Put put?',
            if: (s) => !!s.getFlag('putHeard'),
            script: async (ctx) => {
              await ctx.say('ottoTuer', 'Put put ... Hört sich gut an.');
              await ctx.say('ottoTuer', 'Aber der Klang der Stimme passt irgendwie nicht.');
              await ctx.playerSay('Was stimmt nicht mit meiner Stimme?');
              if (ctx.easyMode) await ctx.say('ottoTuer', 'Zu menschlich. Zu wenig Gurr. Die Parole muss klingen wie das Original.');
              else await ctx.say('ottoTuer', 'Kann ich nicht erklären. Ich weiß es, wenn ich es höre.');
              ctx.setFlag('putTried');
            },
          },
          {
            text: 'Put put. Gurr.',
            if: (s) => !!s.getFlag('putTried'),
            once: true,
            script: async (ctx) => {
              await ctx.say('ottoTuer', 'Nett versucht. Aber das Gurr war geschauspielert. Ich hör das.');
            },
          },
          {
            text: 'Schon gut, ich komm wieder.',
            end: true,
            script: async (ctx) => {
              await ctx.say('ottoTuer', 'Mit der richtigen Parole. In der richtigen Stimme.');
            },
          },
        ],
      },
    },
  },

  // Flaschenfloh, the bottle collector in front of the Epplehaus.
  floh: {
    id: 'floh',
    start: 'root',
    nodes: {
      root: {
        choices: [
          {
            text: 'Wer bist du denn?',
            once: true,
            script: async (ctx) => {
              await ctx.say('floh', 'Flaschenfloh. Ich hüpf von Flasche zu Flasche.');
              await ctx.say('floh', 'Acht Cent Bier, fünfzehn Mehrweg, fünfundzwanzig Einweg. Ich kenn jeden Kurs.');
              await ctx.playerSay('Wie an der Börse.');
              await ctx.say('floh', 'Nur ehrlicher.');
            },
          },
          {
            text: 'Läuft das Geschäft?',
            script: async (ctx) => {
              await ctx.say('floh', 'Vorm Epplehaus? Goldgrube. Nach jedem Konzert dreißig Euro.');
              await ctx.say('floh', 'Nur die Tauben machen mir Konkurrenz. Die picken die Etiketten ab.');
              await ctx.say('floh', 'Ohne Etikett kein Pfand. Die wissen das. Die machen das mit Absicht.');
            },
          },
          {
            text: 'Du und die Tauben, ihr seid Freunde?',
            once: true,
            script: async (ctx) => {
              await ctx.say('floh', 'Freunde? Kollegen. Ich füttere sie, sie lassen meine Flaschen in Ruhe. Meistens.');
              await ctx.say('floh', 'Aber heute hab ich nix für sie.');
              if (ctx.easyMode) {
                await ctx.say('floh', 'Brezelkrümel wären schön. Ali hat immer welche auf dem Tresen.');
                await ctx.say('floh', 'Nur: Krümel trägt man nicht in der Hand. Da brauchst du was zum Reinfüllen.');
              }
            },
          },
          {
            text: 'Wie geht’s dir so?',
            if: (s) => !s.getFlag('flohSatt'),
            script: async (ctx) => {
              await ctx.say('floh', 'Hungrig. Pfand macht nicht satt. Man kann es nur gegen Essen tauschen. Wenn genug zusammenkommt.');
              if (ctx.easyMode) await ctx.say('floh', 'Ein Döner vom Neckar-Kebap, das wär’s. Aber der kostet mehr als hundert Flaschen.');
            },
          },
          {
            text: 'Kennst du die Goa im Wald?',
            if: (s) => !s.getFlag('flohFollows'),
            script: async (ctx) => {
              await ctx.say('floh', 'Die Goa! Nach so einer Nacht liegt da Pfand für drei Monatsmieten.');
              await ctx.say('floh', 'Aber wo die steigt, sagt mir keiner. Die wollen ihre Flaschen angeblich selber wegbringen.');
              if (ctx.flag('password')) {
                await ctx.playerSay('Ich weiß, wo sie ist. Aber ich darf’s nicht sagen. Passwort und so.');
                await ctx.say('floh', 'Musst du auch nicht. Ich lauf dir einfach nach. Ganz unauffällig.');
                await ctx.say('floh', 'Klirr.');
                ctx.setFlag('flohFollows');
              } else {
                await ctx.playerSay('Mir sagt’s auch keiner. Noch nicht.');
                await ctx.say('floh', 'Frag Ali im Picasso. Der weiß alles.');
                if (ctx.easyMode) await ctx.say('floh', 'Der sagt nur nichts, solange der Partykiller zuhört.');
              }
            },
          },
          {
            text: 'Und du läufst mir wirklich nach?',
            if: (s) => !!s.getFlag('flohFollows'),
            script: async (ctx) => {
              await ctx.say('floh', 'Mit zwanzig Metern Abstand. Du wirst mich gar nicht bemerken.');
              await ctx.say('floh', 'Klirr, klirr.');
            },
          },
          {
            text: 'Was ist mit den Burschen auf dem Stocherkahn?',
            if: (s) => !!s.getFlag('once:neckarIntro'),
            once: true,
            script: async (ctx) => {
              await ctx.say('floh', 'Die? Trinken aus Krügen. Kein Pfand. Kulturlos.');
              if (ctx.easyMode) {
                await ctx.say('floh', 'Und der Kahn ist so morsch, den halten nur noch die Holzwürmer zusammen. Händchen haltend.');
                await ctx.playerSay('Holzwürmer, sagst du.');
              }
            },
          },
          {
            text: 'Mach’s gut, Flaschenfloh.',
            end: true,
            script: async (ctx) => {
              await ctx.say('floh', 'Und denk dran: Pfand gehört daneben!');
            },
          },
        ],
      },
    },
  },
  // Otto R., chaos researcher, stuck in the pixel layer of the Hölderlinturm.
  otto: {
    id: 'otto',
    start: 'root',
    nodes: {
      root: {
        choices: [
          {
            text: 'Wer bist du?',
            once: true,
            script: async (ctx) => {
              await ctx.say('otto', 'Otto R., Chaosforscher. Der Attraktor da ist von mir. Rössler-System, drei Gleichungen, unendlich viel Ärger.');
              await ctx.say('otto', 'Hölderlin hatte nichts dagegen. Der wohnt ja nicht mehr hier.');
              await ctx.playerSay('Und warum bist du so ... pixelig?');
              await ctx.say('otto', 'Das bin nicht ich, das ist die Epoche. 1987: sechzehn Farben, 320 mal 200 Bildpunkte.');
              await ctx.say('otto', 'Du dagegen bist unverschämt hochauflösend. Das ist in dieser Ebene fast schon unhöflich.');
            },
          },
          {
            text: 'Warum gehst du nicht einfach raus?',
            script: async (ctx) => {
              ctx.setFlag('ottoExplained');
              await ctx.say('otto', 'Weil ich auf einem seltsamen Attraktor sitze! Egal, wie oft ich drehe: Mein Orbit kommt immer wieder in 1987 vorbei.');
              await ctx.say('otto', 'Und die Tür ist in meiner Ebene nur gemalt. Begehbare Türen waren damals Speicherluxus.');
              await ctx.say('otto', 'Ich bräuchte ein Loch. Ein richtiges. In der Wand, da wo ich PUT PUT hingeschrieben hab.');
            },
          },
          {
            text: 'Was heißt PUT PUT?',
            once: true,
            script: async (ctx) => {
              await ctx.say('otto', 'Mein Merkzettel! Im Parser-Dialekt. Damals hat man Adventures noch getippt: PUT irgendwas, PUT hierhin.');
              await ctx.say('otto', 'Ich wusste nur nie, WAS ich da hinlegen soll. Vergesslich, wir Genies.');
            },
          },
          {
            text: 'Wo krieg ich ein Loch her?',
            if: (s) => !!s.getFlag('ottoExplained') && !s.getFlag('holeTaken'),
            script: async (ctx) => {
              if (!ctx.easyMode) {
                await ctx.say('otto', 'Irgendwo hier im Haus liegt eins. Ein kleines schwarzes Loch. Ich hab’s versteckt, als es noch ganz jung war.');
                await ctx.say('otto', 'Wo genau? Vergessen. Vergesslich, wir Genies.');
                return;
              }
              await ctx.say('otto', 'Oben in der Turmstube, unterm Teppich, liegt eins. Ein kleines schwarzes Loch, ich hab’s da versteckt, als es noch ganz jung war.');
              await ctx.say('otto', 'Hier in 1987 ist es Teil vom Boden, das kriegst du nicht hoch.');
              await ctx.say('otto', 'Aber in der modernen Ebene ... da gelten Zeichentrick-Gesetze. Da sind Löcher tragbar.');
            },
          },
          {
            text: 'Ich hab das Loch!',
            if: (s) => !!s.getFlag('holeTaken') && !s.getFlag('wallHole'),
            script: async (ctx) => {
              await ctx.say('otto', 'Wunderbar! Dann PUT es an die Wand. PUT PUT! Da, wo der Pfeil hinzeigt!');
            },
          },
          {
            text: 'Kennst du die Goa im Wald?',
            once: true,
            script: async (ctx) => {
              await ctx.say('otto', 'Natürlich. Was ist Goa anderes als ein sehr ordentlich getaktetes Chaos?');
              await ctx.say('otto', 'Hundertvierzig Schläge pro Minute, und keine Tanzbewegung kommt zweimal gleich. Ein Attraktor mit Bass.');
            },
          },
          {
            text: 'Bis später, Otto.',
            end: true,
            script: async (ctx) => {
              await ctx.say('otto', 'Ich lauf nicht weg. Kann ich ja nicht.');
            },
          },
        ],
      },
    },
  },
};
