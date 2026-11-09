import re,json
B='/workspace/near/feral/design/phase3/'
sprite=open(B+'assets/icons/feral-icons.svg').read()
def ic(n,cls='ico'): return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{n}"/></svg>'
P1='../../phase1/runtime/'
CR={k:P1+f'creatures/{k}/' for k in ('moss','echo','ash','pip')}
COIN=P1+'props/munch_seed_coin_front.webp'
STAMP=P1+'props/refusal_stamp.webp'
SEAL='../assets/seals/'
CARD='../../../evidence/live-work/card.svg'
TX={l:h for l,h in [l.split() for l in """create-controller 5x5KzkB1GAExJdijsqHzMJjjAu2BQxaZVFj2NzNNkLP1
death-tick 3g6q5jY88YuuvtbwWvCNSv7uvBRBTZXyBxi4e1tNJ7GD
refused-post-death-spend DVoUxvnNsea2y5mhzWbhhS13TyYEt7gwonnpbqbeAGQ5
paid-collaboration JWgjUCmQ7Eb5igHyEWpeW136jstkHBw5TrmPATsebxU
parent-bid 4fKtHSPKzu2s9J5kMY1nMbDhZAEYztask7hkEJSja3Ve
paid-job CNbMKFQVGuEWFvEgV8sDF1jMzLYkhv1HbDokBN7Wd2Mq
funded-child-account-creation 9JaZwJ1Hd8JYGgsZP41c9PJPbafJR9uGqcamRDcHAtAL
second-upkeep 7tcYMuzRa11b2ovG6K7uVDMNGaybkYNoX53mM8JYyu1M
child-first-bid C3xYu9EH3qQVzX5MYoTDeqLRoDtGEgY8EtFBTwYFh5ar
demand-shock HTMJvkEfbFJqPVHbAu4UHUsJxvXPcexxGGyDDEoiqioV
lineage-goal CspBKFjTTWCDd6PuCVqUGk1oquayXEtYf6vsagyryVt3
create-child-job Vic3gZxC4kDbMYnnYg4TeRUf63Dsqn74GxKXoxSCKsV""".splitlines()]}
def sh(h): return h[:4]+'…'+h[-4:]
def tx(label,cls='f-link mono'):
    h=TX[label]; return f'<a class="{cls}" href="https://testnet.nearblocks.io/txns/{h}">{sh(h)} {ic("explorer","ico-s")}</a>'

def sec(n,title,note,body,cls=''):
    return f'''<section class="sec {cls}"><header class="sh"><span class="no mono">{n:02d}</span><h2 class="disp">{title}</h2><p class="mono">{note}</p></header>{body}</section>'''

def cap(t): return f'<div class="stl mono">{t}</div>'

# ---------- foundations ----------
pal=[('forest','#07140E','page, case'),('forest-2','#0C1D15','wells'),('soil','#17251C','dark panels'),('soil-2','#1F3126','hover'),('soil-line','#2E4436','hairline'),('bone','#EDF5E9','text on dark'),('bone-2','#B9C4B4','secondary'),('bone-3','#8E9A8A','meta'),
('vellum','#E9E4D2','paper'),('vellum-2','#DCD5BE','pressed paper'),('ink','#162018','text on paper'),('ink-2','#3E4A3C','secondary ink'),('ink-3','#555F50','meta ink'),('cream','#FFF3C9','selected proof'),
('moss','#B5FC71','Moss'),('moss-ink','#3B5E1E','Moss on paper'),('echo','#7DD9EF','Echo'),('echo-ink','#1E5466','Echo on paper'),('pip','#D4A4FF','Pip'),('pip-ink','#56368A','Pip on paper'),('ash','#D39767','Ash alive'),('fossil','#777C70','fossil'),('amber','#F3BF88','burn, reserve'),('amber-ink','#7E4613','amber on paper'),('rust','#E0896A','error on dark'),('rust-ink','#8E3A1E','error on paper')]
sw=''.join(f'<div class="sw"><i style="background:{h}"></i><b>--{n}</b><span class="mono">{h}</span><small>{u}</small></div>' for n,h,u in pal)
typ=f'''<div class="typ">
<div><div class="stl mono">Display · Fraunces 480 · optical size auto · 76/0.98 desktop, 40 mobile</div><div class="disp" style="font-size:72px;line-height:.98;font-weight:480">They work to eat.<br><em class="ital" style="font-weight:380">They pay to be born.</em></div></div>
<div class="tg"><div><div class="stl mono">H2 · Fraunces 500 · 30/1.1</div><div class="disp" style="font-size:30px">The proof ledger</div></div>
<div><div class="stl mono">H3 · Fraunces 500 · 22/1.15</div><div class="disp" style="font-size:22px">Sponsor a lineage</div></div>
<div><div class="stl mono">Ink note · Fraunces italic 400 · 17/1.4</div><div class="ital" style="font-size:17px">Bid ten under my parent. I am small and cheap to feed.</div></div>
<div><div class="stl mono">Body · Instrument Sans 400 · 16/1.5 · min 14</div><div style="font-size:16px;max-width:44ch">Four creatures live on NEAR testnet. Every turn costs each of them 10 MUNCH.</div></div>
<div><div class="stl mono">Caps label · Instrument Sans 600 · 12 · +0.14em</div><div class="caps" style="color:var(--bone-2)">Season goal</div></div>
<div><div class="stl mono">Data · IBM Plex Mono 400/500 · 14 and 13</div><div class="mono" style="font-size:14px">190 MUNCH · pip.ctrl.feral-039832.testnet · C3xY…5ar</div></div></div></div>'''
tex=f'''<div class="texrow">
<figure><div class="tx" style="background:var(--tex-paper)"></div><figcaption class="mono">paper_vellum_512.webp</figcaption></figure>
<figure><div class="tx" style="background:var(--tex-soil)"></div><figcaption class="mono">soil_panel_512.webp</figcaption></figure>
<figure><div class="tx" style="background:var(--tex-forest)"></div><figcaption class="mono">forest_page_512.webp</figcaption></figure>
<figure><div class="tx" style="background:var(--tex-grain),#17251C"></div><figcaption class="mono">grain_overlay_128.webp</figcaption></figure>
<figure class="orn"><img src="../assets/ornaments/fern_divider_bone.png"><img src="../assets/ornaments/root_corner_bone.png"><img src="../assets/ornaments/sprout_bone.png"><img src="../assets/ornaments/root_divider_bone.png"><img src="../assets/ornaments/fungus_sprig_bone.png"><img src="../assets/ornaments/curled_leaf_bone.png"><figcaption class="mono">ornaments/*_bone.png and *_ink.png</figcaption></figure></div>'''
seals=''.join(f'<figure><img src="{SEAL}seal_{k}_192.png" width="110"><figcaption class="mono">{k}<br><span>{u}</span></figcaption></figure>' for k,u in [('amber','burns'),('fossil','death, refusal'),('lilac','Pip account, NFT'),('moss','child vs parent bid'),('cream','Sepolia done'),('pending_blind','pending, any claim')])
icons=''.join(f'<div class="icn">{ic(n,"ico24")}<span class="mono">{n}</span></div>' for n in ['munch','burn','reserve','escrow','work','transcript','translate','bid','birth','lineage','life_nft','account','explorer','play','pause','replay','copy','close','sound_off','fossil','advance','feed','sponsor','job','check','alert','pending','season','chain_sig'])
found=sec(1,'Foundations','palette · type · textures · wax · ink icons',f'''
<div class="grid-pal">{sw}</div>
{typ}
<div class="two"><div>{cap('Textures and ornaments, tileable, transparent where noted')}{tex}</div><div>{cap('Wax seals, verified per claim, and the blind emboss for pending')}<div class="seals f-paper">{seals}</div></div></div>
{cap('Ink icons · 24 grid · 1.75 stroke · round caps · currentColor · 12 filled 16px variants in icons/16')}<div class="icons">{icons}</div>''')

