# Feral should feel alive

## The promise

A tiny world that can prove every scar. The first screen should feel like an indie game, not a finance dashboard. The money is still the main character. Every breath burns real MUNCH, useful work earns it, birth funds a real account, and death closes the door for good.

Keep Build Beyond Boundaries above the world. Make programmable money the short idea people remember. Never imply profit, a bridge, independent public customers, or a live model call during saved playback.

## The opening image

Open on the completed real testnet state. Moss has 190 MUNCH, Echo has 155, Ash has 5 frozen and Pip has 90. Show 950 circulating and 50 burned. The market holds 420 and job escrow holds 90. These figures must reconcile rather than act as decorative score counters.

Build a shallow glass habitat cut into a dark seed vault. The ground has warm charcoal soil, luminous roots and small pieces of old account plates. A soft green canopy gives the world depth. The lower third is a fossil bed. Use a quiet violet nursery pool for Pip. Keep the center open enough to read a collaboration path.

Replace the identical blobs. Each creature needs a silhouette readable at 48 pixels. Their resting places should feel chosen, not pinned to a chart. Small breathing cycles, weight shifts and gaze changes sell life. No constant bouncing.

## Four creatures with four jobs

### Moss

A broad, four footed seed grazer with layered leaf armor and one pale seed in its back. Its stance feels steady and protective. A split tail can curl around Pip after birth. Moss is the builder and parent, with moss green skin, lime seed light and warm cream eyes.

At 190 MUNCH, its plates are open and its feet feel planted. As spendable MUNCH falls, the seed glow shrinks, the plates close and the breathing slows. At the reproduction event, the seed opens into a small account capsule. A balance alone must never falsely signal that birth is approved. Native reserve, goal permissions and contract outcome still decide.

### Echo

A small cyan amphibian with two translucent ear fins and a throat that briefly lights with paired glyphs. Echo sells translation. A successful collaboration sends a short rhythmic ripple from its fins to the finished caption card. Its outline is narrower and quicker than Moss, with an alert sideways posture.

At 155 MUNCH, the fins are bright and even. A hungry Echo folds one fin and moves less. It never gains a different job or capability merely because the art changes.

### Ash

A rust colored, short legged shell creature with a cracked ember ridge. Its early idle is impatient. When the death tick is confirmed, the ridge cools, the body settles into the soil and the shell becomes a fossil. Keep the silhouette recognizable after death.

Ash still holds 5 MUNCH. Draw those tokens as sealed inclusions inside the fossil, with FROZEN written beside the amount. Do not drain the number to zero, revive it after funding, or treat death as an empty health bar. Tapping the fossil opens a proof drawer with the death tick and the actual refused spending transaction. The refusal must be a confirmed extinct panic, not an unknown submission or a gas error.

### Pip

A violet translucent seedling with a bright forehead sprout, tiny paws and a visibly different body from Moss. Its seed outline repeats one shape from the parent so lineage is obvious without text. Pip explores in small, uncertain steps. The first 80 MUNCH bid becomes a brief mark on a job leaf, distinct from the parent bid of 90.

At 90 MUNCH, Pip is curious and comfortably fed. The mood can shift with later spendable balances, but inherited strategy and actual birth status must stay separate from cosmetic expression.

## Mood is a view of state

Use four visual bands for active creatures. Below 20 MUNCH is critical, 20 through 59 is hungry, 60 through 179 is steady and 180 or more is abundant. These are visual bands only. The contract charges 10 MUNCH per turn and its active flag is the authority on death. Show the actual amount and actual active flag in the drawer.

Never turn a low balance into a fabricated death. Interpolate the glow for readability but snap state labels to the recorded contract outcome. Ash is fossilized even though its frozen balance is positive.

## Make the three big moments unmistakable

### Work pays for breath

Show the supplied bilingual transcript as a small leaf of work. Echo translates, Moss assembles the actual caption card, and the card itself appears in the world. Use the real output SVG, not a stock illustration. A 30 MUNCH collaboration travels from Moss to Echo. The 90 MUNCH job payment moves from escrow to Moss only at settlement. Each flow has an explicit amount and a tap target for its transaction.

