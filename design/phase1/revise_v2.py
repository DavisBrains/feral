from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageFilter,features
import numpy as np,json,hashlib,base64
B=Path(__file__).parent
old=(B/'_v1/build_assets.py').read_text()
exec(old.split("meta={'phase'")[0])
# V2 source palette includes legitimate purplish husk pigments; key only low-green backdrop.
def alpha_key(im):
 a=np.array(im).astype(float);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
 narrow=(r>100)&(b>45)&(g<42)&(r>g+75)&(r>b*1.10)
 broad=(r>75)&(b>42)&(g<r*.50)&(g<b*.68)&(r>g+55)
 connected=Image.fromarray((broad*255).astype('uint8'))
 ImageDraw.floodfill(connected,(0,0),128,thresh=0)
 pink=narrow|(np.array(connected)==128)
 mask=Image.fromarray((~pink*255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.35))
 out=im.convert('RGBA');out.putalpha(mask);return out
S.update({'echo_front':'91278dcaf6b518d49cbe31c34ba51012d7ff09b049662073ce35b2a33268d77e','echo_hungry':'0e38057a9b1667eff5691ed8fd856a805a4c8f4d1456bf2451c34e177be62c59','echo_critical':'4ad8ff12689557ce64e0ac3dfbc7913481703cfdb825a450f1f599e610342d8f','pip_front':'a1b95a4c853d3e97a9d9f5a2b1da2e941dc23b01732cb605458265192a5dbbaf','pip_hungry':'5d05e3a5198b3847d0e66c0394c62c0134e4b22e48bbfb447cb132ab52d097c4','pip_critical':'8dd33f65965fb8312d2ab8a05fd64a7f691ca55d359c04df76f6d5ecab3893cc','refusal_material':'21dc3fb0ee179e961e0aa920f2825e4478d6ebc3b5011e88985a49a2373274eb'})
meta=json.loads((B/'metadata/sprites.json').read_text());meta['revision']=2;meta['frames']=[f for f in meta['frames'] if f['creature'] not in ['echo','pip']]
for name in ['echo','pip']:
 for state in ['front','hungry','critical']:
  k=name+'_'+state;im,bbox=normalize(palette(alpha_key(source(k)),k));save(im,Path('masters')/(k+'_1024.png'))
  for n in [256,128]:save(im.resize((n,n),Image.Resampling.LANCZOS),Path('creatures')/name/(k+('' if n==256 else '_128')+'.png'))
  meta['frames'].append({'creature':name,'state':state,'file':f'creatures/{name}/{k}.png','foot_anchor':[128,227],'trim_rect':list(im.resize((256,256)).getbbox()),'source_crop':list(bbox),'historical_only':False})