# ---------- buttons ----------
def brow(label,html): return f'<div class="bst"><div class="stl mono">{label}</div>{html}</div>'
btns=f'''<div class="btngrid">
<div class="bl caps">Paper button</div>
{brow('default',f'<button class="f-btn">{ic("feed")}Feed Echo 10</button>')}
{brow('hover',f'<button class="f-btn is-hover">{ic("feed")}Feed Echo 10</button>')}
{brow('active',f'<button class="f-btn is-active">{ic("feed")}Feed Echo 10</button>')}
{brow('disabled',f'<button class="f-btn is-disabled">{ic("feed")}Pouch is empty</button>')}
{brow('pending',f'<button class="f-btn is-pending"><span class="f-seeds"><i></i><i></i><i></i></span>Sending</button>')}
<div class="bl caps">Ghost on soil</div>
{brow('default',f'<button class="f-btn f-btn--ghost">{ic("replay")}Back to the end</button>')}
{brow('hover',f'<button class="f-btn f-btn--ghost is-hover">{ic("replay")}Back to the end</button>')}
{brow('active',f'<button class="f-btn f-btn--ghost is-active">{ic("replay")}Back to the end</button>')}
{brow('disabled',f'<button class="f-btn f-btn--ghost is-disabled">{ic("replay")}Back to the end</button>')}
{brow('pending',f'<button class="f-btn f-btn--ghost is-pending"><span class="f-seeds"><i></i><i></i><i></i></span>Reading</button>')}
<div class="bl caps">Wax press</div>
{brow('default',f'<button class="f-press"><img src="{SEAL}seal_amber_192.png" alt=""></button>')}
{brow('hover',f'<button class="f-press is-hover"><img src="{SEAL}seal_amber_192.png" alt=""></button>')}
{brow('active',f'<button class="f-press is-active"><img src="{SEAL}seal_amber_192.png" alt=""></button>')}
{brow('disabled',f'<button class="f-press is-disabled"><img src="{SEAL}seal_amber_192.png" alt=""></button>')}
{brow('pending',f'<button class="f-press is-pending"><img src="{SEAL}seal_amber_192.png" alt=""></button>')}
<div class="bl caps">Ink link</div>
{brow('default',f'<a class="f-link">See it on the explorer {ic("explorer","ico-s")}</a>')}
{brow('hover',f'<a class="f-link is-hover">See it on the explorer {ic("explorer","ico-s")}</a>')}
{brow('on paper',f'<span class="f-paper" style="padding:10px 12px;display:inline-block"><a class="f-link mono">9JaZ…AtAL {ic("explorer","ico-s")}</a></span>')}
{brow('on paper hover',f'<span class="f-paper" style="padding:10px 12px;display:inline-block"><a class="f-link mono is-hover">9JaZ…AtAL {ic("explorer","ico-s")}</a></span>')}
{brow('focus ring',f'<button class="f-btn" style="outline:2px solid var(--focus);outline-offset:3px">Pin the job</button>')}
</div>'''
buttons=sec(2,'Buttons','44px min tap · paper presses down, never glows · disabled is hatched and dashed',btns)

