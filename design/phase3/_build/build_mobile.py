import sys; sys.argv=['x']
exec(open('/workspace/near/feral/design/phase3/_build/build_sheet.py').read().split("css_sheet=open")[0])
MW,MH=358,492
MTRIM=TRIM
mcast=[('moss','front',.227,.531,124),('echo','front',.545,.507,116),('pip','front',.789,.623,94),('ash','fossil',.445,.873,108)]
def mstage(labels=True,sel=None,dim=False):
    im='';bx={}
    for k,s_,fx,fy,sz in mcast:
        cx,fy_=fx*MW,fy*MH; kk=sz/256; t=MTRIM[k]
        bx[k]=(cx-128*kk+t[0]*kk, fy_-227*kk+t[1]*kk, cx-128*kk+t[2]*kk, fy_)
        im+=f'<img class="cr" src="{CR[k]}{k}_{s_}_128.webp" style="left:{cx:.0f}px;top:{fy_:.0f}px;width:{sz}px">'
    L=[('moss',8,128,'','Moss','Thriving','190','var(--moss)',(60,186),(56,166)),
       ('echo',236,112,'is-selected' if sel=='echo' else '','Echo','Steady','155','var(--echo)',(214,170),(236,134)),
       ('pip',214,324,'','Pip','Newborn','90','var(--pip)',(276,300),(256,324)),
       ('ash',30,444,'is-fossil','Ash','Fossil','5','var(--fossil)',(124,426),(90,444))]
    lh='';pa=''
    for k,x,y,cl,n,m,v,c,a,s0 in L:
        fz=' frozen' if k=='ash' else ''
        lh+=f'<div class="f-spec f-spec--compact {cl}" style="left:{x}px;top:{y}px;--c:{c}"><div class="nm">{n}</div><div class="md"><i></i>{m}</div><div class="bal"><b>{v}</b>{fz}</div></div>'
        (ax,ay),(sx,sy)=a,s0; mx=(sx+ax)/2
        pa+=f'<path d="M{sx},{sy} C{mx},{sy} {mx},{ay} {ax},{ay}"/><circle class="tick" cx="{ax}" cy="{ay}" r="3.5"/><circle class="dot" cx="{ax}" cy="{ay}" r="1.2"/>'
    return f'<div class="f-stage" style="width:{MW}px;height:{MH}px;border-radius:8px;{"filter:brightness(.6)" if dim else ""}"><img class="bg" src="{P1}habitat/habitat_mobile.webp">{im}<svg class="f-leaders" viewBox="0 0 {MW} {MH}">{pa}</svg>{lh if labels else ""}</div>'
def topbar(mode):
    live = mode=='live'
    return f'''<div class="mtop"><div class="mrow"><span class="word disp">Feral</span><span class="f-status" style="font-size:11.5px;gap:8px"><span class="f-live"></span>Block <b>276,891,939</b></span></div>
<div class="f-mode" style="display:grid;width:100%"><button aria-pressed="{str(live).lower()}" style="justify-content:center"><span class="f-live"></span>Live season</button><button aria-pressed="{str(not live).lower()}" style="justify-content:center">{ic("replay","ico-s")}Recorded run</button></div></div>'''
def dock_rec():
    return f'''<nav class="f-dock"><button class="it is-on">{ic("work")}Work</button><button class="it">{ic("fossil")}Death</button><div class="mid"><button class="f-btn f-playbtn" style="width:72px;height:72px;margin-top:-26px">{ic("play")}</button><span style="color:var(--bone)">Replay</span></div><button class="it">{ic("alert")}Refusal</button><button class="it">{ic("birth")}Birth</button></nav>'''
def dock_live(state='idle'):
    pr={'idle':'','sheet':'','pending':'is-pending','disabled':'is-disabled'}[state]
    lab={'idle':'Advance','sheet':'Advance','pending':'Settling','disabled':'Advance'}[state]
    return f'''<nav class="f-dock"><button class="it {"is-on" if state=="sheet" else ""}">{ic("feed")}Feed</button><button class="it">{ic("job")}Post job</button><div class="mid"><button class="f-press {pr}"><img src="{SEAL}seal_amber_192.png"></button><span>{lab}</span></div><button class="it">{ic("sponsor")}Sponsor</button><button class="it">{ic("munch")}Proof</button></nav>'''
def phone(inner,label):
    return f'<div class="pcol"><div class="stl mono">{label}</div><div class="phone">{inner}</div></div>'
