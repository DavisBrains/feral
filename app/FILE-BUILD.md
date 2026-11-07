# Feral offline file build

Open file:///workspace/near/feral/app/dist-file/index.html directly. The HTML is portable by itself. The adjacent manifest is for inspection and is not fetched.

Rebuild from the latest completed evidence with npm run build:file in app. This reads the public journal and transaction evidence, checks that both are complete and agree, checks MUNCH conservation and bundles the saved states, model decisions, proof links and actual generated card. It never opens credentials, contacts RPC, signs or sends anything.

The file starts on the real final testnet state. Moss holds 190 MUNCH, Echo 155, Ash is dead with 5 frozen and Pip holds 90. Supply is 950 after 50 burned. There are 24 public transaction links and 20 recorded state frames. The four account creation events have no state snapshots, so they remain in the full receipt trail rather than receiving invented frames.

Use the replay control or timeline to inspect earlier states. The Qwen decisions are recorded results, not new live model calls. Tapping creatures opens their real account, except Ash which opens its confirmed refused spending transaction. Full accounts are also listed below the habitat. The generated caption card is embedded as a data URL. Save it with the download link.

The build uses Vite with relative base and an IIFE entry, then embeds the resulting JavaScript and CSS into one HTML file. The script is classic inline JavaScript with no module loading or CORS dependency. A restrictive CSP denies all network connections and permits only inline scripts, inline styles and data images. Explorer links require a connection only after an explicit click.

Tests execute the actual bundled script in a Node VM with DOM stubs and no network API, verify the final creatures, balances and every explorer URL, and scrub every snapshot. They also check for external script or stylesheet references, imports, fetch, localhost and remote CSS resources. Run npm test after building. The ordinary npm run build also still passes.

The PNG at evidence/ui-file-preview.png is a static headless preview. The built script was executed in the test harness, then its populated HTML and inline SVG were rasterized with WeasyPrint and Poppler, allowing data URLs only. It is not a Chromium screenshot or a substitute for checking the file in the desktop browser. No browser security flag or local server is required by the build.

The visual direction and graphic designer handoff are in docs/VISUAL-POLISH.md. An identical planning copy is at /workspace/near/plan/feral-visual-polish.md.
