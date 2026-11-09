# Feral UI spec · Phase 3 step 1 · design system and components

Concept. **The field case.** Feral is a naturalist's reliquary for small lives that must earn. Dark glass and soil hold the living world (PixiJS). Paper, ink and wax hold the proof (HTML and CSS). Nothing glows like a dashboard. Paper presses down, wax means sealed, a blind emboss means still waiting.

Reference build: `html/tokens.css` (all tokens), `html/components.css` (every component, class prefix `f-`), `html/components.html` and `html/components-mobile.html` (every state, rendered to `components/*.png`). Copy the CSS straight into the app. Class names below match it.

Locked art used, never modified: `../phase1/runtime/**` (habitat, creatures, coin, refusal stamp) and `../phase2/runtime/**` (animation strips).

---

## 1. Palette

| token | hex | use | contrast |
|---|---|---|---|
| `--forest` | #07140E | page, case interior, PixiJS clear colour | |
| `--forest-2` | #0C1D15 | recessed wells, mode switch slot | |
| `--soil` | #17251C | dark panels | |
| `--soil-2` | #1F3126 | dark hover, raised | |
| `--soil-line` | #2E4436 | hairlines on dark | |
| `--soil-line-2` | #41594A | stronger rules, ghost borders | |
| `--bone` | #EDF5E9 | primary text on dark | 14.3 on soil |
| `--bone-2` | #B9C4B4 | secondary on dark | 8.8 on soil |
| `--bone-3` | #8E9A8A | meta on dark | 5.4 on soil |
| `--vellum` | #E9E4D2 | paper (labels, notices, ledger, toasts) | |
| `--vellum-2` | #DCD5BE | pressed paper | |
| `--vellum-3` | #C9C0A4 | paper rule, active tab edge | |
| `--ink` | #162018 | text on paper | 13.2 on vellum |
| `--ink-2` | #3E4A3C | secondary on paper | 7.3 |
| `--ink-3` | #555F50 | meta on paper | 5.3 (4.6 on vellum-2) |
| `--moss` / `--moss-sh` / `--moss-ink` | #B5FC71 / #6E9B46 / #3B5E1E | Moss identity, success seal; `-ink` for text on paper | ink 5.9 |
| `--echo` / `--echo-sh` / `--echo-ink` | #7DD9EF / #356B80 / #1E5466 | Echo identity, Sepolia done | ink 6.6 |
| `--pip` / `--pip-sh` / `--pip-ink` | #D4A4FF / #7653A4 / #56368A | Pip identity, birth, life NFT | ink 7.2 |
| `--ash` | #D39767 | living Ash (history only) | |
| `--fossil` / `--fossil-ink` | #777C70 / #4D5149 | fossil, death, refusal | ink 5.1 on fossil label |
| `--amber` / `--amber-deep` / `--amber-ink` | #F3BF88 / #B9722F / #7E4613 | burns, upkeep, reserve, the Advance wax | amber 9.6 on soil, ink 6.0 on vellum |
| `--cream` | #FFF3C9 | selected proof target, focus ring | ink on cream 15.1 |
| `--rust` / `--rust-ink` | #E0896A / #8E3A1E | errors only, always with icon and words | 6.0 / 6.0 |

Rules. Creature colours are identity marks (seed dot, vine, wax), never body text on paper; use the `-ink` variant for text. Death is never shown by colour alone. Fossil state always carries the word **Fossil**, the square marker and the fossil icon. Lime is never a button fill.

## 2. Type

All self hosted woff2 in `assets/fonts/` (SIL OFL, `OFL-LICENSES.txt`). Total 208 KB. To hit the 1.2 MB app budget, subset Fraunces to the glyphs used (pyftsubset, latin basic plus á é í ó ú ñ) or drop the italic file and use Fraunces normal for notes.

| role | family | weight | size / line height | tracking |
|---|---|---|---|---|
| Display headline | Fraunces (opsz auto) | 460 to 480, italic 380 for the second line | 76/0.98 desktop, 40/1.0 mobile, `clamp(40px,5.2vw,76px)` | −0.012em |
| H1 | Fraunces | 460 | 44 desktop, 34 mobile | −0.012em |
| H2 section | Fraunces | 500 | 30/1.1 (26 mobile) | −0.01em |
| H3 card title | Fraunces | 500 | 22 to 26/1.1 | 0 |
| Notice title | Fraunces | 500 | 34/1 (28 mobile) | −0.02em |
| Specimen name | Fraunces | 560 | 19 (15 compact) | −0.01em |
| Ink note | Fraunces italic | 400 | 17/1.4 (16 mobile) | 0 |
| Body | Instrument Sans | 400 | 16/1.5, min 14 | 0 |
| UI button | Instrument Sans | 600 | 15 (14 small) | 0.01em |
| Caps label | Instrument Sans | 600 | 12/1.2 uppercase | 0.14em |
| Data, amounts, hashes, accounts | IBM Plex Mono | 400 / 500 | 14 and 13, never under 12.5 | 0, slashed zero on |

