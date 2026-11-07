#!/usr/bin/env python3
"""Bounded deterministic caption tool and trusted fixture verifier. No model claim."""
import hashlib, html, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
out = root / "evidence" / "caption-card.svg"
source = {"en": "Build beyond boundaries", "es": "Construye sin límites"}
(root / "evidence" / "translation.txt").write_text(source["es"] + "\n")
svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#102c23"/><text x="70" y="400" fill="#ccff77" font-size="72">Feral</text><text x="70" y="520" fill="white" font-size="48">'+html.escape(source["en"])+'</text><text x="70" y="600" fill="white" font-size="48">'+html.escape(source["es"])+'</text><text x="70" y="940" fill="#ccff77" font-size="24">Programmable money. Local test fixture.</text></svg>'
out.write_text(svg)
import xml.etree.ElementTree as ET
parsed=ET.fromstring(out.read_text())
assert parsed.attrib["width"]=="1080" and parsed.attrib["height"]=="1080"
texts=[x.text for x in parsed if x.tag.endswith("text")]
assert all(text in texts for text in source.values())
manifest={"source":source,"file":out.name,"sha256":hashlib.sha256(out.read_bytes()).hexdigest(),"width":1080,"height":1080,"mode":"deterministic controlled fixture","verifier":"trusted local exact text and dimensions"}
(root/"evidence"/"caption-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
print(json.dumps(manifest,ensure_ascii=False))