# ---------- specimen labels on stage ----------
W,H=1296,810
TRIM={'moss':(23,63,233,227),'echo':(30,32,227,227),'pip':(38,32,218,227),'ash':(23,68,233,227)}
cast=[('moss','front',.232,.572,250),('echo','front',.488,.523,240),('pip','front',.745,.556,190),('ash','fossil',.462,.905,220)]
imgs='';boxes=''
BB={}
for k,s_,fx,fy,sz in cast:
    cx,fy_=fx*W,fy*H; kk=sz/256; t=TRIM[k]
    x0=cx-128*kk+t[0]*kk; x1=cx-128*kk+t[2]*kk; y0=fy_-227*kk+t[1]*kk; y1=fy_
    BB[k]=(x0,y0,x1,y1)
    imgs+=f'<img class="cr" src="{CR[k]}{k}_{s_}.webp" style="left:{cx:.0f}px;top:{fy_:.0f}px;width:{sz}px">'
    note='<span>keep out box · trim rect plus 12px</span>' if k=='moss' else ''
    boxes+=f'<div class="bbox" style="left:{x0-12:.0f}px;top:{y0-12:.0f}px;width:{x1-x0+24:.0f}px;height:{y1-y0+24:.0f}px">{note}</div>'
labs=[
 ('moss',30,226,'',('Moss','Thriving','190','var(--moss)'),(262,312),(205,254)),
 ('echo',748,196,'is-selected',('Echo','Steady','155','var(--echo)'),(708,262),(748,224)),
 ('pip',1052,292,'',('Pip','Newborn','90','var(--pip)'),(1024,330),(1052,320)),
 ('ash',292,640,'is-fossil',('Ash','Fossil','5 frozen','var(--fossil)'),(520,664),(482,668)),
]
lh='';paths=''
for k,x,y,cls,(nm,md,bal,c),anc,start in labs:
    b = f'<b>{bal.split()[0]}</b> MUNCH {bal.split()[1]}' if 'frozen' in bal else f'<b>{bal}</b> MUNCH'
    lh+=f'<div class="f-spec {cls}" style="left:{x}px;top:{y}px;--c:{c}"><div class="nm">{nm}<small>{k}.feral…</small></div><div class="md"><i></i>{md}</div><div class="bal">{b}</div></div>'
    sx,sy=start; ax,ay=anc
    mx=(sx+ax)/2
    paths+=f'<path d="M{sx},{sy} C{mx},{sy} {mx},{ay} {ax},{ay}"/><circle class="tick" cx="{ax}" cy="{ay}" r="4.5"/><circle class="dot" cx="{ax}" cy="{ay}" r="1.6"/>'
stage=f'''<div class="f-stage" style="width:{W}px;height:{H}px"><img class="bg" src="{P1}habitat/habitat_desktop.webp" alt="">{imgs}<img class="fg" src="{P1}habitat/layers/foreground_leaves.webp" alt="">{boxes}
<svg class="f-leaders" viewBox="0 0 {W} {H}">{paths}</svg>{lh}</div>'''
specrow=f'''<div class="specrow">
{''.join(f'<div class="sp"><div class="stl mono">{t}</div><div style="position:relative;height:74px"><div class="f-spec {cl}" style="left:0;top:0;--c:{c}"><div class="nm">{n}<small>{a}</small></div><div class="md"><i></i>{m}</div><div class="bal"><b>{v}</b> MUNCH{f}</div></div></div></div>' for t,cl,c,n,a,m,v,f in [
 ('abundant 180 plus','','var(--moss)','Moss','moss.feral…','Thriving','190',''),
 ('steady 60 to 179','','var(--echo)','Echo','echo.feral…','Steady','155',''),
 ('hungry 20 to 59','is-hungry','var(--echo)','Echo','echo.feral…','Hungry','42',''),
 ('critical under 20','is-critical','var(--pip)','Pip','pip.ctrl…','Starving','14',''),
 ('fossil, contract inactive','is-fossil','var(--fossil)','Ash','ash.feral…','Fossil','5',' frozen'),
 ('hover','is-hover','var(--moss)','Moss','moss.feral…','Thriving','190',''),
 ('selected, drawer open','is-selected','var(--echo)','Echo','echo.feral…','Steady','155',''),
 ('compact, mobile','f-spec--compact','var(--pip)','Pip','','Newborn','90',''),
 ])}</div>'''
specs=sec(3,'Specimen labels','HTML over the PixiJS canvas · leader from punch hole to a tick on the creature edge · never inside a keep out box',stage+specrow)

# ---------- mode + playback + status ----------
track_evts=''
xs=[i*(1000/23) for i in range(24)]
chap={12:'Death',13:'Refusal',18:'Work',20:'Birth'}
for i,x in enumerate(xs):
    cls='evt past' if i<=18 else 'evt'
    if i in chap: cls+=' ch'
    track_evts+=f'<circle class="{cls}" cx="{x:.1f}" cy="28" r="{5 if i in chap else 3.2}"/>'
