# Feral — Botanical Reliquary / Phase 1, revision 3.1

Direction: tactile botanical gouache, etched ink and asymmetric living seed-vault specimens. Look-development only; no animation, app changes or public posting.

## Latest focused correction — Echo critical v2
Only Echo critical artwork changed: cracked, low/wide sagging gourd, collapsed stance, buckled/splayed root legs and heavy desaturation. Hungry remains upright and is byte-identical, as are all other creature states, props, habitat and both cast mockups. The critical preview, atlas, raster/SVG composition masters, runtime images, state audit/readability and alpha boards are synchronized. Previous files were copied before replacement to `_pre_echo_critical_v2/` with mirrored paths; its runtime copies live OUTSIDE the active runtime folder.

Latest SHA-256 report: `metadata/echo_critical_v2_validation.json`; **277 other pre-existing files unchanged**. Earlier validation reports below are historical checkpoints. The 48/96px strips now have a second row showing Echo front, hungry and critical; the labeled readability board identifies those states.

## Latest changes and audit
- **Echo front / hungry / critical:** redesigned with a substantial cyan resonant-gourd chamber, small matte eye-spots, asymmetric trumpet/reed collectors and four walking root legs. Hungry lowers both side collectors and closes its throat; critical v2 now collapses the chamber into a broad low slump with buckled/splayed roots, larger cracks and dim eye-slits. Tiny generated eye catchlights were locally suppressed. Silhouette is solid at 48px: 694 filled pixels versus Moss 742 and Pip 461, at the same 48px cell size.
- **Pip hungry ONLY:** replaced the almost-identical steady/hungry drawing with a shrunken pod, wider exposed kernel seam and a tightly rolled scroll-leaf instead of the large open leaf. Pip front and critical remain byte-identical.
- **Moss critical ONLY:** changed the standing hungry-like pose to a low crouch with chin near paws, bent knees, resting split tail and dark seed. Moss front and hungry remain byte-identical; their broad/full versus thin/standing distinction already held at 48px.
- **Ash hungry:** replaced the near-duplicate frontal pose with a low extended-neck profile and dim rust shell, while keeping its shell species recognizable.
- **Ash critical:** replaced the recolored front-like pose with a lower braced stance, extended forefoot, cracked dull shell and open living eyes. Ash front and fossil remain byte-identical. All living Ash poses are historical only.
- Side-by-side review covered every state at 256px and actual 48px, with enlarged nearest-neighbor inspection. Non-color posture cues support mandatory state labels; this is not formal accessibility certification.

## Current previews
- `previews/echo_sheet.png`, `previews/pip_sheet.png`, `previews/moss_sheet.png`, `previews/ash_sheet.png`
- `previews/readability_board.png` and `previews/readability_48px.png` — current four-character front/fossil comparison.
- `previews/state_audit_48px.png` — every mood state, literal 48px plus 3× inspection.
- `previews/habitat_desktop_cast_mockup.png`, `previews/habitat_mobile_cast_mockup.png` — updated Echo clearly visible on unchanged habitats; other current cast placements unchanged.
- `previews/statefix_alpha_check.png` — four authorized state fixes in PNG and decoded WebP against checkerboard.
- `previews/alpha_quality_check.png`, `previews/runtime_alpha_check.png`, `previews/runtime_assets_check.png` — current full QA boards.
- `previews/refusal_stamp_preview.png` and `previews/props_board.png` — approved revision-2 stamp/props, unchanged.

## Runtime and verification
Active runtime: **1,047,165 bytes**, including manifest (1.047 MB), **36 WebP images**. Entire `runtime/` folder INCLUDING preserved version archives: **1,214,945 bytes** (1.215 MB). Both totals are below 8MB. Underscore-prefixed folders are archives and must not be loaded by the app. `runtime/manifest.json` lists only current active assets.

WebP uses lossy RGB with exact lossless alpha; decoded sizes and alpha channels are checked against PNG originals. 128px and 256px versions are alternatives, not a requirement to load both. Browser/device/performance testing and the original 1.2MB single-file application budget remain unvalidated.