(B/'metadata/sprites.json').write_text(json.dumps(meta,indent=2))
# Reuse reviewed layout, only re-export revised characters, not approved ones.
block=old.split('# One transparent horizontal static sprite sheet')[1].split('# Exact pixel tests')[0]
block=block[block.index("for name in"):].replace("['moss','echo','pip','ash']","['echo','pip']")
exec(block)
exec(old[old.index('# Exact pixel tests'):old.index('# Color-vision-safe state sheet')])
# Textured worn ink impression on the generated seed-seal paper material.
im=alpha_key(source('refusal_material'))
inkmask=Image.new('L',im.size);d=ImageDraw.Draw(inkmask)
w,h=im.size
for y,word in [(.40,'SPENDING'),(.54,'REFUSED')]:d.text((round(w*.43),round(h*y)),word,font=F(round(w*.048),True),fill=255,stroke_width=1)
rng=np.random.default_rng(742)
q=np.array(inkmask).astype(float);noise=rng.random(q.shape)
# Sparse paper skips plus subtle mottled ink density; readable words stay dominant.
texture=np.array(Image.fromarray((rng.random(q.shape)*255).astype('uint8')).filter(ImageFilter.GaussianBlur(2)))/255
q*=np.clip(.73+texture*.35,0,1);q[noise<.035]*=.12
ink=Image.new('RGBA',im.size,'#17251C');ink.putalpha(Image.fromarray(q.astype('uint8')));im=Image.alpha_composite(im,ink)
bbox=im.getbbox();cropped=im.crop(bbox)
# Keep native material detail; normalized working canvas is high-res RGBA.
master=Image.new('RGBA',(1536,864));fit=ImageOps.contain(cropped,(1440,768),Image.Resampling.LANCZOS);master.alpha_composite(fit,((1536-fit.width)//2,(864-fit.height)//2))
save(master,Path('masters/refusal_stamp_1536.png'))
save(master.resize((768,432),Image.Resampling.LANCZOS),Path('masters/refusal_stamp_768.png'))
save(master.resize((384,216),Image.Resampling.LANCZOS),Path('props/refusal_stamp.png'))
# The archived clean vector remains the deliberate clean/low-cost alternative.
# Updated props board and stamp material detail preview.
props=Image.new('RGB',(1080,400),P['forest']);d=ImageDraw.Draw(props)
for label,p,x,y in [('MUNCH / UNCHANGED','props/munch_seed_coin_front.png',20,20),('FOSSIL / UNCHANGED','props/fossil_concept.png',330,90),('WORN SEED-VAULT REFUSAL','props/refusal_stamp.png',625,40)]:
 sp=Image.open(B/p);props.paste(sp,(x,y),sp);d.text((x,330),label,font=F(13,True),fill=P['bone'])
save(props,Path('previews/props_board.png'))
stampreview=Image.new('RGB',(1080,680),P['forest']);d=ImageDraw.Draw(stampreview);d.text((35,20),'REFUSAL / WORN INK + SEED SEAL',font=F(24),fill=P['bone'])
sp=Image.open(B/'masters/refusal_stamp_768.png');stampreview.paste(sp,(140,95),sp);d.text((35,590),'Exact text: SPENDING REFUSED. Confirmed extinct outcome only.',font=F(16,True),fill=P['bone']);save(stampreview,Path('previews/refusal_stamp_preview.png'))
# New text-free cast placement studies on unchanged approved backgrounds.
exec(old[old.index('# Text-free placement mockups'):old.index("(B/'metadata/sprites.json')")])
# Color-independent mood sheet now focuses on both revised creatures.
board=Image.new('RGB',(1120,850),P['forest']);d=ImageDraw.Draw(board)
d.text((30,20),'SPECIMENS / STATE IS SHAPE',font=F(28),fill=P['bone'])
for row,name in enumerate(['echo','pip']):
 d.text((25,95+row*355),name.upper(),font=F(20),fill=P[name])
 for col,state in enumerate(['front','hungry','critical']):
  sp=Image.open(B/f'creatures/{name}/{name}_{state}.png');x=180+col*300;y=75+row*355;board.paste(sp,(x,y),sp);d.text((x, y+265),state.upper(),font=F(16,True),fill=P['bone'])
d.text((30,795),'Fold / curl / crack cues support labels. Low balance never implies death.',font=F(16),fill=P['bone'])
save(board,Path('previews/color_vision_safe_states.png'));save(ImageOps.grayscale(board),Path('previews/grayscale_contrast.png'))
# Only update changed creature editable composition masters.
for name in ['echo','pip']:
 parts=['<svg xmlns="http://www.w3.org/2000/svg" width="3072" height="1200" viewBox="0 0 3072 1200"><rect width="100%" height="100%" fill="#07140E"/>']
 for i,state in enumerate(['front','hungry','critical']):
  dat=base64.b64encode((B/f'masters/{name}_{state}_1024.png').read_bytes()).decode();parts.append(f'<g id="{name}_{state}"><image x="{i*1024}" y="80" width="1024" height="1024" href="data:image/png;base64,{dat}"/><text x="{i*1024+100}" y="1150" font-size="36" fill="#EDF5E9" font-family="monospace">{name.upper()} V2 / {state.upper()}</text></g>')
 parts.append('</svg>');(B/f'masters/{name}_editable.svg').write_text('\n'.join(parts))
# Every current in-app asset, including both sprite resolutions, not any v1 archive.
assert features.check('webp')
assets=[p for n in ['moss','echo','pip','ash'] for p in (B/'creatures'/n).glob('*.png')]+list((B/'habitat').rglob('*.png'))+list((B/'props').glob('*.png'))
manifest=[]
for src in sorted(assets):
 rel=src.relative_to(B);out=B/'runtime'/rel.with_suffix('.webp');out.parent.mkdir(parents=True,exist_ok=True)
 im=Image.open(src);im.save(out,'WEBP',quality=88 if 'habitat' in rel.parts else 92,method=6,alpha_quality=100,exact=True)
 back=Image.open(out);assert back.size==im.size
 if im.mode=='RGBA':assert back.mode=='RGBA' and back.getchannel('A').tobytes()==im.getchannel('A').tobytes(),src
 manifest.append({'source':str(rel),'runtime':str(out.relative_to(B)),'bytes':out.stat().st_size,'size':list(im.size),'alpha':'lossless' if im.mode=='RGBA' else 'opaque'})
runtime=B/'runtime';total_images=sum(x['bytes'] for x in manifest)
(runtime/'manifest.json').write_text(json.dumps({'format':'WebP lossy RGB / lossless alpha','images':manifest,'image_bytes':total_images},indent=2))
whole=sum(p.stat().st_size for p in runtime.rglob('*') if p.is_file());assert whole<8_000_000
checks=json.loads((B/'metadata/keep_as_is_hashes.json').read_text());assert all(hashlib.sha256((B/k).read_bytes()).hexdigest()==v for k,v in checks.items()),'Approved asset changed!'
(B/'metadata/revision2_validation.json').write_text(json.dumps({'kept_assets_sha256':'all unchanged','webp_images':len(manifest),'runtime_image_bytes':total_images,'runtime_entire_folder_bytes':whole,'alpha_roundtrip':'all original alpha channels preserved exactly','IP_review':'visual design review only; not legal clearance'},indent=2))
print('WebP count:',len(manifest),'images:',total_images,'whole runtime bytes:',whole,'MiB:',whole/1048576)