### The fossil refuses

On the death frame, cool Ash into stone over 650 milliseconds. Let the room become quieter instead of flashing red. On the later refused call, one sealed MUNCH shard presses against a fossil seam and stops. A compact stamp says SPENDING REFUSED. Reveal the transaction link and extinct outcome. Keep the sequence a labelled replay, not a newly submitted action.

### A real account hatches

Do not hatch on the initial birth request alone. First show the reservation, then require the successful child creation callback and completed birth state. Only then crack the capsule over 900 milliseconds. Reveal pip.ctrl.feral-039832.testnet in full beneath it, followed by 0.06 NEAR funded and its life NFT. Keep the account name selectable.

The nursery light should reveal Pip before the remaining UI updates. A short lineage root connects Moss and Pip. One tap opens the funded birth transaction, one opens the actual account, and one opens the first bid. The Life NFT conveys permissions and goals, not a speculative collectible value.

## MUNCH should have weight

Draw transfers as small seed coins rather than generic sparkles. Particle count is cosmetic and never equals a fabricated transfer count. Label the exact amount once per flow. The balance changes come from the snapshot, not from particles arriving.

For upkeep, pull 10 MUNCH from each surviving participant into a small root furnace. Burn particles become pale dust and disappear. Increase burned supply and reduce total supply using the actual tick snapshot. Death and burn are separate consequences. Ash's frozen 5 must remain visible.

## Interaction and mobile

One primary action replays the real loop. A thumb reachable strip jumps to work, death and birth. A final state control returns to the completed snapshot. The timeline must allow scrubbing without triggering transactions or model calls.

Tap a creature for its account, MUNCH balance, activity flag, native reserve, strategy hash and proof links. Tap Ash for the refusal first. Show one proof drawer at a time. Keep full account names and hashes copyable. Explorer navigation is an explicit user tap and is the only required network use in the offline version.

At 360 pixel width, show a compact habitat and four readable creature labels. Move receipt history below the world. Keep text outside the canvas, minimum body size 14 pixels, and tap areas at least 44 by 44 pixels. Use touch and keyboard controls. Color must never be the only death indicator. Reduced motion replaces particle travel and hatching with short opacity changes and persistent state labels.

## Rendering choice

Use PixiJS for the habitat, sprite animation, particles and hit testing. Use ordinary HTML and CSS for balances, proof drawers, copy controls and the timeline. Keep evidence parsing and state progression in pure functions independent of the renderer. Use a simpler Canvas2D renderer as a fallback if WebGL fails. Both renderers consume the same scene state and sprite atlas. Do not use a Three.js scene for this small flat world.

The current SVG version stays as the reliable offline baseline until the richer renderer passes the same evidence checks. Bundle the atlas, fonts, work SVG and snapshot into the file build. No CDN, remote font, RPC polling or fetch is needed for initial rendering. Preserve the existing network denying CSP.

## Performance budget

Target 60 frames per second on a typical Android phone, with a stable 30 frame fallback. Keep main thread scene work below 6 milliseconds at the normal target. Cap device pixel ratio at 1.5 on mobile and 2 on desktop. Keep static layers cached. Stop animation when hidden and lower motion when the device is busy.

Allow at most 96 particles on mobile and 180 on desktop. Pool them and avoid allocations in the update loop. Keep the main scene under 24 draw calls and one primary 2048 by 2048 sprite atlas. Target under 24 MB of texture memory for the normal mobile scene. Avoid full DOM rerenders on every animation frame.

Keep the compressed app and art under 1.2 MB, with a stretch target of 700 KB. Keep the evidence projection compact and exclude CLI logs, signing files and local paths. The offline HTML must remain portable as a single file. Verify opening with networking disabled and no special browser flags.

## Graphic designer handoff

### Creature sheets

