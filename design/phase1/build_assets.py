from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageFilter
import numpy as np, colorsys, json, shutil
B=Path(__file__).parent
A=Path('/cursor/stores/user/grok-bot/agents/ca567405-813c-4a70-9376-2738ac05293e/assets')
S={
'moss_front':'6ae8b9dee2439551756b2f574c256b288c858568b1be90281556f1916316249b',
'moss_hungry':'be188781c5372e630ff82222c470e4cc425aef8d1f6006b07c225f27fe590ac3',
'moss_critical':'892f02001e514b7bab12e6481d82f789f06f70b3884ff151a825ea0a06b11adf',
'echo_front':'7c88ebe152a9e541b1127fcebbd6062ab9d248ce095df39cc80ea8413068b0c7',
'echo_hungry':'ff6ab7c1977220e60a5ee65193e1e46ef0c6ad122b08f56185c477bf2d5c17bb',
'echo_critical':'4f6a9a1aab938e398327482f7c644af6200e12f8f2ecaba126309a1f3ccf543e',
'pip_front':'286332f14ae3dcfda3c10d037bfddf42bd1f75e14cd150a83719cd73c3dd3b87',
'pip_hungry':'9e57e4cede909368c66c75128613bf2278a120e74843ad4459910587a25b5cc7',
'pip_critical':'67d7c888d40385c0139d9875c21625b3a7478484f6c57a0e6d2d290b8084f432',
'ash_front':'2983160ad338b3ca795e30a41b5044072e90838ecf6732de9a00f65894a633cf',
'ash_hungry':'96c7484a86077b44152e82b0ab91e09e3d0273ee30bc54ca4877c8629b061489',
'ash_critical':'3922a7f23a7e63dc8bfc74b03d3e47520a518ed70e6e7835f420105d32119751',
'ash_fossil':'cc5011ae4d6712fcba14aacb55553c688ca6b0ab24540848f44ee985869e0cf0',
'munch_coin':'22c92b6a6c1d08d75c32957fb7eeb06a8de0331f946543e4488151b5c010c708',
'habitat_desktop':'bbaa7fb9162876fe49da7a7a78fd43652586f523341f3b1608fe90c5dbe6f5cc',
'habitat_mobile':'6bafbd5ca331f0c72c95beaa46971fad8d45b64d877f023379afdd611528e1a9',
'foreground_leaves':'788ec743ada20a1f51fc230cfb6b161c97b703de47b20d81e8048f8b0d98a1fd'}
P={'forest':'#07140E','soil':'#17251C','bone':'#EDF5E9','moss':'#B5FC71','moss_shadow':'#6E9B46','echo':'#7DD9EF','echo_shadow':'#356B80','ash':'#D39767','fossil':'#777C70','pip':'#D4A4FF','pip_shadow':'#7653A4','amber':'#F3BF88'}
for d in ['sources','masters','creatures','habitat/layers','props','previews','metadata']: (B/d).mkdir(parents=True,exist_ok=True)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
mono='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
def F(n,mon=False): return ImageFont.truetype(mono if mon else font,n)
def save(im,path):
 path=B/path;path.parent.mkdir(parents=True,exist_ok=True);im.save(path,optimize=True)
def source(k):
 p=A/(S[k]+'.jpg'); p=p if p.exists() else B/'sources'/(k+'_source.png'); im=Image.open(p).convert('RGB');save(im,Path('sources')/(k+'_source.png'));return im

def alpha_key(im):
 a=np.array(im).astype(float);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
 # Generated magenta is generally #ec008c, not literal #ff00ff.
 pink=(r>75)&(b>42)&(g<r*.50)&(g<b*.68)&(r>g+55)
 mask=Image.fromarray((~pink*255).astype('uint8'))
 # Remove one pixel of jpeg chroma ringing, and antialias the cutout edge.
 mask=mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.45))
 out=im.convert('RGBA');out.putalpha(mask)
 # Suppress residual pink edge chroma only in partially transparent pixels.
 q=np.array(out);edge=(q[:,:,3]>0)&(q[:,:,3]<245)&(q[:,:,0]>q[:,:,1]*1.8)&(q[:,:,2]>q[:,:,1]*1.6)
 q[edge,:3]=np.minimum(q[edge,:3],np.maximum(q[edge,1:2],25))
 return Image.fromarray(q)

def palette(im,k):
 name,state=k.split('_',1)
 if state in ['critical','fossil']: return im
 hsv=np.array(im.convert('RGB').convert('HSV')).copy();h,s,v=hsv[:,:,0],hsv[:,:,1],hsv[:,:,2]
 bounds={'moss':(25,80),'echo':(110,155),'ash':(8,35),'pip':(165,220)}
 lo,hi=bounds[name];sel=(h>=lo)&(h<=hi)&(s>40)&(np.array(im)[:,:,3]>220)
 tr=tuple(int(P[name][j:j+2],16)/255 for j in (1,3,5));th,ts,tv=colorsys.rgb_to_hsv(*tr)
 hsv[:,:,0][sel]=int(th*255)
 hsv[:,:,1][sel]=np.clip(ts*255*(.65+.5*s[sel]/255),0,255).astype('uint8')
 rgb=Image.fromarray(hsv,'HSV').convert('RGB').convert('RGBA');rgb.putalpha(im.getchannel('A'));return rgb

