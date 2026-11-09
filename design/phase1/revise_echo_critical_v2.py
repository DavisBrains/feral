from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageFilter
import numpy as np,json,hashlib,base64,re
B=Path(__file__).parent
old=(B/'_v1/build_assets.py').read_text()
exec(old.split("meta={'phase'")[0])
raw=Image.open('/cursor/stores/user/grok-bot/agents/ca567405-813c-4a70-9376-2738ac05293e/assets/33168991ceab485a294c71499e107e30c936096348a9a8a7431c6200e0a27dca.jpg').convert('RGB')
save(raw,Path('sources/echo_critical_source.png'))
im,bbox=normalize(alpha_key(raw))
# Art-directed low squash emphasizes buckled, ground-hugging stance.
crop=im.crop(im.getbbox());crop=crop.resize((crop.width,round(crop.height*.82)),Image.Resampling.LANCZOS);im=Image.new('RGBA',(1024,1024));im.alpha_composite(crop,((1024-crop.width)//2,908-crop.height))
save(im,Path('masters/echo_critical_1024.png'))
for n in [256,128]:save(im.resize((n,n),Image.Resampling.LANCZOS),Path('creatures/echo')/('echo_critical'+('' if n==256 else '_128')+'.png'))
# Replace critical frame only in static atlas and review sheet, preserving other cells.
strip=Image.open(B/'creatures/echo/echo_sprite_sheet.png').convert('RGBA');strip.paste(Image.open(B/'creatures/echo/echo_critical.png'),(512,0));save(strip,Path('creatures/echo/echo_sprite_sheet.png'))
sheet=Image.open(B/'previews/echo_sheet.png');d=ImageDraw.Draw(sheet);d.rectangle((672,105,927,360),fill=P['forest']);sp=Image.open(B/'creatures/echo/echo_critical.png');sheet.paste(sp,(672,105),sp);save(sheet,Path('previews/echo_sheet.png'))
# Embedded raster composition master: only its critical image changes.
p=B/'masters/echo_editable.svg';text=p.read_text();dat=base64.b64encode((B/'masters/echo_critical_1024.png').read_bytes()).decode();text=re.sub(r'(<g id="echo_critical"><image[^>]*href="data:image/png;base64,)[^"]+',lambda m:m[1]+dat,text);p.write_text(text)
meta=json.loads((B/'metadata/sprites.json').read_text())
for f in meta['frames']:
 if f['creature']=='echo' and f['state']=='critical':f.update(trim_rect=list(im.resize((256,256)).getbbox()),source_crop=list(bbox),revision='critical v2 / slumped gourd')
(B/'metadata/sprites.json').write_text(json.dumps(meta,indent=2))
# Three critical-containing runtime images only. RGB lossy; exact alpha.
for stem in ['echo_critical','echo_critical_128','echo_sprite_sheet']:
 src=B/f'creatures/echo/{stem}.png';out=B/f'runtime/creatures/echo/{stem}.webp';a=Image.open(src);a.save(out,'WEBP',quality=92,method=6,alpha_quality=100,exact=True);dec=Image.open(out);assert a.size==dec.size and a.getchannel('A').tobytes()==dec.getchannel('A').tobytes()
m=json.loads((B/'runtime/manifest.json').read_text())
for e in m['images']:
 if e['source'].startswith('creatures/echo/') and any(e['source'].endswith('/'+s+'.png') for s in ['echo_critical','echo_critical_128','echo_sprite_sheet']):e['bytes']=(B/e['runtime']).stat().st_size
m['image_bytes']=sum(e['bytes'] for e in m['images']);m['revision']='3.1 / Echo critical slumped v2';(B/'runtime/manifest.json').write_text(json.dumps(m,indent=2))
# Current all-state audit; no creature files other than Echo critical are written.
audit=(B/'statefix_v3.py').read_text();exec(audit[audit.index('# Side-by-side actual-pixel'):audit.index('# Current-state checkerboard')])
# Add Echo front/hungry/critical second row to literal-size readability/silhouette strips.
for n in [48,96]:
 for sil in [False,True]:
  p=Path('previews')/f'{"silhouette" if sil else "readability"}_{n}px.png';top=Image.open(B/p);new=Image.new('RGB',(n*4,n*2),P['forest']);new.paste(top.crop((0,0,n*4,n)),(0,0))
  for i,st in enumerate(['front','hungry','critical']):
   sp=Image.open(B/f'creatures/echo/echo_{st}.png').resize((n,n),Image.Resampling.LANCZOS)
   if sil:flat=Image.new('RGBA',sp.size,P['bone']);flat.putalpha(sp.getchannel('A'));sp=flat
   new.paste(sp,(i*n,n),sp)
  save(new,p)
base=Image.open(B/'previews/readability_board.png');board=Image.new('RGB',(1000,860),P['forest']);board.paste(base.crop((0,0,1000,530)),(0,0));d=ImageDraw.Draw(board);d.text((30,540),'ECHO / FRONT > HUNGRY > CRITICAL',font=F(22),fill=P['echo'])
for col,st in enumerate(['front','hungry','critical']):
 x=220+col*250;d.text((x,580),st.upper(),font=F(15,True),fill=P['bone'])
 for n,y in [(48,615),(96,690)]:
  sp=Image.open(B/f'creatures/echo/echo_{st}.png').resize((n,n),Image.Resampling.LANCZOS);board.paste(sp,(x,y),sp)
  flat=Image.new('RGBA',sp.size,P['bone']);flat.putalpha(sp.getchannel('A'));board.paste(flat,(x+110,y),flat)
d.text((30,802),'Critical: low/wide chamber + buckled roots; hungry: upright chamber.',font=F(16),fill=P['bone']);save(board,Path('previews/readability_board.png'))
# Keep derived state-accessibility boards synchronized; no unrelated preview changes.
state=Image.open(B/'previews/state_audit_48px.png');save(state,Path('previews/color_vision_safe_states.png'));save(ImageOps.grayscale(state),Path('previews/grayscale_contrast.png'))
# Patch only critical cell on both alpha boards.
items=sorted(p for n in ['moss','echo','pip','ash'] for p in (B/'creatures'/n).glob('*.png') if '_128' not in p.name and 'sprite_sheet' not in p.name);i=items.index(B/'creatures/echo/echo_critical.png');x=i%4*280;y=i//4*310
for runtime in [False,True]:
 p=Path('previews')/('runtime_alpha_check.png' if runtime else 'alpha_quality_check.png');board=Image.open(B/p);d=ImageDraw.Draw(board)
 for yy in range(0,256,16):
  for xx in range(0,256,16):d.rectangle((x+xx,y+yy,x+xx+15,y+yy+15),fill='#A7ADA4' if (xx//16+yy//16)%2 else '#DCE0D9')
 sp=Image.open(B/('runtime/creatures/echo/echo_critical.webp' if runtime else 'creatures/echo/echo_critical.png')).convert('RGBA');board.paste(sp,(x,y),sp);save(board,p)
paths=sorted((B/'runtime').rglob('*.webp'));paths=[p for p in paths if any(x in p.name for x in ['habitat','foreground','coin','fossil_concept','refusal','sprite_sheet'])];i=paths.index(B/'runtime/creatures/echo/echo_sprite_sheet.webp');x=i%3*400;y=i//3*280;board=Image.open(B/'previews/runtime_assets_check.png');d=ImageDraw.Draw(board);d.rectangle((x,y,x+399,y+234),fill=P['forest']);sp=Image.open(paths[i]).convert('RGBA');sp.thumbnail((390,235),Image.Resampling.LANCZOS);board.paste(sp,(x,y),sp);save(board,Path('previews/runtime_assets_check.png'))
# Every other pre-existing file, including cast mockups and prior archives, must be byte-identical.
A=B/'_pre_echo_critical_v2';before=json.loads((A/'before_sha256.json').read_text());allowed=set(json.loads((A/'authorized_replacements.json').read_text()));protected={k:v for k,v in before.items() if k not in allowed};assert all(hashlib.sha256((B/k).read_bytes()).hexdigest()==v for k,v in protected.items())
active=m['image_bytes']+(B/'runtime/manifest.json').stat().st_size;whole=sum(p.stat().st_size for p in (B/'runtime').rglob('*') if p.is_file());report={'changed_state':'echo_critical only','protected_preexisting_files_byte_identical':len(protected),'active_runtime_bytes_including_manifest':active,'entire_runtime_folder_bytes_including_archives':whole,'active_webp_count':len(m['images']),'alpha_roundtrip':'exact','archive':'_pre_echo_critical_v2/','critical_alpha_bbox_256':list(Image.open(B/'creatures/echo/echo_critical.png').getbbox()),'hungry_alpha_bbox_256':list(Image.open(B/'creatures/echo/echo_hungry.png').getbbox())};assert whole<8_000_000
(B/'metadata/echo_critical_v2_validation.json').write_text(json.dumps(report,indent=2))
# Preserve history while making latest state and totals explicit.
p=B/'README.md';text=(A/'README.md').read_text();text=text.replace('Phase 1, revision 3','Phase 1, revision 3.1');text=text.replace('critical adds dry cracks and muted cyan','critical v2 now collapses the chamber into a broad low slump with buckled/splayed roots, larger cracks and dim eye-slits');text=re.sub(r'Active runtime:.*?Both totals are below 8MB\.',f'Active runtime: **{active:,} bytes**, including manifest ({active/1e6:.3f} MB), **36 WebP images**. Entire `runtime/` folder INCLUDING preserved version archives: **{whole:,} bytes** ({whole/1e6:.3f} MB). Both totals are below 8MB.',text,flags=re.S)
header=f'''\n## Latest focused correction — Echo critical v2\nOnly Echo critical artwork changed: cracked, low/wide sagging gourd, collapsed stance, buckled/splayed root legs and heavy desaturation. Hungry remains upright and is byte-identical, as are all other creature states, props, habitat and both cast mockups. The critical preview, atlas, raster/SVG composition masters, runtime images, state audit/readability and alpha boards are synchronized. Previous files were copied before replacement to `_pre_echo_critical_v2/` with mirrored paths; its runtime copies live OUTSIDE the active runtime folder.\n\nLatest SHA-256 report: `metadata/echo_critical_v2_validation.json`; **{len(protected)} other pre-existing files unchanged**. Earlier validation reports below are historical checkpoints. The 48/96px strips now have a second row showing Echo front, hungry and critical; the labeled readability board identifies those states.\n'''
text=text.replace('\n## Latest changes and audit',header+'\n## Latest changes and audit');p.write_text(text)
# Inventory includes new archive/report/script and updates itself without changing unrelated files.
files=sorted(p for p in B.rglob('*') if p.is_file());(B/'FILES.txt').write_text('\n'.join(str(p) for p in files)+'\n');(B/'metadata/file_manifest.json').write_text(json.dumps([{'path':str(p),'bytes':p.stat().st_size} for p in files],indent=2))
assert all(hashlib.sha256((B/k).read_bytes()).hexdigest()==v for k,v in protected.items())
print(json.dumps(report,indent=2))
