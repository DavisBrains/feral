from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageFilter
import numpy as np,json,hashlib,base64
B=Path(__file__).parent
# Reuse extraction/export functions without invoking any previous revision's asset writes.
exec((B/'revise_v2.py').read_text().split('S.update({')[0])
S.update({'echo_front':'3747de82ab151dc193d7ba8f1adc56e4e331ccf5a768e1562309c56000775580','echo_hungry':'0bcdad3463fd1194c95fe0c0a9781264e9e9d4cd53f58e74ae62b99f37491220','echo_critical':'6de65467db4877790893c1bd969e1c37e9c7912cc5e098ce17ca895c257d74b5'})
# The generated images had tiny eye catchlights; remove only those, not body highlights.
eye_boxes={'front':[(366,396,390,440),(561,418,590,455)],'hungry':[(378,482,405,529),(552,490,584,537)],'critical':[(378,482,406,530),(551,490,585,542)]}
meta=json.loads((B/'metadata/sprites.json').read_text());meta['revision']='3 / Echo only';meta['frames']=[f for f in meta['frames'] if f['creature']!='echo']
for state in ['front','hungry','critical']:
 k='echo_'+state;raw=source(k);a=np.array(raw).copy()
 for x0,y0,x1,y1 in eye_boxes[state]:
  region=a[y0:y1,x0:x1];bright=np.min(region,axis=2)>185;region[bright]=[13,39,45]
 im,bbox=normalize(palette(alpha_key(Image.fromarray(a)),k));save(im,Path('masters')/(k+'_1024.png'))
 for n in [256,128]:save(im.resize((n,n),Image.Resampling.LANCZOS),Path('creatures/echo')/(k+('' if n==256 else '_128')+'.png'))
 meta['frames'].append({'creature':'echo','state':state,'file':f'creatures/echo/{k}.png','foot_anchor':[128,227],'trim_rect':list(im.resize((256,256)).getbbox()),'source_crop':list(bbox),'historical_only':False})
(B/'metadata/sprites.json').write_text(json.dumps(meta,indent=2))
original=(B/'_v1/build_assets.py').read_text()
block=original.split('# One transparent horizontal static sprite sheet')[1].split('# Exact pixel tests')[0];block=block[block.index('for name in'):].replace("['moss','echo','pip','ash']","['echo']");exec(block)
exec(original[original.index('# Exact pixel tests'):original.index('# Color-vision-safe state sheet')])
exec(original[original.index('# Text-free placement mockups'):original.index("(B/'metadata/sprites.json')")])
# Echo composition source, editable as image groups rather than falsely labeled vector art.
parts=['<svg xmlns="http://www.w3.org/2000/svg" width="3072" height="1200" viewBox="0 0 3072 1200"><rect width="100%" height="100%" fill="#07140E"/>']
for i,state in enumerate(['front','hungry','critical']):
 dat=base64.b64encode((B/f'masters/echo_{state}_1024.png').read_bytes()).decode();parts.append(f'<g id="echo_{state}"><image x="{i*1024}" y="80" width="1024" height="1024" href="data:image/png;base64,{dat}"/><text x="{i*1024+100}" y="1150" font-size="36" fill="#EDF5E9" font-family="monospace">ECHO V3 / {state.upper()}</text></g>')
parts.append('</svg>');(B/'masters/echo_editable.svg').write_text('\n'.join(parts))
# Write ONLY Echo runtime files. All approved runtime files remain byte-identical.
for src in (B/'creatures/echo').glob('*.png'):
 out=B/'runtime'/src.relative_to(B).with_suffix('.webp');im=Image.open(src);im.save(out,'WEBP',quality=92,method=6,alpha_quality=100,exact=True);dec=Image.open(out);assert dec.size==im.size and dec.getchannel('A').tobytes()==im.getchannel('A').tobytes()
runtime=B/'runtime';m=json.loads((runtime/'manifest.json').read_text())
for entry in m['images']:
 p=B/entry['runtime'];entry['bytes']=p.stat().st_size
m['image_bytes']=sum(x['bytes'] for x in m['images']);m['revision']='3 / Echo only';m['archive_note']='_v2/ is preserved provenance, not active runtime assets';(runtime/'manifest.json').write_text(json.dumps(m,indent=2))
active=m['image_bytes']+(runtime/'manifest.json').stat().st_size
archived=sum(p.stat().st_size for p in (runtime/'_v2').rglob('*') if p.is_file());whole=sum(p.stat().st_size for p in runtime.rglob('*') if p.is_file());assert whole<8_000_000
checks=json.loads((B/'metadata/echo_v3_approved_hashes.json').read_text());assert all(hashlib.sha256((B/k).read_bytes()).hexdigest()==v for k,v in checks.items()),'Approved file changed'
# Filled silhouette areas at literal 48px, useful objective companion to visual review.
coverage={}
for n in ['moss','echo','pip','ash']:
 st='fossil' if n=='ash' else 'front';a=np.array(Image.open(B/f'creatures/{n}/{n}_{st}.png').resize((48,48),Image.Resampling.LANCZOS).getchannel('A'));coverage[n]=int((a>128).sum())
report={'approved_file_sha256_count':len(checks),'approved_files':'all byte-identical','active_runtime_bytes_including_manifest':active,'archived_runtime_bytes':archived,'entire_runtime_folder_bytes':whole,'active_webp_count':len(m['images']),'alpha_roundtrip':'exact','48px_filled_pixel_counts':coverage}
(B/'metadata/echo_v3_validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