def normalize(im,extent=840,baseline=908):
 bbox=im.getchannel('A').getbbox();crop=im.crop(bbox);w,h=crop.size
 scale=min(extent/w,780/h);crop=crop.resize((round(w*scale),round(h*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(1024,1024));out.alpha_composite(crop,((1024-crop.width)//2,baseline-crop.height));return out,bbox

meta={'phase':'look-development only; no animation','frame_size':[256,256],'foot_anchor':[128,227],'frame_rate':0,'palette':P,'frames':[]}
for k in S:
 if not k.split('_')[0] in ['moss','echo','pip','ash']: continue
 name,state=k.split('_',1);im,bbox=normalize(palette(alpha_key(source(k)),k))
 save(im,Path('masters')/(k+'_1024.png'))
 for n in [256,128]:
  exp=im.resize((n,n),Image.Resampling.LANCZOS);p=Path('creatures')/name/(k+('' if n==256 else '_128')+'.png');save(exp,p)
 meta['frames'].append({'creature':name,'state':state,'file':str(Path('creatures')/name/(k+'.png')),'foot_anchor':[128,227],'trim_rect':list(im.resize((256,256)).getbbox()),'source_crop':list(bbox),'historical_only':name=='ash' and state!='fossil'})
# One transparent horizontal static sprite sheet per creature and labeled review sheet.
for name in ['moss','echo','pip','ash']:
 states=['front','hungry','critical']+(['fossil'] if name=='ash' else [])
 strip=Image.new('RGBA',(256*len(states),256))
 sheet=Image.new('RGB',(320*len(states),470),P['forest']);d=ImageDraw.Draw(sheet)
 d.text((30,22),name.upper(),font=F(28),fill=P.get(name,P['bone']))
 d.text((30,66),'BOTANICAL RELIQUARY / PHASE 1',font=F(14,True),fill=P['bone'])
 for i,state in enumerate(states):
  im=Image.open(B/f'creatures/{name}/{name}_{state}.png');strip.alpha_composite(im,(256*i,0));sheet.paste(im,(320*i+32,105),im)
  d.text((320*i+32,380),state.upper(),font=F(17,True),fill=P['bone'])
  desc={'front':'HISTORICAL ALIVE' if name=='ash' else ('ABUNDANT / 180+' if name=='moss' else 'STEADY / 60–179'),'hungry':'HUNGRY / 20–59','critical':'CRITICAL / <20 / ALIVE','fossil':'EXTINCT / 5 FROZEN'}[state]
  d.text((320*i+32,415),desc,font=F(11,True),fill=P['bone'])
 save(strip,Path('creatures')/name/(name+'_sprite_sheet.png'));save(sheet,Path('previews')/(name+'_sheet.png'))
# Exact pixel tests, no rescaling in the strip itself.
for n in [48,96]:
 for sil in [False,True]:
  strip=Image.new('RGB',(n*4,n),P['forest'])
  for i,name in enumerate(['moss','echo','pip','ash']):
   state='fossil' if name=='ash' else 'front';im=Image.open(B/f'creatures/{name}/{name}_{state}.png').resize((n,n),Image.Resampling.LANCZOS)
   if sil:
    flat=Image.new('RGBA',im.size,P['bone']);flat.putalpha(im.getchannel('A'));im=flat
   strip.paste(im,(i*n,0),im)
  save(strip,Path('previews')/(f'{"silhouette" if sil else "readability"}_{n}px.png'))
board=Image.new('RGB',(1000,530),P['forest']);d=ImageDraw.Draw(board)
d.text((30,25),'FOUR JOBS. FOUR SILHOUETTES.',font=F(27),fill=P['bone'])
d.text((30,70),'MOSS       ECHO       PIP        ASH / EXTINCT',font=F(17,True),fill=P['bone'])
for j,(n,sil) in enumerate([(48,False),(48,True),(96,False),(96,True)]):
 k=f'{"silhouette" if sil else "readability"}_{n}px.png';im=Image.open(B/'previews'/k);y=115+j*94
 d.text((30,y+10),f'{n}px '+('silhouette' if sil else 'color'),font=F(16,True),fill=P['bone']);board.paste(im,(300,y))
save(board,Path('previews/readability_board.png'))
# Color-vision-safe state sheet relies on posture, cracks and labels, not hue.
canvas=Image.new('RGB',(1120,530),P['forest']);d=ImageDraw.Draw(canvas)
d.text((28,18),'STATE IS SHAPE, NOT ONLY COLOR',font=F(26),fill=P['bone'])
for col,st in enumerate(['front','hungry','critical','fossil']):
 im=Image.open(B/f'creatures/ash/ash_{st}.png');canvas.paste(im,(24+col*274,95),im)
 d.text((24+col*274,380),st.upper(),font=F(18,True),fill=P['bone'])
d.text((28,440),'Closed stone eyes + sealed tokens = extinct. Critical eyes remain open.',font=F(17),fill=P['bone'])
d.text((28,480),'Living Ash poses are historical only; current Ash stays fossilized with 5 frozen.',font=F(14),fill=P['bone'])
save(canvas,Path('previews/color_vision_safe_states.png'));save(ImageOps.grayscale(canvas),Path('previews/grayscale_contrast.png'))
# Habitat, aspect preserving crops only. Native generated source is retained.
for key,size in [('habitat_desktop',(1600,1000)),('habitat_mobile',(800,1100))]:
 im=source(key);out=ImageOps.fit(im,size,Image.Resampling.LANCZOS,centering=(.5,.5));save(out,Path('habitat')/(key+'.png'))
leaves=alpha_key(source('foreground_leaves'))
# Preserve composition using uniform contain, not stretch, to exact desktop canvas.
layer=Image.new('RGBA',(1600,1000));contained=ImageOps.contain(leaves,(1600,1000),Image.Resampling.LANCZOS);layer.alpha_composite(contained,((1600-contained.width)//2,1000-contained.height));save(layer,Path('habitat/layers/foreground_leaves.png'))
coin,_=normalize(alpha_key(source('munch_coin')),extent=760);save(coin,Path('masters/munch_coin_1024.png'));save(coin.resize((256,256),Image.Resampling.LANCZOS),Path('props/munch_seed_coin_front.png'))
fossil=Image.open(B/'masters/ash_fossil_1024.png');save(fossil.resize((128,128),Image.Resampling.LANCZOS),Path('props/fossil_concept.png'))
# Editable refusal-stamp vector, exact typographic text rather than generated lettering.
svg='''<svg xmlns="http://www.w3.org/2000/svg" width="768" height="256" viewBox="0 0 768 256"><g fill="none" stroke="#F3BF88" stroke-linecap="round" stroke-linejoin="round"><path d="M30 24 L730 28 L740 223 L28 230 Z" stroke-width="7"/><path d="M42 41 L719 44 L722 208 L45 213 Z" stroke-width="2"/><path d="M108 63 C43 124 71 174 108 187 C154 169 165 124 108 63 Z" stroke-width="5"/><path d="M91 96 L121 118 L101 140 L125 162" stroke-width="5"/></g><text x="187" y="116" font-family="DejaVu Sans Mono,monospace" font-size="49" font-weight="bold" fill="#F3BF88">SPENDING</text><text x="187" y="176" font-family="DejaVu Sans Mono,monospace" font-size="49" font-weight="bold" fill="#F3BF88">REFUSED</text></svg>'''
(B/'masters/refusal_stamp.svg').write_text(svg)
stamp=Image.new('RGBA',(768,256));d=ImageDraw.Draw(stamp);amber=P['amber'];d.line([(30,24),(730,28),(740,223),(28,230),(30,24)],fill=amber,width=7);d.line([(42,41),(719,44),(722,208),(45,213),(42,41)],fill=amber,width=2);d.polygon([(108,63),(69,112),(75,155),(108,187),(145,154),(155,118)],outline=amber,width=5);d.line([(91,96),(121,118),(101,140),(125,162)],fill=amber,width=5)
d.text((187,67),'SPENDING',font=F(49,True),fill=amber);d.text((187,127),'REFUSED',font=F(49,True),fill=amber);save(stamp,Path('masters/refusal_stamp_768.png'));save(stamp.resize((384,128),Image.Resampling.LANCZOS),Path('props/refusal_stamp.png'))
props=Image.new('RGB',(1000,350),P['forest']);d=ImageDraw.Draw(props)
for k,p,x,y in [('MUNCH','props/munch_seed_coin_front.png',20,20),('FOSSIL','props/fossil_concept.png',335,80),('SPENDING REFUSED','props/refusal_stamp.png',590,90)]:
 im=Image.open(B/p);props.paste(im,(x,y),im);d.text((x,290),k,font=F(15,True),fill=P['bone'])
save(props,Path('previews/props_board.png'))
# Text-free placement mockups, never substitutes for app proof UI.
for key,positions in [('desktop',[('moss','front',250,360,250),('echo','front',680,340,215),('pip','front',1100,390,190),('ash','fossil',630,720,220)]),('mobile',[('moss','front',90,430,180),('echo','front',350,420,170),('pip','front',560,560,150),('ash','fossil',270,810,180)])]:
 im=Image.open(B/f'habitat/habitat_{key}.png').convert('RGBA')
 for name,st,x,y,s in positions:
  sp=Image.open(B/f'creatures/{name}/{name}_{st}.png').resize((s,s),Image.Resampling.LANCZOS);im.alpha_composite(sp,(x,y))
 save(im,Path('previews')/f'habitat_{key}_cast_mockup.png')
(B/'metadata/sprites.json').write_text(json.dumps(meta,indent=2))
print('Built',len(list(B.rglob('*.png'))),'PNG files')