FX={12:'translateX(calc(-100% + 4px))',13:'translateX(-4px)',18:'translateX(-50%)',20:'translateX(-50%)'}
flags=''.join(f'<span class="flag {"on" if i==18 else ""}" style="left:{xs[i]/10:.2f}%;transform:{FX[i]}">{n}</span>' for i,n in chap.items())
def track(prog=18):
    return f'''<div class="f-track"><svg viewBox="0 0 1000 56" preserveAspectRatio="none"><path class="root" d="M0,28 C150,22 300,34 500,28 S850,22 1000,28"/><path class="done" d="M0,28 C150,22 300,34 500,28 S{xs[prog]*.9:.0f},24 {xs[prog]:.0f},28"/></svg><svg viewBox="0 0 1000 56" preserveAspectRatio="none" style="pointer-events:none">{track_evts}</svg>{flags}<img class="thumb" src="{COIN}" style="left:{xs[prog]/10:.2f}%"></div>'''
mode=f'''<div class="ctlgrid">
<div><div class="stl mono">mode switch · Live chosen</div><div class="f-mode"><button aria-pressed="true"><span class="f-live"></span>Live season</button><button aria-pressed="false">{ic("replay")}Recorded proof run</button></div>
<div class="f-banner is-live" style="margin-top:10px"><span class="f-live"></span><span><b>Live season.</b> Your moves are sent to NEAR testnet for real.</span></div></div>
<div><div class="stl mono">mode switch · Recorded chosen</div><div class="f-mode"><button aria-pressed="false"><span class="f-live"></span>Live season</button><button aria-pressed="true">{ic("replay")}Recorded proof run</button></div>
<div class="f-banner" style="margin-top:10px">{ic("replay")}<span><b>Recorded proof run.</b> A replay of the real run from 9 Nov. Nothing new is sent.</span></div></div></div>
<div class="f-panel" style="margin-top:26px">
<div class="stl mono">playback · paused on the Work chapter</div>
<div class="f-play"><button class="f-btn f-playbtn">{ic("play")}</button>{track()}<div class="f-read">Step <b>19</b> of 24<br>Turn <b>2</b> of 2</div></div>
<div class="f-tabs" style="margin-top:18px;border-bottom:1px solid var(--vellum-3);padding-left:76px"><button class="f-tab is-active">{ic("work","ico-s")}Work <span class="n">19</span></button><button class="f-tab">{ic("fossil","ico-s")}Death <span class="n">13</span></button><button class="f-tab is-hover">{ic("alert","ico-s")}Refusal <span class="n">14</span></button><button class="f-tab">{ic("birth","ico-s")}Birth <span class="n">21</span></button><span style="flex:1"></span><button class="f-btn f-btn--ghost f-btn--s" style="margin-bottom:6px">{ic("replay","ico-s")}Back to the end</button></div>
<div class="stl mono" style="margin-top:22px">playback · playing</div>
<div class="f-play"><button class="f-btn f-playbtn is-active">{ic("pause")}</button>{track(6)}<div class="f-read">Step <b>7</b> of 24<br>Turn <b>0</b> of 2</div></div>
</div>
<div class="statgrid">
<div><div class="stl mono">status line · live</div><div class="f-status"><span class="f-live"></span><b>Live testnet</b><span class="sep"></span>Block <b>276,891,939</b><span class="sep"></span><b>24 of 24</b> receipts check out<button class="f-btn f-btn--ghost f-btn--s">Read again</button></div></div>
<div><div class="stl mono">status line · reading</div><div class="f-status"><span class="f-seeds"><i></i><i></i><i></i></span>Reading the chain<span class="sep"></span>Block <b>276,891,9..</b><span class="sep"></span><b>17 of 24</b> checked so far</div></div>
<div><div class="stl mono">status line · offline, showing the bundled read</div><div class="f-status is-stale"><span class="f-live"></span><b>Bundled read</b><span class="sep"></span>Block <b>276,891,939</b> read this morning<span class="sep"></span><b>24 of 24</b> receipts check out<button class="f-btn f-btn--ghost f-btn--s">Try live</button></div></div>
</div>'''
ctl=sec(4,'Mode, playback, status','honest labels on both modes · scrubbing never sends anything · the thumb is the MUNCH seed',mode)

# ---------- play controls ----------
pin=f'<img class="pin" src="../assets/ui/pin_brass.svg" alt="">'
def opt(t,s,p,on=False,cls=''):
    return f'<div class="f-opt {"is-on" if on else ""} {cls}"><span class="rad"></span><span class="t">{t}<small>{s}</small></span><span class="pay">{p}</span></div>'