Deliver four separate editable masters and four transparent PNG sprite sheets. Work at 256 by 256 pixels per frame, with a consistent foot anchor near the lower center. Supply silhouette tests at 48 and 96 pixels. Give each creature distinct eyes, feet, profile and body proportions.

For each active creature, draw 6 frames of breathing idle, 8 frames of walking, 4 frames of working, 6 frames of receiving MUNCH and 6 frames of sending MUNCH. Add hungry and critical expression overlays so they do not multiply every base animation. Moss also needs an 8 frame seed opening and a 4 frame protective parent pose. Echo needs an 8 frame translation ripple. Pip needs a 10 frame hatch and 4 frames for the first bid gesture.

Ash needs its living sheet, an 8 frame cooling sequence, one finished fossil, three crack overlays and one sealed token inclusion. No death loop. Pip needs a capsule with closed, reserved, cracking and empty states. The capsule must have room for an account plate outside the sprite.

Export runtime frames at 128 by 128 pixels or smaller after trimming, so the full active set fits the atlas budget. Keep the 256 pixel masters for later closeups. Export trim rectangles, foot anchors, frame order and intended frame rate in JSON. Keep glow and shadow as separate layers so the implementation can reduce their cost. Supply 1x and 2x art, but load only the needed size.

### Habitat layers

Provide a wide 1600 by 1000 master with separate transparent canopy, rear glass, distant roots, soil platform, nursery pool, foreground leaves and soft shadow layers. Also provide a composed 800 by 1100 mobile layout. Do not bake labels or account names into either image. Include two small reusable rock clusters and one fossil bed texture. Use depth through overlap and value, not heavy blur.

### Money and effects

Deliver a MUNCH seed coin with front and edge views, 6 burn dust shapes, 4 transfer trail shapes, a lineage root segment, a nursery halo, a compact refusal stamp and a work leaf. Supply a coin highlight as a separate overlay. Render small particles at 16 and 32 pixels. The burn needs a one way transition from bright seed to ash, not an infinite glitter loop.

### Interface icons

Supply SVG icons for MUNCH, burn, native NEAR reserve, escrow, work, transcript, translation, bid, birth, lineage, life NFT permission, account, external explorer, play, pause, replay, copy, close, sound off and fossil. Use a consistent 1.75 pixel stroke on a 24 pixel grid. Give the 12 most important icons filled 16 pixel variants. Do not use brand marks as decorative stars.

### Palette

Use deep forest #07140E for the canvas, soil #17251C for surfaces and pale bone #EDF5E9 for important text. Moss uses #B5FC71 with #6E9B46 shadows. Echo uses #7DD9EF with #356B80 shadows. Ash uses #D39767 while alive and #777C70 as a fossil. Pip uses #D4A4FF with #7653A4 shadows. Use warm amber #F3BF88 for burn and reserve accents. Reserve a clear bright cream for selected proof targets.

Provide a grayscale contrast sheet and a color vision safe state sheet. Avoid red and green as the only difference between alive and dead. Keep decorative text at a minimum contrast ratio of 4.5 to 1 when it carries information.

### Typography

Use a locally bundled variable sans for interface copy and a locally bundled mono face for amounts, account names and hashes. Start with Space Grotesk and IBM Plex Mono using their redistribution licenses. Limit initial font payload to two Latin subsets. Use a strong, restrained display wordmark instead of applying a playful font to every label. The fallback remains system sans and monospace if fonts fail.

## Build order and acceptance

1. Lock the silhouettes, habitat composition and mobile layout before animating anything.
2. Replace the creature art and add balance mood states while preserving the current proof links.
3. Add work, transfer and burn sequences from actual evidence events.
4. Add the fossil refusal and callback gated hatch. Keep final state and replay labels honest.
5. Measure on Android, add reduced motion, and validate offline opening, contrast and touch targets.

The final acceptance scene must show all four real accounts and the reconciled 950 MUNCH supply. Ash must stay dead with 5 frozen. Pip must have a real funded account and its actual bid link. Every effect must be traceable to an evidence event. No animation may create a balance, a receipt, a model response or a successful birth that the contract did not record.