Fallbacks: Georgia, system-ui, ui-monospace. Amounts always `MUNCH` in caps after the number. Hashes shortened as first 4, ellipsis, last 4 (`C3xY…5ar`) with the full value in `title` and a copy control. Full account names stay full and selectable.

## 3. Spacing, grid, breakpoints

- 4 px base. `--s1..s9` = 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Desktop 1440. 12 columns, 72 margin, 24 gutter, 1296 content.
- Tablet 768 to 1279. 8 columns, 40 margin, 20 gutter.
- Mobile 360 to 767. 4 columns, 16 margin, 12 gutter, content 358 at 390.
- Breakpoints `360, 390, 768, 1024, 1280, 1440`. Below 768 the dock pattern replaces the inline controls.
- Radii. 2 paper, 4 buttons, 8 panels, 10 stage, 14 sheets, pill for mode switch and creature picks.
- Tap targets ≥ 44 × 44 everywhere (`--tap`). Dock items 60 tall. Hash links in the log are 44 tall rows.

## 4. Surfaces and textures

| class | look | CSS |
|---|---|---|
| `.f-panel` | soil card with grain | `background: var(--soil) var(--tex-soil)`; 1px `--soil-line`; radius 8; 24 padding |
| `.f-paper` | vellum sheet with a printed inner frame at 5px | `background: var(--vellum) var(--tex-paper)`; `--sh-paper`; `::before` inner border 1px ink 14% |
| `.f-well` | recessed slot | `--forest-2`, inset shadow |
| `body::after` | film grain over everything | `grain_overlay_128.webp`, `mix-blend-mode: overlay`, opacity .55, `pointer-events:none` |

Textures are tileable webp. `paper_vellum_512.webp` 10 KB, `soil_panel_512.webp` 1 KB, `forest_page_512.webp` 1 KB, `grain_overlay_128.webp` 22 KB (alpha).

## 5. PixiJS stage and label placement

**Stage container** `.f-stage`. Desktop full content width 1296, aspect 1600 by 1000 (1296 × 810). Mobile 358 wide, aspect 800 by 1100 (358 × 492). Use `habitat_desktop` or `habitat_mobile` from phase 1 runtime; `foreground_leaves.webp` above creatures. Frame is CSS only (`box-shadow` rings, radius 10). Canvas resolution capped at DPR 2 desktop, 1.5 mobile. The canvas fills the container; HTML labels sit in an absolutely positioned overlay with the same box, and an SVG `.f-leaders` layer between canvas and labels.

**Creature scale.** Render at these widths (256 px sprite frame, foot anchor 128,227 = 88.67% down) relative to stage width. Desktop Moss 19.3%, Echo 18.5%, Pip 14.7%, Ash 17%. Mobile Moss 34.6%, Echo 32.4%, Pip 26.3%, Ash 30.2%. Foot positions (fraction of stage) desktop Moss .232,.572 · Echo .488,.523 · Pip .745,.556 · Ash .462,.905. Mobile Moss .227,.531 · Echo .545,.507 · Pip .789,.623 · Ash .445,.873. These are about 1.6× the current build.

**Keep out boxes.** For each creature, take the phase 1 `trim_rect` for its current state (phase1 `metadata/sprites.json`), scale to screen, pad 12 px (8 px mobile). Labels, ink notes and toasts never intersect any keep out box. Recompute on resize and on state change (critical poses are lower and wider).

**Label placement order.** Try candidate slots in this order and take the first that fits inside the stage (8 px inset), clear of every keep out box and every placed label. 1 above left, 2 above right, 3 left, 4 right, 5 below left, 6 below right. Defaults from the sheet: Moss above left, Echo above right, Pip right (desktop) or below left (mobile), Ash left (desktop) or below left (mobile). Cache the chosen slot per creature so labels do not jump during idle animation; only re-place on resize or state change.

