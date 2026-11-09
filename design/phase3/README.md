# Feral · Phase 3 step 1 · design system and component sheet

**Concept.** The field case. A naturalist's reliquary for small lives that must earn. Dark glass and soil hold the living world, paper ink and wax hold the proof. Built to sit around the PixiJS terrarium and to be copied straight into HTML and CSS.

Step 1 delivered the design system and every component with all states. Step 2 adds the full desktop 1440 and mobile 390 page mockups, the hero headline variants and the caption card restyle.

## Start here
- `components/component-sheet-desktop.png` · every component and state at 1440
- `components/component-sheet-mobile.png` · three 390 phone frames (recorded run, feed sheet, pending turn) plus mobile component variants
- `components/preview-foundations-buttons.png`, `components/preview-labels-playback.png` · cropped previews
- `UI-SPEC.md` · palette, type, grid, label placement rules, every component's anatomy, states and copy, mobile dock, assets
- `html/tokens.css` · CSS custom properties and @font-face
- `html/components.css` · production ready component CSS, prefix `f-`
- `html/components.html`, `html/components-mobile.html` · reference markup for every state (open in Chrome from this folder)
- `assets/` · fonts, textures, wax seals, ink icons, ornaments, pins and paper bits

## Step 2
- `mockups/page-desktop-1440.png`, `mockups/page-mobile-390.png` · full pages, headline variant 1
- `mockups/hero-variant-{1,2,3}-desktop.png` (1440 × 900) and `mockups/hero-variant-{1,2,3}-mobile.png` (390 × 844 at 2x) · the fold for each headline
- `card/` · caption card restyle (`render-card.mjs`, `template-bilingual.svg`, `template-short.svg`, PNG previews). See UI-SPEC section 11
- `html/page.css`, `html/page-desktop-v*.html`, `html/page-mobile-v*.html` · page source

## Rebuild
`_build/process.py` (seals, ornaments, textures), `_build/icons.py` (SVG icons), `_build/build_sheet.py` and `_build/build_mobile.py` (HTML), `_build/shot.mjs` (Chrome screenshot), `_build/build_page.py` plus `_build/pages.mjs` (pages and folds), `card/build-previews.mjs` plus `_build/cards.mjs` (cards). Needs `npm i playwright-core` in `_build`. Generated sources `_build/wax_seal_src.jpg` and `_build/ink_ornaments_src.jpg`.

## Honesty and copy
All product copy is plain words with no colons, no dashes and no "not this but that" lines (checked by a text scan of both HTML files). Figures match the bundled testnet read (block 276,891,939, 24 receipts, 950 supply, 50 burned, Moss 190, Echo 155, Ash 5 frozen, Pip 90). Hashes in toasts are sample receipts taken from the proof run. The Sepolia **done** state, the pouch, sponsor, feed, post a job, season goal and live advance are designs for controls the developer is adding, so their numbers are samples.

## Not changed
Phase 1 and phase 2 art and the app source were only read, never modified. Nothing was posted.