SHA-256 verification: all **78 protected files** remained byte-identical through the authorized state fixes, including habitat art/layers, coin, fossil, stamp, Pip critical/front, Moss front/hungry, Ash front/fossil, and all Echo V3 assets. `metadata/statefix_validation.json` is the latest report. `metadata/echo_v3_validation.json` records the earlier Echo-only checkpoint, before the subsequently authorized four state fixes; older revision reports are historical.

## Files, masters and versioning
- `creatures/<name>/<name>_<state>.png`: 256×256 RGBA; `_128.png`: 128×128. `*_sprite_sheet.png`: static horizontal mood sheets, not animation. Frame order: front / hungry / critical [/ fossil for Ash].
- `masters/*_1024.png`: raster working masters. `masters/*_editable.svg`: separate embedded raster image groups with editable composition/labels, not vector-traced creatures. `sources/` retains native generated sources; normalization may resample subjects inside 1024px working canvases.
- `masters/refusal_stamp_1536.png`, `masters/refusal_stamp_768.png`, `props/refusal_stamp.png`: approved textured paper/seed-seal master and exports. `masters/refusal_stamp.svg`: approved clean vector alternative, not a tracing of the paper texture.
- `habitat/habitat_desktop.png`: 1600×1000; `habitat/habitat_mobile.png`: 800×1100; `habitat/layers/foreground_leaves.png`: alpha foreground. These remain unchanged. Other environment layers are flattened; delivered dimensions are aspect-preserving resamples of smaller native sources.
- `metadata/sprites.json`: current state order, trim/source rectangles and common foot anchor `(128,227)` on 256px frames. Frame rate zero; static look studies only.
- Prior V1 creatures/previews/masters/sources remain under their `_v1` locations. Echo V2 is preserved under `creatures/_v2/echo/`, `masters/_v2/`, `sources/_v2/`, `previews/_v2/`, `runtime/_v2/creatures/echo/`, with prior docs/metadata under `_v2/`.
- All four replaced audit states were copied BEFORE overwriting to `creatures/_pre_statefix/<name>/`, `masters/_pre_statefix/`, `sources/_pre_statefix/`, and `runtime/creatures/_pre_statefix/<name>/`. Previous affected sheets/composition documents are under `_pre_statefix/`.
- `revise_echo_v3.py` reproduces Echo, `statefix_v3.py` reproduces the four authorized state fixes. Earlier scripts recreate historical revisions and must not be used to update current approved assets indiscriminately.
- **Complete absolute file list:** `FILES.txt`; machine-readable inventory: `metadata/file_manifest.json`.

## Palette / type / truthfulness
Forest `#07140E`, soil `#17251C`, bone `#EDF5E9`; Moss `#B5FC71` / `#6E9B46`; Echo `#7DD9EF` / `#356B80`; living Ash `#D39767`, fossil `#777C70`; Pip `#D4A4FF` / `#7653A4`; burn/reserve amber `#F3BF88`. Identity anchors allow gouache tonal variation and critical desaturation. UI direction remains locally bundled Space Grotesk and IBM Plex Mono; preview/stamp annotation uses DejaVu fallback, with no app/font changes.

Moods are cosmetic: critical `<20`, hungry `20–59`, steady `60–179`, abundant `180+`. Critical never means dead. Current Ash stays permanently fossilized with **5 MUNCH FROZEN**; living studies cannot replace it in the current scene. Show refusal only against a confirmed extinct refusal, never unknown submission/gas error. Keep balances, labels, account names and evidence in HTML.

Caveats: generated and locally processed raster look-development, not manually painted originals or final animation-ready rigs. Pose/proportion interpolation needs later rig cleanup. Visual originality review cannot guarantee uniqueness against every existing IP or legal clearance. Fine facial/crack details soften at 48px, so posture and persistent state labels remain important. No production atlas, animation, full paint-layer separation, app integration or posting was done.