**Leader.** SVG cubic from the label punch hole side (left mid for side slots, top mid for below slots) to a tick on the keep out box edge nearest the creature's head. Stroke bone 1.25 at 85%; tick is a 4.5 r ring with a 1.6 r dot. Dashed `.dim` leader when the creature is a fossil.

**Specimen label** `.f-spec`. Min width 150 (compact 112). Padding 9 14 9 26. Paper tag with a punched hole at left (8 px). Rows. Name (Fraunces 19) plus short account in mono 11. Mood (caps 12 with seed marker) left, balance (mono 14) right. Moods snap to contract bands. 180 plus **Thriving**, 60 to 179 **Steady**, 20 to 59 **Hungry** (amber ink, half seed), under 20 **Starving** (rust ink, sliver seed), inactive **Fossil** (grey paper, square marker, balance reads `5 MUNCH frozen`). Pip shows **Newborn** while it is the most recent birth. States. default, hover (lift 1px, deeper shadow), selected (cream, 2px ink ring, drawer open), focus (cream ring). The whole label is the tap target for the creature drawer and is keyboard focusable in creature order Moss, Echo, Pip, Ash.

## 6. Components

Copy rule for every string. Plain words, short sentences. No colons, no dashes as punctuation, no "not this but that". Numbers are real or labelled sample.

### 6.1 Buttons
| variant | class | default | hover | active | disabled | pending |
|---|---|---|---|---|---|---|
| Paper | `.f-btn` | vellum, ink text, 1px ink 65% border, drop 2px | lifts 1px, lighter paper, longer shadow | presses 1px, vellum-2, inset shadow | transparent, dashed border, hatch, bone-3 text, `cursor:not-allowed`, label says why (`Pouch is empty`) | vellum-2, seed dots, verb in progress (`Sending`) |
| Ghost on soil | `.f-btn--ghost` | transparent, bone, soil-line-2 border | soil-2 fill | forest-2 inset | as above | seed dots, `Reading` |
| Wax press | `.f-press` 104 (dock 80, inline 64) | amber seal, dashed amber halo | lifts 3px and turns −3° with settle ease | sinks 2px, scale .96 | grey wax, 55% | slow amber ring spins around the halo, wax dims |
| Ink link | `.f-link` | underline 1px offset 3 | 2px underline, cream (dark) or cream highlight (paper) | | | |
Sizes. 44 min height, 20 side padding, small 36 for secondary rows only. Icon 16 to 20 left of label with 10 gap. Focus ring 2px cream offset 3 on every control.

### 6.2 Mode switch `.f-mode`
Two pill segments in a recessed slot. **Live season** (breathing moss dot) and **Recorded proof run** (replay icon). Chosen segment is vellum with ink. Under it a full width banner.
- Live banner `Live season. Your moves are sent to NEAR testnet for real.`
- Recorded banner (amber hatching) `Recorded proof run. A replay of the real run from 9 Nov. Nothing new is sent.`
- Mobile short labels `Live season` and `Recorded run`, note `A replay of the real run. Nothing new is sent.`
Recorded mode disables Advance, Feed, Sponsor and Post a job with the reason `Switch to the live season to move time forward. Recorded runs only replay.`

### 6.3 Playback `.f-play`
Play button 56 round paper. Track is a hand drawn root line, 24 event seeds (one per testnet receipt), passed seeds filled bone, chapter seeds larger with cream ring. Thumb is the MUNCH seed coin (phase 1 `munch_seed_coin_front.webp`) at 34 px. Chapter flags above the track (Death sits left of its seed, Refusal right, so they never collide). Readout mono `Step 19 of 24` and `Turn 2 of 2`.
Chapter tabs `.f-tab` sit under the track like journal index tabs. **Work** step 19 (paid-job), **Death** step 13 (death-tick), **Refusal** step 14 (refused-post-death-spend), **Birth** step 21 (funded-child-account-creation). Active tab is vellum, 6 px taller. Right side ghost button `Back to the end`. States. paused, playing (pause icon, play button pressed), chapter active, scrubbing (thumb follows pointer, nothing is sent). Keyboard. Space plays and pauses, left and right step one receipt, 1 to 4 jump chapters, End returns to the final state.

