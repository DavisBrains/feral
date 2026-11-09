from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageFilter
import numpy as np,json,hashlib,base64
B=Path(__file__).parent
exec((B/'revise_v2.py').read_text().split('S.update({')[0])
changes={'pip_hungry':'0f36d6a53eb728d1d5d7b150831e6e0d54d1ff15bb20ad35e24ad6a1261f677e','moss_critical':'f8cd8c9e570f757f11e031750b6a78e4e3b6ce951b734ecac09232c102db3fee','ash_hungry':'ab9d8dfb2a25e3c4559a0bb9e7542ccf3febed86ff7c8110127eb691a9559f43','ash_critical':'a355e206cdbcbe36ecc48749f942534017293e4050440d16ec94520bd8a1bc70'}
S.update(changes)
# Preserve enclosed dark lilac pigment: only edge-connected chroma and near-exact backdrop are cut.
def alpha_key(im,ispip=False):
 a=np.array(im).astype(float);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
 broad=(r>75)&(b>42)&(g<r*.50)&(g<b*.68)&(r>g+55)
 conn=Image.fromarray((broad*255).astype('uint8'));ImageDraw.floodfill(conn,(0,0),128,thresh=0)
 pink=((np.array(conn)==128)|((g<10)&(r>130)&(b>50))) if ispip else broad
 mask=Image.fromarray((~pink*255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.35))
 out=im.convert('RGBA');out.putalpha(mask);return out

meta=json.loads((B/'metadata/sprites.json').read_text());meta['revision']='3 / Echo + authorized state audit';meta['frames']=[f for f in meta['frames'] if f['creature']+'_'+f['state'] not in changes]
for k in changes:
 name,state=k.split('_');im,bbox=normalize(palette(alpha_key(source(k),k=='pip_hungry'),k))
 if k=='pip_hungry':
  mini=im.resize((881,881),Image.Resampling.LANCZOS);small=Image.new('RGBA',(1024,1024));small.alpha_composite(mini,((1024-881)//2,127));im=small
 save(im,Path('masters')/(k+'_1024.png'))
 for n in [256,128]:save(im.resize((n,n),Image.Resampling.LANCZOS),Path('creatures')/name/(k+('' if n==256 else '_128')+'.png'))
 meta['frames'].append({'creature':name,'state':state,'file':f'creatures/{name}/{k}.png','foot_anchor':[128,227],'trim_rect':list(im.resize((256,256)).getbbox()),'source_crop':list(bbox),'historical_only':name=='ash'})
(B/'metadata/sprites.json').write_text(json.dumps(meta,indent=2))
original=(B/'_v1/build_assets.py').read_text();block=original.split('# One transparent horizontal static sprite sheet')[1].split('# Exact pixel tests')[0];block=block[block.index('for name in'):].replace("['moss','echo','pip','ash']","['moss','pip','ash']");exec(block)
exec(original[original.index('# Exact pixel tests'):original.index('# Color-vision-safe state sheet')])
for name in ['moss','pip','ash']:
 states=['front','hungry','critical']+(['fossil'] if name=='ash' else []);parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{1024*len(states)}" height="1200" viewBox="0 0 {1024*len(states)} 1200"><rect width="100%" height="100%" fill="#07140E"/>']
 for i,state in enumerate(states):
  dat=base64.b64encode((B/f'masters/{name}_{state}_1024.png').read_bytes()).decode();parts.append(f'<g id="{name}_{state}"><image x="{i*1024}" y="80" width="1024" height="1024" href="data:image/png;base64,{dat}"/><text x="{i*1024+100}" y="1150" font-size="36" fill="#EDF5E9" font-family="monospace">{name.upper()} / {state.upper()}</text></g>')
 parts.append('</svg>');(B/f'masters/{name}_editable.svg').write_text('\n'.join(parts))
# Only authorized state exports and corresponding sheets are replaced in runtime.
files=[p for name in ['moss','pip','ash'] for p in (B/'creatures'/name).glob('*.png') if any(p.stem==k or p.stem==k+'_128' for k in changes) or 'sprite_sheet' in p.stem]
for src in files:
 out=B/'runtime'/src.relative_to(B).with_suffix('.webp');im=Image.open(src);im.save(out,'WEBP',quality=92,method=6,alpha_quality=100,exact=True);dec=Image.open(out);assert dec.getchannel('A').tobytes()==im.getchannel('A').tobytes()
m=json.loads((B/'runtime/manifest.json').read_text())
for e in m['images']:e['bytes']=(B/e['runtime']).stat().st_size
m['image_bytes']=sum(x['bytes'] for x in m['images']);m['revision']='3 / Echo + authorized state audit';m['archive_note']='Underscore-prefixed archive folders are preserved provenance, not active assets';(B/'runtime/manifest.json').write_text(json.dumps(m,indent=2))
# Side-by-side actual-pixel mood audit; enlarged nearest-neighbor views aid inspection.
board=Image.new('RGB',(1180,980),P['forest']);d=ImageDraw.Draw(board);d.text((25,20),'MOOD AUDIT / 48px TRUE + 3x INSPECTION',font=F(24),fill=P['bone'])
for row,name in enumerate(['moss','echo','pip','ash']):
 y=95+row*215;d.text((20,y+30),name.upper(),font=F(19),fill=P.get(name,P['bone']))
 states=['front','hungry','critical']+(['fossil'] if name=='ash' else [])
 for col,st in enumerate(states):
  x=190+col*245;im=Image.open(B/f'creatures/{name}/{name}_{st}.png').resize((48,48),Image.Resampling.LANCZOS);board.paste(im,(x,y),im);big=im.resize((144,144),Image.Resampling.NEAREST);board.paste(big,(x+60,y),big);d.text((x,y+153),st.upper(),font=F(14,True),fill=P['bone'])
save(board,Path('previews/state_audit_48px.png'))
# Current-state checkerboard QA for changed masters + decoded runtime.
qa=Image.new('RGB',(1024,640),'#EDF5E9');d=ImageDraw.Draw(qa)
for i,k in enumerate(changes):
 for row,runtime in enumerate([False,True]):
  x=i*256;y=row*320
  for yy in range(0,256,16):
   for xx in range(0,256,16):d.rectangle((x+xx,y+yy,x+xx+15,y+yy+15),fill='#A7ADA4' if (xx//16+yy//16)%2 else '#DCE0D9')
  n=k.split('_')[0];p=B/(f'runtime/creatures/{n}/{k}.webp' if runtime else f'creatures/{n}/{k}.png');sp=Image.open(p).convert('RGBA');qa.paste(sp,(x,y),sp);d.text((x+5,y+268),k,font=F(13,True),fill=P['forest']);d.text((x+5,y+290),'WEBP' if runtime else 'PNG',font=F(13,True),fill=P['forest'])
save(qa,Path('previews/statefix_alpha_check.png'))
checks=json.loads((B/'metadata/statefix_protected_hashes.json').read_text());assert all(hashlib.sha256((B/k).read_bytes()).hexdigest()==v for k,v in checks.items()),'Unapproved asset changed'
runtime=B/'runtime';whole=sum(p.stat().st_size for p in runtime.rglob('*') if p.is_file());active=m['image_bytes']+(runtime/'manifest.json').stat().st_size
report={'states_changed':list(changes),'all_other_protected_files_unchanged':len(checks),'active_runtime_bytes':active,'entire_runtime_folder_including_archives_bytes':whole,'active_webp_count':len(m['images']),'alpha_roundtrip':'exact','unchanged_critical':'pip_critical','unchanged_fossil':'ash_fossil'}
(B/'metadata/statefix_validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
