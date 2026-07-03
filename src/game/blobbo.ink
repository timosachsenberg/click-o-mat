// Blobbo's conversation, authored in ink (https://www.inklestudios.com/ink/).
// Lines prefixed BLOBBO:/NORB: are routed to those actors by the engine.
// VARs below are synced from game state before each conversation starts.

VAR has_hamster = false
VAR is_glowing = false
VAR friend = false

EXTERNAL sfx(name)

== chat ==
{ chat == 1:
    BLOBBO: Bloop! A visitor! Welcome to my gallery.
- else:
    BLOBBO: Bloop. Back again. The art missed you. Probably.
}
- (root)
* [Tell me about the paintings.]
    BLOBBO: Ah! A patron of taste. Which piece calls to you?
    * * [The landscape.]
        BLOBBO: "Sunset Over Hills". It speaks to me. It says: "hills".
        NORB: Deep.
    * * [The one with the squares.]
        BLOBBO: "Nine Squares". Very controversial. Three critics wept.
        NORB: Over the squares?
        BLOBBO: Over the frame. It's walnut.
    * * [The night scene.]
        BLOBBO: "Moon, Considering". My favorite. The moon never blinks first.
    - - BLOBBO: Bloop. Art talk invigorates me.
    -> root
* {has_hamster and not is_glowing} [I have a hamster. Want to see?]
    BLOBBO: Oooh. Warm AND fuzzy. The classics.
    NORB: Everyone around here is a hamster person.
    -> root
* {is_glowing} [Behold: a GLOWING hamster.]
    ~ sfx("zap")
    BLOBBO: BLOOP! Radiant! Luminous! An installation piece!
    BLOBBO: You are an artist yourself. We are colleagues now.
    ~ friend = true
    -> root
* [Why do you say "bloop"?]
    BLOBBO: Why do YOU say "why"?
    NORB: ...Fair enough.
    -> root
+ {friend} [Goodbye, colleague.]
    BLOBBO: Farewell, co-curator! Bloop!
    -> END
+ {not friend} [I should go.]
    BLOBBO: The gift shop is imaginary. Bloop!
    -> END