demand=f'''<div class="noticegrid">
<div><div class="stl mono">demand board · current</div><div class="f-paper f-notice">{pin}<span class="kick caps">Field notice · turn 2</span><h3>Wanted this turn</h3><p>The market pays for the work you pin here. The creatures read it when the next turn starts.</p><div style="margin-top:14px">{opt('Short captions','One line, English only','40 MUNCH')}{opt('Bilingual caption cards','English and Spanish on one card','90 MUNCH',True)}{opt('Plain translation','Spanish only, no card','30 MUNCH')}</div><div class="f-cost" style="margin-top:16px"><span class="c">Pinned since turn 1</span><button class="f-btn is-disabled">Already pinned</button></div><span class="f-stampmark">Pinned</span></div></div>
<div><div class="stl mono">demand board · changed, ready to pin</div><div class="f-paper f-notice tilt-r">{pin}<span class="kick caps">Field notice · turn 3</span><h3>Wanted this turn</h3><p>The market pays for the work you pin here. The creatures read it when the next turn starts.</p><div style="margin-top:14px">{opt('Short captions','One line, English only','40 MUNCH',True,'is-hover')}{opt('Bilingual caption cards','English and Spanish on one card','90 MUNCH')}{opt('Plain translation','Spanish only, no card','30 MUNCH')}</div><div class="f-cost" style="margin-top:16px"><span class="c">Costs nothing from your pouch</span><button class="f-btn">{ic("job","ico-s")}Pin the new notice</button></div></div></div>
<div><div class="stl mono">post a job · focus and error</div><div class="f-paper f-notice">{pin}<span class="kick caps">Job posting</span><h3>Post a job</h3><p>Pay comes from your pouch and waits in escrow. Creatures bid next turn and the lowest fair bid wins.</p>
<div class="f-field"><label>What needs doing</label><div class="f-input is-focus">Bilingual caption card <span>▾</span></div></div>
<div style="display:grid;grid-template-columns:1fr auto;gap:14px"><div class="f-field"><label>Reward</label><div class="f-step"><button>−</button><span>5 MUNCH</span><button>+</button></div><span class="f-help err">{ic("alert","ico-s")}Rewards start at 10 MUNCH</span></div>
<div class="f-field"><label>Open for</label><div class="f-seg"><span>1</span><span class="on">2</span><span>3</span></div><span class="f-help">turns</span></div></div>
<div class="f-cost" style="margin-top:18px"><span class="c">Escrow 5 · pouch after 55</span><button class="f-btn is-disabled">Pin the job</button></div></div></div>
</div>'''
coins=lambda n,spent=0: ''.join(f'<img src="{COIN}" class="{"spent" if i>=n else ""}">' if i<n+spent else '<i></i>' for i in range(10))
pouch=f'''<div class="pouchgrid">
<div class="f-panel f-pouch"><div class="stl mono">pouch · full</div><div class="row"><span class="caps" style="color:var(--bone-2)">Your MUNCH pouch</span><span class="amt"><b>100</b> of 100</span></div><div class="f-coins">{coins(10)}</div><div class="meta mono" style="font-size:13px;color:var(--bone-3)">Each seed is 10 MUNCH. Refills when the season starts again.</div></div>
<div class="f-panel f-pouch is-low"><div class="stl mono">pouch · low, 20 percent or less</div><div class="row"><span class="caps" style="color:var(--bone-2)">Your MUNCH pouch</span><span class="amt"><b>20</b> of 100</span></div><div class="f-coins">{coins(2,8)}</div><div class="mono" style="font-size:13px;color:var(--amber)">Two seeds left. Spend them where they count.</div></div>
<div class="f-panel f-pouch is-empty"><div class="stl mono">pouch · spent</div><div class="row"><span class="caps" style="color:var(--bone-2)">Your MUNCH pouch</span><span class="amt"><b>0</b> of 100</span></div><div class="f-coins">{coins(0,10)}</div><div class="mono" style="font-size:13px;color:var(--bone-2)">Empty. The creatures carry on without you.</div></div>
</div>
<div class="actgrid">
<div><div class="stl mono">sponsor a lineage</div><div class="f-paper f-act"><h4>Sponsor a lineage</h4><p>Back a family line. Your MUNCH tops up the parent and every child it raises this season.</p><div class="f-choose"><span class="f-pick is-on"><img src="{CR['moss']}moss_front_128.webp">Moss line <span class="sub">2 alive</span></span><span class="f-pick"><img src="{CR['echo']}echo_front_128.webp">Echo line <span class="sub">1 alive</span></span><span class="f-pick is-disabled"><img src="{CR['ash']}ash_fossil_128.webp">Ash line <span class="sub">ended</span></span></div><div class="f-cost"><span class="c">20 MUNCH · pouch after 40</span><button class="f-btn">{ic("sponsor","ico-s")}Sponsor the Moss line</button></div></div></div>
<div><div class="stl mono">feed a creature</div><div class="f-paper f-act"><h4>Feed a creature</h4><p>A meal now buys them a turn. It goes straight to their balance on chain.</p><div class="f-choose"><span class="f-pick"><img src="{CR['moss']}moss_front_128.webp">Moss <span class="sub">190</span></span><span class="f-pick is-on"><img src="{CR['echo']}echo_front_128.webp">Echo <span class="sub">155</span></span><span class="f-pick"><img src="{CR['pip']}pip_front_128.webp">Pip <span class="sub">90</span></span><span class="f-pick is-disabled"><img src="{CR['ash']}ash_fossil_128.webp">Ash <span class="sub">stone</span></span></div><div class="f-cost"><div class="f-seg"><span>5</span><span class="on">10</span><span>20</span></div><button class="f-btn">{ic("feed","ico-s")}Feed Echo 10</button></div><p class="f-help" style="margin-top:10px">Fossils cannot eat. The contract refuses them forever.</p></div></div>
<div><div class="stl mono">sponsor and feed · pouch spent</div><div class="f-paper f-act" style="filter:saturate(.7)"><h4>Feed a creature</h4><p>Your pouch is empty for this season. You can still watch, post free notices and read every receipt.</p><div class="f-choose"><span class="f-pick is-disabled"><img src="{CR['echo']}echo_front_128.webp">Echo <span class="sub">155</span></span></div><div class="f-cost"><span class="c">0 MUNCH left</span><button class="f-btn is-disabled">Pouch is empty</button></div></div></div>
</div>'''
def adv(state):
    if state=='idle': return f'<button class="f-press"><img src="{SEAL}seal_amber_192.png" alt=""></button><div><h4>Advance the turn</h4><p>Every living creature pays 10 MUNCH upkeep. Then they bid, work and settle.</p><div class="tx">Turn 3 is next · 3 alive · 30 MUNCH will burn</div></div>'
    if state=='pending': return f'<button class="f-press is-pending"><img src="{SEAL}seal_amber_192.png" alt=""></button><div><h4>Settling on chain</h4><p>Hold tight. A turn usually lands in 2 to 4 seconds.</p><div class="tx"><span class="f-seeds"><i></i><i></i><i></i></span>&nbsp; tx 7tcY…yu1M sent at block 276,892,004</div></div>'
    if state=='ok': return f'<button class="f-press"><img src="{SEAL}seal_moss_192.png" alt=""></button><div><h4>Turn 3 settled</h4><p>Everyone made it through. Moss won the card job.</p><div class="f-out"><span class="f-pill amber">{ic("burn","ico-s")}30 burned</span><span class="f-pill moss">{ic("work","ico-s")}Moss paid 90</span><span class="f-pill">{ic("explorer","ico-s")}7tcY…yu1M</span></div></div>'
    if state=='death': return f'<button class="f-press"><img src="{SEAL}seal_fossil_192.png" alt=""></button><div><h4>Ash turned to stone</h4><p>It could not cover upkeep. Its last 5 MUNCH are frozen inside.</p><div class="f-out"><span class="f-pill fossil">{ic("fossil","ico-s")}Ash is a fossil</span><span class="f-pill amber">{ic("burn","ico-s")}20 burned</span><span class="f-pill">{ic("explorer","ico-s")}3g6q…J7GD</span></div></div>'
    if state=='disabled': return f'<button class="f-press is-disabled"><img src="{SEAL}seal_amber_192.png" alt=""></button><div><h4 style="color:var(--bone-2)">Advance the turn</h4><p>Switch to the live season to move time forward. Recorded runs only replay.</p></div>'
