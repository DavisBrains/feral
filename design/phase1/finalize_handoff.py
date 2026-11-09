from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import base64,json
B=Path(__file__).parent
# Fully portable editable document: each mood is a distinct embedded raster layer.
for name in ['moss','echo','pip','ash']:
 states=['front','hungry','critical']+(['fossil'] if name=='ash' else [])
 parts=[f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="{1024*len(states)}" height="1200" viewBox="0 0 {1024*len(states)} 1200">',f'<rect width="100%" height="100%" fill="#07140E"/>']
 for i,state in enumerate(states):
  dat=base64.b64encode((B/f'masters/{name}_{state}_1024.png').read_bytes()).decode()
  parts.append(f'<g id="{name}_{state}"><image x="{i*1024}" y="80" width="1024" height="1024" href="data:image/png;base64,{dat}"/><text x="{i*1024+100}" y="1150" font-size="36" fill="#EDF5E9" font-family="monospace">{name.upper()} / {state.upper()}</text></g>')
 parts.append('</svg>');(B/f'masters/{name}_editable.svg').write_text('\n'.join(parts))
# Alpha review board puts every 256px state against an actual checkerboard.
items=sorted((B/'creatures').glob('*/*png'));items=[p for p in items if '_128' not in p.name and 'sprite_sheet' not in p.name]
board=Image.new('RGB',(1120,4*310),'#EDF5E9');d=ImageDraw.Draw(board);f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',13)
for i,p in enumerate(items):
 x=(i%4)*280;y=(i//4)*310
 for by in range(0,256,16):
  for bx in range(0,256,16):
   d.rectangle((x+bx,y+by,x+bx+15,y+by+15),fill='#A7ADA4' if (bx//16+by//16)%2 else '#DCE0D9')
 im=Image.open(p);board.paste(im,(x,y),im);d.text((x+5,y+270),p.stem,font=f,fill='#07140E')
board.save(B/'previews/alpha_quality_check.png',optimize=True)
# Programmatic dimensions/alpha/padding verification, complementing visual checks.
results=[]
for p in sorted((B/'creatures').glob('*/*.png')):
 im=Image.open(p);a=im.getchannel('A');assert a.getextrema()==(0,255),p
 if 'sprite_sheet' not in p.name:
  size=128 if '_128' in p.name else 256;assert im.size==(size,size),p
  assert all(a.getpixel(pt)==0 for pt in [(0,0),(size-1,0),(0,size-1),(size-1,size-1)])
 results.append({'file':str(p.relative_to(B)),'size':list(im.size),'mode':im.mode,'alpha_bbox':list(a.getbbox())})
for key,size in [('desktop',(1600,1000)),('mobile',(800,1100))]:
 im=Image.open(B/f'habitat/habitat_{key}.png');assert im.size==size
for p in (B/'masters').glob('*_1024.png'):assert Image.open(p).size==(1024,1024)
(B/'metadata/validation.json').write_text(json.dumps({'result':'passed dimensions, alpha extrema, transparent corner padding; visual review separate','assets':results},indent=2))
# Self-including, full absolute inventory and README table.
for name in ['FILES.txt','metadata/file_manifest.json']:(B/name).touch(exist_ok=True)
files=sorted(p for p in B.rglob('*') if p.is_file())
(B/'FILES.txt').write_text('\n'.join(str(p) for p in files)+'\n')
(B/'metadata/file_manifest.json').write_text(json.dumps([{'path':str(p),'relative':str(p.relative_to(B)),'bytes':p.stat().st_size} for p in files],indent=2))
readme=B/'README.md';text=readme.read_text();text=text.split('\n<!-- INVENTORY -->')[0]
text+='\n<!-- INVENTORY -->\n'+ '\n'.join('- `'+str(p.relative_to(B))+'`' for p in files)+'\n';readme.write_text(text)
print(f'{len(files)} files; {sum(p.stat().st_size for p in files)/1024/1024:.1f} MB archival package')