### 6.4 Live status line `.f-status`
Mono 13. Live `● Live testnet · Block 276,891,939 · 24 of 24 receipts check out [Read again]`. Reading `Reading the chain · 17 of 24 checked so far`. Offline `● Bundled read · Block 276,891,939 read this morning · 24 of 24 receipts check out [Try live]` with an amber dot. Error dot is a rust ring. Separators are 3 px dots.

### 6.5 Demand board `.f-notice` (field notice pinned in the case)
Vellum, rotated −0.6° (second notice +0.5°), brass pin `assets/ui/pin_brass.svg` at top centre, 34 28 24 padding. Kicker caps `Field notice · turn 2`. Title `Wanted this turn`. Body `The market pays for the work you pin here. The creatures read it when the next turn starts.` Options `.f-opt` (52 tall radio rows with an ink seed as the dot).
- `Short captions` / `One line, English only` / `40 MUNCH`
- `Bilingual caption cards` / `English and Spanish on one card` / `90 MUNCH`
- `Plain translation` / `Spanish only, no card` / `30 MUNCH`
States. current (button disabled `Already pinned`, green ink stamp `Pinned` top right), changed (button `Pin the new notice`, note `Costs nothing from your pouch`), pending (seed dots `Pinning`), done (toast). Rows hover cream.

### 6.6 Visitor pouch `.f-pouch`
Caps `Your MUNCH pouch`, amount mono 26 `100 of 100`. Ten MUNCH seed coins at 24 px, each worth 10. Spent coins go dark grey, never vanish. Copy full `Each seed is 10 MUNCH. Refills when the season starts again.` Low (≤20%) amber number `Two seeds left. Spend them where they count.` Spent `Empty. The creatures carry on without you.` The pouch number is also shown inside every action sheet (`Pouch 60 of 100`) and in the season goal footer.

### 6.7 Sponsor a lineage, Feed a creature `.f-act`
Paper cards. Pick chips `.f-pick` (44 tall pills with a 34 px creature portrait from phase 1 `_128.webp`). Chosen chip is ink filled.
- Sponsor title `Sponsor a lineage`, body `Back a family line. Your MUNCH tops up the parent and every child it raises this season.` Chips `Moss line · 2 alive`, `Echo line · 1 alive`, `Ash line · ended` (disabled). Cost `20 MUNCH · pouch after 40`. Button `Sponsor the Moss line`.
- Feed title `Feed a creature`, body `A meal now buys them a turn. It goes straight to their balance on chain.` Chips show balances. Ash chip disabled `stone` with help `Fossils cannot eat. The contract refuses them forever.` Amount segmented `5 · 10 · 20`. Button `Feed Echo 10`.
- Pouch spent `Your pouch is empty for this season. You can still watch, post free notices and read every receipt.` Button disabled `Pouch is empty`.

### 6.8 Post a job (paper form)
Kicker `Job posting`, title `Post a job`, body `Pay comes from your pouch and waits in escrow. Creatures bid next turn and the lowest fair bid wins.` Fields with typewriter values (mono 15, 1.5px ink underline). `What needs doing` select (Short caption, Bilingual caption card, Plain translation). `Reward` stepper in MUNCH. `Open for` segmented 1, 2, 3 turns. Footer `Escrow 20 · pouch after 40`, button `Pin the job`. Field states default, focus (cream fill, 2px ink box), error (rust ink underline and help `Rewards start at 10 MUNCH`), disabled (dashed underline). Submit disabled until valid.

### 6.9 Advance the turn `.f-advance`
Wax press plus text block.
- Idle `Advance the turn` / `Every living creature pays 10 MUNCH upkeep. Then they bid, work and settle.` / meta `Turn 3 is next · 3 alive · 30 MUNCH will burn`.
- Pending `Settling on chain` / `Hold tight. A turn usually lands in 2 to 4 seconds.` / seed dots plus `tx 7tcY…yu1M sent at block 276,892,004`. All visitor actions disabled while pending; scrubbing still allowed.
- Outcome, all alive. Seal turns moss. `Turn 3 settled` / `Everyone made it through. Moss won the card job.` pills `30 burned` (amber), `Moss paid 90` (moss), hash link.
- Outcome, a death. Seal turns fossil. `Ash turned to stone` / `It could not cover upkeep. Its last 5 MUNCH are frozen inside.` pills `Ash is a fossil`, `20 burned` (the real death tick burned 20, Ash itself paid nothing), hash. The world gets quieter (PixiJS lowers ambient by 20% for 650 ms) with no red flash.
- Disabled in recorded run (grey wax) with the reason line above.
Timeout after 20 s becomes the error toast and returns to idle.