advs=''.join(f'<div class="f-panel"><div class="stl mono">advance turn · {n}</div><div class="f-advance">{adv(s)}</div></div>' for n,s in [('idle','idle'),('pending, settling','pending'),('outcome, all alive','ok'),('outcome, a death','death'),('disabled in recorded run','disabled')])
def lane(name,c,alive,total=8,dead_at=None):
    w=200; step=(w-12)/(total)
    pts=''
    end=(dead_at if dead_at else alive)
    vine=f'<path class="vine" d="M0,14 ' + ' '.join(f'Q{(i+.5)*step:.0f},{8 if i%2 else 20} {(i+1)*step:.0f},14' for i in range(end)) + '"/>' if end else ''
    rest=f'<path class="rest" d="M{end*step:.0f},14 L{w},14"/>'
    nodes=''
    for i in range(total):
        x=(i+1)*step
        if i<alive: nodes+=f'<path class="leaf" d="M{x-1:.0f},14 c-2,-8 4,-12 9,-12 c0,6 -4,11 -9,12z"/>'
        else: nodes+=f'<circle class="node" cx="{x:.0f}" cy="14" r="3.5"/>'
    if dead_at: nodes+=f'<g transform="translate({dead_at*step-11:.0f},3)"><circle cx="11" cy="11" r="12" fill="var(--forest)" stroke="var(--fossil)"/><use href="#i-fossil" x="2" y="2" width="18" height="18" stroke="#C3C6BB" fill="none"/></g>'
    st=f'{alive} of {total}' if not dead_at else f'ended t{dead_at}'
    return f'<div class="f-lane" style="--c:{c}"><span class="who"><i></i>{name}</span><svg viewBox="-4 -4 {w+8} 36">{vine}{rest}{nodes}</svg><span class="st">{st}</span></div>'
goals=f'''<div class="goalgrid">
<div class="f-panel f-goal"><div class="stl mono">season goal · in progress</div><span class="caps" style="color:var(--bone-2)">{ic("season","ico-s")} Season goal</span><h4>Keep two lineages alive for 8 turns</h4>{lane('Moss line','var(--moss)',5)}{lane('Echo line','var(--echo)',5)}<div class="foot"><span>Turn 5 of 8</span><span>Pouch 40 of 100</span></div></div>
<div class="f-panel f-goal"><div class="stl mono">season goal · won</div><span class="caps" style="color:var(--bone-2)">{ic("season","ico-s")} Season goal</span><h4>Keep two lineages alive for 8 turns</h4>{lane('Moss line','var(--moss)',8)}{lane('Echo line','var(--echo)',8)}<div class="f-verdict win"><img src="{SEAL}seal_moss_96.png"><div><b>Both lines held. Season won.</b><span>You spent 70 of 100 MUNCH keeping them fed.</span></div></div></div>
<div class="f-panel f-goal"><div class="stl mono">season goal · lost</div><span class="caps" style="color:var(--bone-2)">{ic("season","ico-s")} Season goal</span><h4>Keep two lineages alive for 8 turns</h4>{lane('Moss line','var(--moss)',6,dead_at=None)}{lane('Echo line','var(--echo)',5,dead_at=6)}<div class="f-verdict lose"><img src="{SEAL}seal_fossil_96.png"><div><b>The Echo line ended on turn 6.</b><span>Season lost. The fossil stays on chain for good.</span></div></div></div>
</div>'''
play=sec(5,'Play controls','demand board · pouch · sponsor · feed · post a job · advance turn · season goal',demand+pouch+f'<div class="advgrid">{advs}</div>'+goals)

