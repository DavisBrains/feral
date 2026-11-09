from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
B=Path(__file__).parent
font='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
f=ImageFont.truetype(font,14)
items=[p for n in ['moss','echo','pip','ash'] for p in (B/'creatures'/n).glob('*.png') if '_128' not in p.name and 'sprite_sheet' not in p.name]
items=sorted(items)
for runtime in [False,True]:
 board=Image.new('RGB',(1120,1240),'#EDF5E9');d=ImageDraw.Draw(board)
 for i,p in enumerate(items):
  x=i%4*280;y=i//4*310
  for by in range(0,256,16):
   for bx in range(0,256,16):d.rectangle((x+bx,y+by,x+bx+15,y+by+15),fill='#A7ADA4' if (bx//16+by//16)%2 else '#DCE0D9')
  actual=B/'runtime'/p.relative_to(B).with_suffix('.webp') if runtime else p
  im=Image.open(actual).convert('RGBA');board.paste(im,(x,y),im);d.text((x+5,y+270),p.stem,font=f,fill='#07140E')
 board.save(B/'previews'/('runtime_alpha_check.png' if runtime else 'alpha_quality_check.png'),optimize=True)
# Broader runtime inspection of backgrounds, leaves, props and sheets, all decoded from actual WebP.
paths=sorted((B/'runtime').rglob('*.webp'));paths=[p for p in paths if any(x in p.name for x in ['habitat','foreground','coin','fossil_concept','refusal','sprite_sheet'])]
board=Image.new('RGB',(1200,((len(paths)+2)//3)*280),'#07140E');d=ImageDraw.Draw(board)
for i,p in enumerate(paths):
 x=i%3*400;y=i//3*280;im=Image.open(p).convert('RGBA');im.thumbnail((390,235),Image.Resampling.LANCZOS);board.paste(im,(x,y),im);d.text((x+5,y+240),p.stem[:29],font=f,fill='#EDF5E9')
board.save(B/'previews/runtime_assets_check.png',optimize=True)
print('Review boards ready')