### 6.10 Season goal `.f-goal`
Caps `Season goal`, title `Keep two lineages alive for 8 turns`. One lane `.f-lane` per lineage, a vine that grows one leaf per survived turn, dotted path for turns to come, `5 of 8` at right. Footer `Turn 5 of 8` and `Pouch 40 of 100`.
- Win. Both vines full, moss seal, `Both lines held. Season won.` / `You spent 70 of 100 MUNCH keeping them fed.`
- Lose. The ended vine stops at a fossil node, `ended t6`, fossil seal, `The Echo line ended on turn 6.` / `Season lost. The fossil stays on chain for good.`
N and budget come from the season config; copy uses the real values.

### 6.11 Bid and decision callouts `.f-note`
Ruled scrap of paper, rotated −1.2° to +1°, tail pointing at the creature, max 280 wide (mobile full width under the canvas). Caps `Moss chose` with seed marker, action in mono, reason in Fraunces italic, source line mono 11.5.
- Moss `Bid 90 on the card job` / `I can pay Echo 30 for the Spanish and still eat well.`
- Echo `Quoted 30 to translate` / `Fair work for a fair price. Moss is good for it.`
- Pip `Bid 80 on the child job` / `Ten under my parent. I am small and cheap to feed.`
- Ash (dimmed) `Waited` / `Nothing left to spend. The door is shut.`
Source `Recorded decision · Qwen2.5 1.5B · 4fKt…3Ve`, in live mode `Decided this turn · <model>`. The reason text is UI paraphrase of the recorded decision; the action and number must come from the decision JSON. On the stage, notes follow the label placement rules and appear for 4 s after a bid, max two at once.

### 6.12 Turn log `.f-log`
Rows 48 min, grid `turn · icon · what (plus small detail) · amount · hash link`. Newest first. States. new (cream wash and 3px cream left rule for 3 s), hover (soil-2, link cream underline), refused as designed (fossil icon, grey text, amount `refused`). Copy examples `Pip placed its first bid`, `Upkeep paid by three creatures` (`30 burned` amber), `Moss paid for Pip to be born` (`100`, detail names the account and 0.06 NEAR), `Moss was paid for the caption card`, `Moss paid Echo to translate`, `Ash tried to spend after death` / `The contract refused it, as it should`, `Ash ran dry and died` / `5 MUNCH frozen inside the fossil`. Links open nearblocks in a new tab.

### 6.13 Proof ledger `.f-ledger` and seals `.f-claim`
Vellum page, kicker `Proof ledger · 24 testnet receipts`, title `Every scar has a receipt`. Each claim row is a 96 px seal (64 mobile), title, plain proof line, evidence links, state at right.
| claim | seal | title | line | evidence |
|---|---|---|---|---|
| finite supply burns | amber | `The supply is finite and it burns` | `1,000 MUNCH were made once. Upkeep has burned 50. 950 are still out there.` | second-upkeep, death-tick |
| Ash died, spending refused | fossil plus the phase 1 refusal stamp at 46 px | `Ash died and its spending was refused` | `Ash could not pay upkeep on turn 1. Then it tried to spend and the contract said no.` | death-tick, refused-post-death-spend |
| Pip account and life NFT | lilac | `Pip has its own account and life NFT` | `Moss paid 100 MUNCH for the birth. Pip lives at pip.ctrl.feral-039832.testnet with 0.06 NEAR.` | funded-child-account-creation, account copy |
| child bid vs parent bid | moss | `The child bid against its parent` | `Pip offered 80 for work that Moss bid 90 on. Same family, separate wallets.` | child-first-bid, parent-bid |
States. verified (wax seal, `Sealed on chain` with check, `block 276,891,939`), pending (blind emboss `seal_pending_blind`, dashed ring, amber ink `Waiting for the chain` / `checking receipt`, title in ink-3), selected (cream wash, 3px ink left rule; used when the creature drawer or a chapter points at this claim). A claim may only show verified when the reader confirms every listed receipt.

### 6.14 Sepolia Chain Signatures row `.f-sig`
- Pending (true today). Blind emboss 48, dashed border, `A NEAR account signs on Sepolia` / `The relayer address is ready. It is waiting for test ETH before it buys the tool.` / mono `relayer 0x667e…4C10 · v1.signer-prod.testnet`, tag `Waiting`.
- Done (design only until it happens). Cream seal, echo tint, `A NEAR account signed on Sepolia` / `Moss bought 7 TOOL on Sepolia with a signature made on NEAR.` / Sepolia tx link, tag `Done`.