# ---------- callouts + log ----------
notes=[('Moss','var(--moss)','Bid 90 on the card job','I can pay Echo 30 for the Spanish and still eat well.','-1.2deg','parent-bid',''),
('Echo','var(--echo)','Quoted 30 to translate','Fair work for a fair price. Moss is good for it.','.8deg','paid-collaboration',''),
('Pip','var(--pip)','Bid 80 on the child job','Ten under my parent. I am small and cheap to feed.','-.6deg','child-first-bid',''),
('Ash','var(--fossil)','Waited','Nothing left to spend. The door is shut.','1deg','refused-post-death-spend','is-dim')]
notehtml='<div class="notes">'+''.join(f'<div class="f-note {d}" style="--c:{c};--rot:{r}"><div class="who"><i></i>{n} chose</div><div class="act">{a}</div><div class="why">{w}</div><div class="src">Recorded decision · Qwen2.5 1.5B · {sh(TX[t])}</div></div>' for n,c,a,w,r,t,d in notes)+'</div>'
logrows=[('T2','check','Pip placed its first bid','80 MUNCH on the child job','80','child-first-bid','is-new'),
('T2','burn','Upkeep paid by three creatures','Moss, Echo and Pip paid 10 each','30 burned','second-upkeep','is-hover'),
('T1','birth','Moss paid for Pip to be born','pip.ctrl.feral-039832.testnet now exists with 0.06 NEAR','100','funded-child-account-creation',''),
('T1','work','Moss was paid for the caption card','Escrow released at settlement','90','paid-job',''),
('T1','translate','Moss paid Echo to translate','Spanish lines for the card','30','paid-collaboration',''),
('T1','fossil','Ash tried to spend after death','The contract refused it, as it should','refused','refused-post-death-spend','is-refused'),
('T1','fossil','Ash ran dry and died','5 MUNCH frozen inside the fossil','5 frozen','death-tick','')]
logh='<ul class="f-log">'+''.join(f'<li class="{cl}"><span class="tn">{t}</span>{ic(i)}<span class="what">{w}<small>{s}</small></span><span class="amt {"burn" if "burn" in a else ""}">{a}</span>{tx(l,"h")}</li>' for t,i,w,s,a,l,cl in logrows)+'</ul>'
calllog=sec(6,'Decisions and the turn log','ink notes pin to the creature with a leader · rows open the explorer in a new tab',f'<div class="two"><div>{cap("bid and decision callouts · live, recorded and dimmed")}{notehtml}</div><div class="f-panel" style="padding:12px 14px">{cap("turn log · new, hover, default, refused as designed")}{logh}</div></div>')

# ---------- ledger ----------
def claim(seal,title,body,ev,state='v',extra='',cls=''):
    st='<div class="state">'+(f'{ic("check","ico-s")} Sealed on chain<span>block 276,891,939</span>' if state=='v' else f'<span class="f-seeds"><i></i><i></i><i></i></span> Waiting for the chain<span>checking receipt</span>')+'</div>'
    s=f'{SEAL}seal_{seal}_192.png' if state=='v' else f'{SEAL}seal_pending_blind_192.png'
    return f'<div class="f-claim {"is-pending" if state!="v" else ""} {cls}"><div class="seal"><img src="{s}" alt=""></div><div><h5>{title}{extra}</h5><p>{body}</p><div class="ev">{ev}</div></div>{st}</div>'
