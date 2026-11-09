import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageChops
import colorsys, os
B='/workspace/near/feral/design/phase3/'
rng=np.random.default_rng(7)
# ---------- wax seal ----------
im=Image.open(B+'_build/wax_seal_src.jpg').convert('RGB')
a=np.asarray(im).astype(np.float32)
# whiteness distance
d=np.sqrt(((255-a)**2).sum(2))
alpha=np.clip((d-18)/30,0,1)
m=Image.fromarray((alpha*255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
rgba=im.copy(); rgba.putalpha(m)
bbox=m.point(lambda v:255 if v>40 else 0).getbbox()
rgba=rgba.crop(bbox)
w,h=rgba.size; s=max(w,h)+20
c=Image.new('RGBA',(s,s),(0,0,0,0)); c.paste(rgba,((s-w)//2,(s-h)//2)); seal=c
def recolor(img,hue_deg,sat_mul,val_mul):
    arr=np.asarray(img).astype(np.float32)/255
    rgb=arr[...,:3]; al=arr[...,3:]
    import numpy as np2
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    mx=rgb.max(2); mn=rgb.min(2); v=mx; sat=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
    # luminance-preserving tint: map luminance onto target ramp
    lum=0.3*r+0.59*g+0.11*b
    return lum
def tint(img,dark,mid,light,gamma=1.0):
    arr=np.asarray(img).astype(np.float32)/255
    lum=(0.3*arr[...,0]+0.59*arr[...,1]+0.11*arr[...,2])
    lum=(lum-lum[arr[...,3]>0.5].min())/(np.percentile(lum[arr[...,3]>0.5],99.5)-lum[arr[...,3]>0.5].min()+1e-6)
    lum=np.clip(lum,0,1)**gamma
    D,M,L=[np.array(x,np.float32)/255 for x in (dark,mid,light)]
    t=lum[...,None]
    out=np.where(t<0.5, D+(M-D)*(t/0.5), M+(L-M)*((t-0.5)/0.5))
    o=np.concatenate([out,arr[...,3:]],2)
    return Image.fromarray((o*255).clip(0,255).astype(np.uint8),'RGBA')
hx=lambda s:tuple(int(s[i:i+2],16) for i in (1,3,5))
variants={
 'amber':('#4A2408','#B9722F','#F6C88E'),   # burns
 'moss':('#1A2E0E','#557F2E','#BDEB86'),    # child vs parent bid
 'lilac':('#2E1A4A','#7E58B0','#E2C4FF'),   # pip account + life NFT
 'fossil':('#2A2C27','#6E7268','#C9CCC0'),  # ash refused
 'cream':('#5A4A2E','#C9B58A','#FFF6DC'),   # selected/cream
}
for k,(d_,m_,l_) in variants.items():
    t=tint(seal,hx(d_),hx(m_),hx(l_),0.95)
    for sz in (192,96,48):
        t.resize((sz,sz),Image.LANCZOS).save(B+f'assets/seals/seal_{k}_{sz}.png',optimize=True)
# pending = blind emboss (no wax) : relief from luminance gradient on transparent
g=np.asarray(seal.convert('L')).astype(np.float32)/255
al=np.asarray(seal)[...,3].astype(np.float32)/255
gx=np.zeros_like(g); gx[1:-1,1:-1]=(g[2:,2:]-g[:-2,:-2])
rel=np.clip(0.5+gx*2.2,0,1)
# light parts -> white highlight, dark -> ink shadow, middle transparent
hi=np.clip((rel-0.5)*2,0,1); lo=np.clip((0.5-rel)*2,0,1)
ring=al
out=np.zeros(g.shape+(4,),np.float32)
col=np.where(hi[...,None]>lo[...,None], np.array([1,1,0.96]), np.array([0.09,0.12,0.09]))
a2=np.clip(np.maximum(hi,lo)*1.6,0,1)*0.85*ring
out[...,:3]=col; out[...,3]=a2
pend=Image.fromarray((out*255).astype(np.uint8),'RGBA')
for sz in (192,96,48):
    pend.resize((sz,sz),Image.LANCZOS).save(B+f'assets/seals/seal_pending_blind_{sz}.png',optimize=True)
seal.resize((512,512),Image.LANCZOS).save(B+'assets/seals/seal_master_amber_512.png',optimize=True)
# ---------- ornaments ----------
o=Image.open(B+'_build/ink_ornaments_src.jpg').convert('L')
W,H=o.size
names=['fern_divider','root_corner','sprout','root_divider','fungus_sprig','curled_leaf']
for i,n in enumerate(names):
    cx,cy=i%3,i//3
    cell=o.crop((cx*W//3,cy*H//2,(cx+1)*W//3,(cy+1)*H//2))
    inv=ImageOps.invert(cell)
    arr=np.asarray(inv).astype(np.float32)
    arr=np.clip((arr-25)*1.35,0,255)
    m=Image.fromarray(arr.astype(np.uint8))
    bb=m.point(lambda v:255 if v>60 else 0).getbbox()
    m=m.crop((bb[0]-4,bb[1]-4,bb[2]+4,bb[3]+4))
    for tag,colr in (('ink',(22,32,24)),('bone',(237,245,233))):
        img=Image.new('RGBA',m.size,colr+(0,)); img.putalpha(m)
        img.save(B+f'assets/ornaments/{n}_{tag}.png',optimize=True)
# ---------- textures (procedural, tileable) ----------
def tile_noise(n,scales,seed):
    r=np.random.default_rng(seed); acc=np.zeros((n,n),np.float32)
    for s,amp in scales:
        k=max(2,int(n//s)); base=r.random((k,k)).astype(np.float32)
        im=Image.fromarray((base*255).astype(np.uint8)).resize((n,n),Image.BICUBIC) if False else None
        # tileable: wrap by tiling 3x and cropping center
        t=np.tile(base,(3,3)); I=Image.fromarray((t*255).astype(np.uint8)).resize((n*3,n*3),Image.BICUBIC)
        acc+=amp*(np.asarray(I).astype(np.float32)[n:2*n,n:2*n]/255-0.5)
    return acc
N=512
n=tile_noise(N,[(256,0.5),(64,0.35),(16,0.25),(4,0.18),(1.5,0.12)],1)
fib=tile_noise(N,[(2,1)],2)
# vellum paper (bone)
base=np.array(hx('#E9E4D2'),np.float32)
pap=base[None,None,:]*(1+n[...,None]*0.11+fib[...,None]*0.05)
# foxing specks
sp=rng.random((N,N))>0.9993
spk=Image.fromarray((sp*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))
spa=np.asarray(spk).astype(np.float32)/255*3
pap=pap*(1-np.clip(spa,0,0.25)[...,None]*np.array([0.2,0.3,0.45]))
Image.fromarray(pap.clip(0,255).astype(np.uint8)).save(B+'assets/textures/paper_vellum_512.png',optimize=True)
Image.fromarray(pap.clip(0,255).astype(np.uint8)).save(B+'assets/textures/paper_vellum_512.webp',quality=82)
# grain overlay (transparent, use on dark)
g=(n*0.6+fib*0.9)
ga=np.clip(np.abs(g)*1.4,0,1)*0.22
ov=np.zeros((N,N,4),np.float32); ov[...,:3]=np.where(g[...,None]>0,[237,245,233],[0,0,0]); ov[...,3]=ga*255
Image.fromarray(ov.astype(np.uint8),'RGBA').save(B+'assets/textures/grain_overlay_512.png',optimize=True)
# soil-surface panel texture (dark, opaque)
soil=np.array(hx('#17251C'),np.float32)[None,None,:]*(1+n[...,None]*0.22+fib[...,None]*0.08)
Image.fromarray(soil.clip(0,255).astype(np.uint8)).save(B+'assets/textures/soil_panel_512.png',optimize=True)
Image.fromarray(soil.clip(0,255).astype(np.uint8)).save(B+'assets/textures/soil_panel_512.webp',quality=82)
# forest page
fo=np.array(hx('#07140E'),np.float32)[None,None,:]*(1+n[...,None]*0.35)
Image.fromarray(fo.clip(0,255).astype(np.uint8)).save(B+'assets/textures/forest_page_512.webp',quality=80)
print('done')