### 6.15 Work output caption card `.f-mount`
The real `live-work/card.svg` mounted as a specimen. Forest mat with 14 px padding, four photo corners `assets/ui/paper_corner.svg`, inside a vellum sheet. Kicker `Paid work`, title `The card they made to earn`, caption italic `Echo wrote the Spanish. Moss put the card together. The buyer paid 90 MUNCH.` Actions `Save the card` and `See the payment ↗` (paid-job). The bundled proof-run card stays byte for byte as evidence (its SHA-256 is on chain). Future cards use the field case restyle in section 11. The step 2 mockups show the restyle rendered from the same real text.

### 6.16 Toasts and receipts `.f-toast`
Vellum slip with a perforated top edge (CSS mask), 360 wide desktop at bottom right, mobile full width 16 inset sitting 20 above the dock. Slides up 12 px with settle ease, stays 5 s (errors stay until closed), max two stacked. Icon disc ink (error rust, pending dashed).
- Fed `Fed Echo 10 MUNCH` / `Echo has 165 now. Your pouch has 50.` / `Receipt ….`
- Sponsored `You back the Moss line` / `Moss and Pip get your 20 MUNCH this season.`
- Job `Job pinned` / `Bids open next turn. 20 MUNCH waits in escrow.`
- Notice `Notice pinned` / `Bilingual cards pay 90 from next turn.`
- Turn `Turn 3 settled` / `30 MUNCH burned. Everyone made it.`
- Pending `Sending your meal` / `Waiting for the chain to confirm.`
- Error `That did not go through` / `The chain said no and nothing was spent. Try again.`
Hashes on the sheet are sample receipts from the proof run; live toasts show the real new hash.

### 6.17 Empty, loading, error states `.f-empty`
Soil panel, ink ornament (bone) 74 px, Fraunces 22 title, 14.5 body.
- Empty log `Nothing has happened yet` / `Advance a turn and the story starts writing itself here.`
- Loading `Reading the chain` / `Checking 24 receipts against NEAR testnet.` plus skeleton bars `.f-skel`.
- Error `The chain went quiet` (rust) / `We could not reach NEAR testnet. The bundled read is still here.` / `Try again`.
- Rate limited `Give them a breath` / `Too many moves at once. You can act again in 20 seconds.` / disabled countdown `20s`.
- Budget spent `Your pouch is empty` / `The creatures carry on without you. Watch the season or replay the proof run.` / `Watch the proof run`.

## 7. Mobile dock `.f-dock`

- Fixed to the bottom, 84 tall plus `env(safe-area-inset-bottom)`, soil with a top rule and upward shadow. Five slots `1fr 1fr 96px 1fr 1fr`.
- Live season. `Feed` · `Post job` · **Advance** (80 px wax press raised 30 px above the dock, label in amber) · `Sponsor` · `Proof`.
- Recorded run. `Work` · `Death` · **Replay** (72 px paper play button) · `Refusal` · `Birth`. A compact scrub bar sits directly above the dock.
- Items 60 tall, 24 px icons, 11.5 caps label. Active item gets a 22 px cream bar on top. Disabled items 40% with the reason in the opened sheet.
- Each item opens one bottom sheet `.f-sheet` (vellum, radius 14 top, grab handle) above the dock; the habitat dims to 60% but stays visible. Only one sheet at a time. Swipe down or tap the habitat to close.
- Primary thumb zone is the bottom 260 px. No action control lives in the top half on mobile. The mode switch at the top is a setting, not an action.
- Toasts sit 20 above the dock and never cover the Advance press.

## 8. Motion
`--ease` cubic-bezier(.2,.7,.2,1) for UI, `--ease-settle` (.34,1.3,.5,1) for presses and toasts. 120 fast, 200 base, 420 slow, 650 fossil cool, 900 hatch (from the brief). Live dot breathes 2.6 s. Reduced motion shortens everything to opacity changes and stops the dot, seed dots and pending ring.

## 9. Asset list (`assets/`)