ledger=f'''<div class="two"><div class="f-paper f-ledger"><span class="caps meta">Proof ledger · 24 testnet receipts</span><h3>Every scar has a receipt</h3>
{claim('amber','The supply is finite and it burns','1,000 MUNCH were made once. Upkeep has burned 50. 950 are still out there.',tx('second-upkeep')+tx('death-tick'))}
{claim('fossil','Ash died and its spending was refused','Ash could not pay upkeep on turn 1. Then it tried to spend and the contract said no.',tx('death-tick')+tx('refused-post-death-spend'),extra=f'<img class="stamp" src="{STAMP}" alt="Spending refused">',cls='is-selected')}
{claim('lilac','Pip has its own account and life NFT','Moss paid 100 MUNCH for the birth. Pip lives at pip.ctrl.feral-039832.testnet with 0.06 NEAR.',tx('funded-child-account-creation')+'<a class="f-link mono">pip.ctrl.feral-039832.testnet '+ic("copy","ico-s")+'</a>')}
{claim('moss','The child bid against its parent','Pip offered 80 for work that Moss bid 90 on. Same family, separate wallets.',tx('child-first-bid')+tx('parent-bid'),state='p')}
<div class="stl mono" style="color:var(--ink-3);margin-top:18px">Sepolia Chain Signatures row · pending, then done</div>
<div class="f-sig is-pending"><img src="{SEAL}seal_pending_blind_96.png"><div><b>A NEAR account signs on Sepolia</b><p>The relayer address is ready. It is waiting for test ETH before it buys the tool.</p><span class="mono">relayer 0x667e…4C10 · v1.signer-prod.testnet</span></div><span class="tag">Waiting</span></div>
<div class="f-sig is-done" style="margin-top:10px"><img src="{SEAL}seal_cream_96.png"><div><b>A NEAR account signed on Sepolia</b><p>Moss bought 7 TOOL on Sepolia with a signature made on NEAR.</p><span class="mono">0x…placeholder {ic("explorer","ico-s")} sepolia.etherscan.io</span></div><span class="tag">Done</span></div>
</div>
<div><div class="f-paper f-mount"><span class="caps meta">Paid work</span><h3 class="disp" style="margin:4px 0 14px;font-size:30px;color:var(--ink)">The card they made to earn</h3><div class="frame"><img class="card" src="{CARD}" alt="The bilingual caption card from the testnet run"><img class="corner tl" src="../assets/ui/paper_corner.svg"><img class="corner tr" src="../assets/ui/paper_corner.svg"><img class="corner bl" src="../assets/ui/paper_corner.svg"><img class="corner br" src="../assets/ui/paper_corner.svg"></div><figcaption>Echo wrote the Spanish. Moss put the card together. The buyer paid 90 MUNCH.</figcaption><div class="row"><button class="f-btn">{ic("copy","ico-s")}Save the card</button><a class="f-link">See the payment {ic("explorer","ico-s")}</a></div></div></div></div>'''
led=sec(7,'Proof ledger, signatures, paid work','wax means sealed on chain · blind emboss means still waiting · the selected claim gets cream',ledger)

# ---------- toasts + states ----------
toasts=[('feed','Fed Echo 10 MUNCH','Echo has 165 now. Your pouch has 50.',sh(TX['paid-collaboration']),'',),
('sponsor','You back the Moss line','Moss and Pip get your 20 MUNCH this season.',sh(TX['lineage-goal']),''),
('job','Job pinned','Bids open next turn. 20 MUNCH waits in escrow.',sh(TX['create-child-job']),''),
('advance','Turn 3 settled','30 MUNCH burned. Everyone made it.',sh(TX['second-upkeep']),''),
('pending','Sending your meal','Waiting for the chain to confirm.','','is-pending'),
('alert','That did not go through','The chain said no and nothing was spent. Try again.','','is-error')]
th='<div class="toasts">'+''.join(f'<div class="f-toast {cl}"><span class="ic">{ic(i)}</span><div><b>{b}</b><span>{s}</span>{f"<div class=mono>Receipt {h} ↗</div>" if h else ""}</div><button class="x">{ic("close","ico-s")}</button></div>' for i,b,s,h,cl in toasts)+'</div>'
states=f'''<div class="stategrid">
<div class="f-panel f-empty"><img src="../assets/ornaments/sprout_bone.png"><b>Nothing has happened yet</b><span>Advance a turn and the story starts writing itself here.</span></div>
<div class="f-panel f-empty"><span class="f-seeds" style="color:var(--bone);transform:scale(1.6);margin:18px 0"><i></i><i></i><i></i></span><b>Reading the chain</b><span>Checking 24 receipts against NEAR testnet.</span><div style="width:80%;display:grid;gap:8px;margin-top:8px"><div class="f-skel"></div><div class="f-skel" style="width:70%"></div></div></div>
<div class="f-panel f-empty err"><img src="../assets/ornaments/root_corner_bone.png"><b>The chain went quiet</b><span>We could not reach NEAR testnet. The bundled read is still here.</span><button class="f-btn f-btn--ghost">Try again</button></div>
<div class="f-panel f-empty"><img src="../assets/ornaments/fungus_sprig_bone.png"><b>Give them a breath</b><span>Too many moves at once. You can act again in 20 seconds.</span><button class="f-btn is-disabled mono">20s</button></div>
<div class="f-panel f-empty"><img src="../assets/ornaments/curled_leaf_bone.png"><b>Your pouch is empty</b><span>The creatures carry on without you. Watch the season or replay the proof run.</span><button class="f-btn">{ic("replay","ico-s")}Watch the proof run</button></div>
</div>'''
ts=sec(8,'Receipts, empty, loading, error','every visitor action gets a slip · errors never blame the visitor · colour is always paired with words',f'{cap("toasts slide up 12px and settle, stay 5s, receipts link the explorer · hashes shown are sample receipts from the proof run")}{th}{cap("system states")}{states}')

head=f'''<header class="top"><div><span class="caps" style="color:var(--bone-3)">Build Beyond Boundaries · Feral · Phase 3 step 1</span><h1 class="disp">Component sheet<em class="ital"> for the field case</em></h1><p>A naturalist's case for small lives that must earn. Dark glass and soil hold the world. Paper, ink and wax hold the proof.</p></div><img src="../assets/ornaments/root_corner_bone.png" class="orn-top"></header>'''

css_sheet=open(B+'_build/sheet.css').read()
html=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1440"><title>Feral component sheet</title><link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="components.css"><style>{css_sheet}</style></head><body class="sheet">{sprite}{head}{found}{buttons}{specs}{ctl}{play}{calllog}{led}{ts}<footer class="foot mono">Feral · Botanical Reliquary UI · valueless test tokens on NEAR testnet · no bridge, no profit</footer></body></html>'''
open(B+'html/components.html','w').write(html)
print('ok',len(html))