mini_play=f'''<div class="minibar"><div class="f-track" style="height:40px">{track(18).split('<div class="f-track">')[1].split('<span class="flag')[0]}<img class="thumb" src="{COIN}" style="left:{xs[18]/10:.2f}%;width:26px;height:26px"></div></div><div class="f-read" style="font-size:11.5px;text-align:left;margin-top:-2px">Step <b>19</b> of 24 · Turn <b>2</b> of 2 · Work</div>'''
p1=phone(topbar('rec')+f'<div class="mnote mono">{ic("replay","ico-s")} A replay of the real run. Nothing new is sent.</div><div style="padding:8px 16px 0">{mstage()}</div><div style="padding:6px 16px 0">{mini_play}</div>'+dock_rec(),'home · recorded proof run · chapters live in the dock')
sheet_feed=f'''<div class="f-paper f-sheet"><div class="grab"></div><span class="caps" style="color:var(--ink-3)">Pouch 60 of 100</span><h4 class="disp" style="margin:4px 0 2px;font-size:26px">Feed a creature</h4><p style="margin:0;color:var(--ink-2);font-size:14.5px">A meal now buys them a turn.</p><div class="f-choose" style="margin:12px 0"><span class="f-pick"><img src="{CR['moss']}moss_front_128.webp">Moss</span><span class="f-pick is-on"><img src="{CR['echo']}echo_front_128.webp">Echo</span><span class="f-pick"><img src="{CR['pip']}pip_front_128.webp">Pip</span></div><div class="f-cost"><div class="f-seg"><span>5</span><span class="on">10</span><span>20</span></div><button class="f-btn" style="flex:1">{ic("feed","ico-s")}Feed Echo 10</button></div></div>'''
p2=phone(topbar('live')+f'<div style="padding:10px 16px 0">{mstage(sel="echo",dim=True)}</div>'+sheet_feed+dock_live('sheet'),'live · feed sheet open above the dock · one sheet at a time')
toast_m=f'<div class="f-toast is-pending" style="position:absolute;left:16px;right:16px;width:auto;bottom:104px"><span class="ic">{ic("pending")}</span><div><b>Settling turn 3</b><span>Usually 2 to 4 seconds. You can keep looking around.</span></div><button class="x">{ic("close","ico-s")}</button></div>'
goal_m=f'''<div class="f-panel f-goal" style="margin:12px 16px 0;padding:14px 16px"><span class="caps" style="color:var(--bone-2)">{ic("season","ico-s")} Season goal · turn 5 of 8</span>{lane('Moss line','var(--moss)',5)}{lane('Echo line','var(--echo)',5)}</div>'''
p3=phone(topbar('live')+f'<div style="padding:10px 16px 0">{mstage()}</div>'+goal_m+toast_m+dock_live('pending'),'live · advance pending · receipt slip sits above the dock')
# stacked components at 390
col1=f'''<div class="mcol"><div class="stl mono">demand board at 358</div><div class="f-paper f-notice">{pin}<span class="kick caps">Field notice · turn 3</span><h3 style="font-size:28px">Wanted this turn</h3><p>The creatures read this when the next turn starts.</p><div style="margin-top:10px">{opt('Short captions','One line','40',False)}{opt('Bilingual caption cards','English and Spanish','90',True)}</div><button class="f-btn" style="width:100%;margin-top:14px">Pin the new notice</button></div>
<div class="stl mono" style="margin-top:30px">pouch, compact</div><div class="f-panel f-pouch is-low" style="padding:14px 16px"><div class="row"><span class="caps" style="color:var(--bone-2)">Your pouch</span><span class="amt"><b>20</b> of 100</span></div><div class="f-coins" style="gap:4px">{coins(2,8)}</div></div>
<div class="stl mono" style="margin-top:30px">ink note, docked under the canvas</div><div class="f-note" style="--c:var(--pip);--rot:-.6deg;max-width:none"><div class="who"><i></i>Pip chose</div><div class="act">Bid 80 on the child job</div><div class="why">Ten under my parent. I am small and cheap to feed.</div><div class="src">Recorded decision · {sh(TX['child-first-bid'])}</div></div></div>'''
col2=f'''<div class="mcol"><div class="stl mono">proof ledger at 358, seal 64</div><div class="f-paper f-ledger" style="padding:22px 18px"><span class="caps meta">24 testnet receipts</span><h3 style="font-size:28px">Every scar has a receipt</h3>
<div class="f-claim m"><div class="seal"><img src="{SEAL}seal_fossil_192.png"></div><div><h5>Ash died and its spending was refused</h5><div class="ev">{tx('death-tick')}{tx('refused-post-death-spend')}</div></div></div>
<div class="f-claim m"><div class="seal"><img src="{SEAL}seal_lilac_192.png"></div><div><h5>Pip has its own account and life NFT</h5><div class="ev">{tx('funded-child-account-creation')}</div></div></div>
<div class="f-claim m is-pending"><div class="seal"><img src="{SEAL}seal_pending_blind_192.png"></div><div><h5>The child bid against its parent</h5><div class="ev"><span class="f-seeds"><i></i><i></i><i></i></span> Waiting for the chain</div></div></div></div>
<div class="stl mono" style="margin-top:30px">turn log rows at 358</div><div class="f-panel" style="padding:6px 8px"><ul class="f-log m">{''.join(f'<li class="{cl}"><span class="tn">{t}</span>{ic(i)}<span class="what">{w}</span>{tx(l,"h")}</li>' for t,i,w,s,a,l,cl in logrows[:4])}</ul></div></div>'''
col3=f'''<div class="mcol"><div class="stl mono">advance turn outcome, inline card</div><div class="f-panel" style="padding:16px"><div class="f-advance" style="gap:14px"><button class="f-press" style="width:64px;height:64px"><img src="{SEAL}seal_moss_96.png"></button><div><h4 style="font-size:21px">Turn 3 settled</h4><p style="font-size:14px">Everyone made it through.</p></div></div><div class="f-out"><span class="f-pill amber">{ic("burn","ico-s")}30 burned</span><span class="f-pill">{ic("explorer","ico-s")}{sh(TX['second-upkeep'])}</span></div></div>
<div class="stl mono" style="margin-top:30px">rate limited</div><div class="f-panel f-empty" style="padding:20px"><img src="../assets/ornaments/fungus_sprig_bone.png" style="height:54px"><b>Give them a breath</b><span>You can act again in 20 seconds.</span></div>
<div class="stl mono" style="margin-top:30px">budget spent, dock state</div><div style="position:relative;height:120px;border-radius:8px;overflow:hidden;border:1px solid var(--soil-line)"><nav class="f-dock"><button class="it is-disabled">{ic("feed")}Feed</button><button class="it is-disabled">{ic("job")}Post job</button><div class="mid"><button class="f-press"><img src="{SEAL}seal_amber_192.png"></button><span>Advance</span></div><button class="it is-disabled">{ic("sponsor")}Sponsor</button><button class="it">{ic("munch")}Proof</button></nav></div>
<div class="stl mono" style="margin-top:30px">mobile type scale</div><div class="f-panel" style="padding:16px"><div class="disp" style="font-size:40px;line-height:1">They work to eat.</div><div class="disp" style="font-size:26px;margin-top:8px">The proof ledger</div><div style="font-size:15px;margin-top:6px;color:var(--bone-2)">Body 15 to 16, never under 14.</div><div class="mono" style="font-size:13px;margin-top:6px">190 MUNCH · C3xY…5ar</div></div></div>'''
mcss='''.msheet{width:1350px;padding:48px 60px 60px}
.mhead h1{font-size:52px;margin:6px 0 8px;font-weight:460}.mhead p{color:var(--bone-2);margin:0 0 30px;max-width:70ch}
.prow{display:grid;grid-template-columns:repeat(3,390px);gap:50px}
.phone{position:relative;width:390px;height:844px;overflow:hidden;border-radius:34px;background:var(--forest) var(--tex-forest);box-shadow:0 0 0 1px var(--soil-line-2),0 0 0 9px #050C08,0 0 0 10px var(--soil-line),0 40px 80px -30px #000}
.mtop{padding:18px 16px 0}.mrow{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.word{font-size:30px;font-weight:520;letter-spacing:-.02em}
.mnote{margin:8px 16px 0;font-size:11.5px;color:var(--bone-2);display:flex;gap:6px;align-items:center}
.mcol{width:390px;padding:0 16px}
.f-claim.m{grid-template-columns:64px 1fr;gap:14px;padding:12px 0}.f-claim.m .seal,.f-claim.m .seal img{width:64px;height:64px}.f-claim.m h5{font-size:17px}
.f-log.m li{grid-template-columns:30px 22px 1fr auto;gap:8px;font-size:14px;padding:4px 4px}
'''
sheetcss=open(B+'_build/sheet.css').read()
html=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Feral mobile components</title><link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="components.css"><style>{sheetcss}{mcss}</style></head><body class="msheet">{sprite}
<header class="mhead"><span class="caps" style="color:var(--bone-3)">Feral · Phase 3 step 1 · mobile 390</span><h1 class="disp">Mobile components <em class="ital" style="color:var(--bone-2);font-weight:380">thumb first</em></h1><p>Every action lives in the bottom dock inside the thumb zone. The canvas stays clear above it. One sheet opens at a time and slides up over the habitat.</p></header>
<div class="prow">{p1}{p2}{p3}</div><div class="sec" style="margin-top:56px"><div class="prow">{col1}{col2}{col3}</div></div></body></html>'''
open(B+'html/components-mobile.html','w').write(html); print('ok')