| path | what | notes |
|---|---|---|
| `fonts/fraunces-opsz-wght-latin.woff2`, `-italic.woff2` | Fraunces variable, opsz and wght | 67 and 82 KB, OFL |
| `fonts/instrument-sans-var-latin.woff2` | Instrument Sans variable wght | 30 KB, OFL |
| `fonts/ibm-plex-mono-latin-400-normal.woff2`, `-500-` | IBM Plex Mono | 15 KB each, OFL |
| `textures/paper_vellum_512.webp` | tileable vellum | `--tex-paper` |
| `textures/soil_panel_512.webp`, `forest_page_512.webp` | tileable dark grounds | `--tex-soil`, `--tex-forest` |
| `textures/grain_overlay_128.webp` | alpha grain, overlay blend | `--tex-grain` |
| `seals/seal_{amber,fossil,lilac,moss,cream}_{192,96,48}.png` | wax seals, transparent | verified states |
| `seals/seal_pending_blind_{192,96,48}.png` | blind emboss, transparent | pending state, use on paper |
| `seals/seal_master_amber_512.png` | wax master | recolour source |
| `icons/24/*.svg` (29) | ink icons, 1.75 stroke, `currentColor` | |
| `icons/16/*.svg` (12) | filled small variants | munch, burn, reserve, escrow, work, bid, birth, lineage, life_nft, account, fossil, explorer |
| `icons/feral-icons.svg` | symbol sprite `#i-<name>` | inline it once in the page |
| `ornaments/{fern_divider,root_corner,sprout,root_divider,fungus_sprig,curled_leaf}_{ink,bone}.png` | etched ink ornaments, transparent | ink for paper, bone for dark |
| `ui/pin_brass.svg` | notice pin | 28 px |
| `ui/pin_seed.svg` | small seed pin | 14 px |
| `ui/paper_corner.svg` | photo corner for the card mount | rotate per corner |
| `ui/deckle_mask.svg` | torn paper edge mask | optional for notice bottoms |
| `ui/leader_tick.svg` | leader end tick | when not drawing ticks in SVG |
| from phase 1 | `runtime/props/munch_seed_coin_front.webp` (pouch, scrub thumb), `runtime/props/refusal_stamp.webp` (Ash claim), creature `_128.webp` (pick chips), habitat and foreground layers | unchanged |

## 10. Headline candidates (for step 2)
1. **They work to eat. They pay to be born.** Sub `Four small creatures live on NEAR testnet. Each turn costs them 10 MUNCH. They take jobs to stay fed, and when one runs dry it turns to stone for good. Every scar here has a receipt.`
2. **Feed them work or watch them turn to stone.**
3. **Small lives with real bills.**
Eyebrow above the world stays `Build Beyond Boundaries`. The short idea to remember is programmable money that has to earn its next breath.

## 11. Caption card (generated work output, field case edition)

Files in `card/`. `render-card.mjs` is a pure, deterministic reference renderer (same input gives the same SVG string, so `output_sha256` stays reproducible). It mirrors the inputs of `agents/tools.mjs renderTranscript` (`title`, `segments[{en, es}]`) and adds optional `job`, `credit`, `paid`, `note`. `template-bilingual.svg` and `template-short.svg` are the same layouts with `{{slot}}` tokens for string-fill generators. Previews `card-bilingual-real.png` (real testnet text), `card-short-sample.png` (sample), `card-bilingual-long-sample.png` (wrap and overflow test), `preview-cards-overview.png`. Rendered SVGs in `card/svg/`. The app generator was not edited; porting is the developer's call.

**Look.** Vellum ground `#E9E4D2` with an SVG `feTurbulence` grain and a faint blot (seeded, deterministic, no raster), double printed frame at 36 and 46 px, etched sprout ornament top right, hand drawn root rule above the footer, vector amber wax seed seal bottom right. No lime, no bitmap, no external refs.

**Bilingual card.** 1080 wide, height `max(1350, content + 300)`.
| slot | font | size / leading | x | max |
|---|---|---|---|---|
| kicker `FERAL · PAID WORK · BILINGUAL CARD` | Instrument Sans 600, tracking 3.5, ink-3 | 22, baseline 118 | 84 | fixed |
| `job` id, right aligned | Plex Mono, ink-3 | 21, baseline 118 | 996 | 24 chars |
| `title` | Fraunces 500, tracking −1, ink | 76 / 82, first baseline 236 | 84 | 48 chars, 24 per line, 2 lines |
| language tag `EN` / `ES` | Plex Mono 500 | 18 | 84 | fixed |
| `segments[i].en` | Fraunces 400, ink | 40 / 50 | 150 | 44 chars per line, 3 lines |
| `segments[i].es` | Fraunces italic 400, echo-ink `#1E5466` | 40 / 50, 10 after EN | 150 | 44 per line, 3 lines |
| pair gap | dotted 150 px rule between pairs | 34 | | 4 segments max |
| `credit` | Fraunces italic, ink-2 | 30, baseline h−144 | 84 | 56 chars |
| `paid` | Plex Mono 500 `Paid 90 MUNCH` | 24, baseline h−100 | 84 | digits only |
| `note` | Plex Mono, ink-3 | 19, baseline h−70 | 84 | default `Made from the supplied transcript with a trusted tool.` |
| seal | vector, r 74, centre (w−170, h−160) | | | |

**Short caption card.** 1080 × 1080. Kicker `FERAL · PAID WORK · SHORT CAPTION`. Caption Fraunces 480, 104 / 112, tracking −1.5, 64 chars max, 16 per line, 4 lines, block centred in the upper area (`top = 250 + (4 − lines) × 56 + 70`), large 12% opacity opening quote above. Footer identical to the bilingual card.

**Wrapping rules (both).** Greedy by words at the char limits above (SVG has no auto wrap, so the generator must break lines). No widows, so if the last line is a single word and the line above has 3 or more words, move one word down when it fits. Overflow beyond the line cap truncates the last line at a word and adds `…`. Escape `& < > " '`. Keep the limits conservative because Fraunces width varies; the long sample shows the worst case still clear of the right frame.

**Fonts.** When the SVG is shown inline in the DOM (recommended, the app already imports it raw) it uses the page fonts. As a standalone file or `<img>`, fonts cannot load, so either embed base64 subsets in a `<style>` inside the SVG or accept the fallbacks (Georgia, system sans, monospace), which keep the layout within limits.

**Truth.** Do not add amounts or credits the job did not record. `credit` and `paid` come from the settled job and the collaboration receipt. Short caption content in the preview is a sample, since short caption jobs were cancelled in the proof run.

## 12. Step 2 page mockups and hero variants

`html/page.css` holds the page layout. `html/page-desktop-v{1,2,3}.html` and `html/page-mobile-v{1,2,3}.html` differ only in the headline.

Desktop order (1440, 72 margins). Top bar (wordmark, mode switch centred, status line right) · hero (eyebrow `Build Beyond Boundaries`, headline 76, lede, link to the proof run; right column season goal plus Advance) · terrarium stage 1296 × 810 with specimen labels and two bid notes in the canopy · **Your season** `Keep them fed` (turn outcome, pouch, latest receipt; demand notice, sponsor, feed, post a job; turn log and decisions) · **The proof run** `Watch the real run` (playback with chapters; proof ledger with Sepolia row; caption card restyle) · honesty footer.

Mobile (390). Top bar plus full width mode switch · hero 40 (v2 at 34 to hold two lines) · stage 358 × 492 with compact labels · bid notes in a horizontal strip · season goal · pouch · demand notice · turn log · proof run (compact playback, ledger at 64 px seals, card) · footer · fixed dock with the Advance wax press.

Hero headline. **Chosen default is headline 2** (picked by David on 9 Nov).
- **Default** `Feed them work` / *`or watch them turn to stone.`* Desktop sets it on two lines at 76. Mobile sets it on three deliberate lines at 40 (`Feed them work` / *`or watch them`* / *`turn to stone.`*) so no single word is left alone. Lede for this headline avoids repeating "stone". Desktop `Four small creatures live on NEAR testnet. Each turn costs them 10 MUNCH. They take jobs to stay fed and pay for their children to be born. A creature that runs dry never comes back.` Mobile `Four small creatures live on NEAR testnet. Each turn costs them 10 MUNCH. A creature that runs dry never comes back.`
- Alternate 1 `They work to eat.` / *`They pay to be born.`*
- Alternate 3 `Small lives` / *`with real bills.`*

Default source `html/page-desktop-v2.html` and `html/page-mobile-v2.html` render `mockups/page-desktop-1440.png` and `mockups/page-mobile-390.png`. Alternates stay in `page-*-v1.html` and `page-*-v3.html` with their folds `mockups/hero-variant-{1,3}-*.png`. Earlier headline 1 full pages are archived in `mockups/_headline1/`; the first headline 2 fold drafts (three line mobile wrap, repeated lede) are archived in `mockups/_headline2_fold_draft/`.
