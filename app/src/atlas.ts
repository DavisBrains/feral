// Sprite loader. Phase 2 animation strips drop in through
// design/phase2/manifest.json. Anything missing falls back to the approved
// static phase 1 frame for the creature's mood pose.
import { art, type Key, type Pose } from './scene';
import habitatDesktop from '../../design/phase1/runtime/habitat/habitat_desktop.webp';
import habitatMobile from '../../design/phase1/runtime/habitat/habitat_mobile.webp';
import leaves from '../../design/phase1/runtime/habitat/layers/foreground_leaves.webp';
import coin from '../../design/phase1/runtime/props/munch_seed_coin_front.webp';
import stamp from '../../design/phase1/runtime/props/refusal_stamp.webp';

declare const __OFFLINE__: boolean;
// The single file build carries the 128 px runtime set to stay inside the
// 1.2 MB budget. The web build loads the 256 px set for sharp hi-dpi output.
const SMALL = typeof __OFFLINE__ !== 'undefined' && __OFFLINE__;
const phase1 = (SMALL
  ? import.meta.glob('../../design/phase1/runtime/creatures/{moss,echo,pip,ash}/*_{front,hungry,critical,fossil}_128.webp', { eager: true, query: '?url', import: 'default' })
  : import.meta.glob('../../design/phase1/runtime/creatures/{moss,echo,pip,ash}/*_{front,hungry,critical,fossil}.webp', { eager: true, query: '?url', import: 'default' })) as Record<string, string>;
const p2manifest = import.meta.glob('../../design/phase2/{manifest.json,runtime/manifest.json}', { eager: true, import: 'default' }) as Record<string, any>;
const p2files = (SMALL
  ? import.meta.glob(['../../design/phase2/runtime/**/*_128.webp'], { eager: true, query: '?url', import: 'default' })
  : import.meta.glob(['../../design/phase2/runtime/**/*_256.webp'], { eager: true, query: '?url', import: 'default' })) as Record<string, string>;
const VARIANT = SMALL ? '128' : '256';
// Designer animation names mapped onto what the renderer asks for.
const ALIAS: Record<string, string> = { death: 'cooling' };

export type Anim = 'idle' | 'walk' | 'work' | 'receive' | 'send' | 'seed_open' | 'parent' | 'ripple' | 'hatch' | 'first_bid' | 'cooling' | 'fossil';
export interface Frame { img: HTMLImageElement; sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; cell: number; ax: number; ay: number }
export interface Clip { frames: Frame[]; fps: number; loop: boolean; source: 'phase1' | 'phase2'; durations?: number[]; total?: number }
// Frame index for a clip at time t seconds, honouring per frame durations.
export function frameAt(c: Clip, t: number): number {
  const n = c.frames.length; if (n <= 1) return 0;
  if (c.durations?.length === n) {
    const ms = c.durations.map(d => d || 400), total = ms.reduce((a, b) => a + b, 0);
    let x = t * 1000; if (c.loop) x %= total; else if (x >= total) return n - 1;
    for (let i = 0; i < n; i++) { if (x < ms[i]) return i; x -= ms[i]; }
    return n - 1;
  }
  const f = Math.floor(t * (c.fps || 8));
  return c.loop ? f % n : Math.min(n - 1, f);
}
export const clipSeconds = (c: Clip) => c.durations?.length ? c.durations.reduce((a, b) => a + (b || 400), 0) / 1000 : c.frames.length / (c.fps || 8);
export interface Atlas {
  habitat: { desktop: HTMLImageElement; mobile: HTMLImageElement; leaves: HTMLImageElement };
  coin: HTMLImageElement; stamp: HTMLImageElement;
  clip(key: Key, anim: Anim, pose: Pose): Clip;
  has(key: Key, anim: Anim): boolean;
  /** Whether designer art exists for this creature's fossil pose. */
  hasFossil(key: Key): boolean;
  overlay(key: Key, pose: Pose): Clip | null;
  phase2: { loaded: boolean; clips: number; notes: string[] };
}

const load = (src: string) => new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = () => fail(new Error('image ' + src.slice(0, 60))); i.src = src; });

// Normalises the few manifest shapes a designer is likely to hand over.
export function parsePhase2(m: any, variant = '128'): { key: string; anim: string; file: string; frames: number; fps: number; loop: boolean; w: number; h: number; ax: number; ay: number; rects?: number[][]; durations?: number[] }[] {
  if (!m) return [];
  const size = m.frame_size ?? [128, 128];
  const anchor = m.foot_anchor ?? m.anchor ?? [size[0] / 2, Math.round(size[1] * 0.887)];
  const rows: any[] = [];
  const push = (key: string, anim: string, s: any) => rows.push({ key, anim, ...s });
  const tree = m.creatures ?? m.animations;
  const flat = (s: any) => { const v = s.variants?.[variant] ?? (s.variants ? Object.values<any>(s.variants)[0] : null); return v ? { ...s, file: v.file, frame_size: [v.frame_width, v.frame_height], anchor: v.anchor ?? v.foot_anchor } : s; };
  if (Array.isArray(tree)) for (const s of tree) push(s.creature, s.animation ?? s.name ?? s.anim, flat(s));
  else if (tree) for (const [key, val] of Object.entries<any>(tree)) {
    if (val && typeof val === 'object' && 'creature' in val) push(val.creature, val.animation ?? key, flat(val));
    else for (const [anim, s] of Object.entries<any>(val)) push(key, anim, flat(s));
  }
  return rows.filter(r => r.key && r.anim && (r.file ?? r.sheet ?? r.strip)).map(r => {
    const fs = r.frame_size ?? size, an = r.foot_anchor ?? r.anchor ?? anchor;
    const raw = String(r.anim).toLowerCase().replace(/[- ]/g, '_'), anim = ALIAS[raw] ?? raw;
    return { key: String(r.key).toLowerCase(), anim, file: r.file ?? r.sheet ?? r.strip,
      frames: Number(r.frames ?? r.frame_count ?? r.rects?.length ?? 1), fps: Number(r.fps ?? r.frame_rate ?? m.fps ?? 8),
      loop: r.loop ?? !['seed_open', 'hatch', 'cooling', 'first_bid', 'ripple'].includes(anim), w: fs[0], h: fs[1], ax: an[0], ay: an[1], rects: r.rects ?? r.trims, durations: r.frame_durations_ms };
  });
}

const p2url = (file: string) => {
  const clean = file.replace(/^\.?\//, '').replace(/^design\/phase2\//, '');
  return Object.entries(p2files).find(([k]) => k.endsWith('/design/phase2/' + clean) || k.endsWith('/design/phase2/runtime/' + clean))?.[1];
};

export async function loadAtlas(): Promise<Atlas> {
  const notes: string[] = [];
  const statics: Record<string, HTMLImageElement> = {};
  await Promise.all(Object.entries(phase1).map(async ([k, url]) => {
    const m = k.match(/creatures\/(\w+)\/\1_(front|hungry|critical|fossil)(?:_128)?\.webp$/);
    if (m) statics[`${m[1]}:${m[2]}`] = await load(url);
  }));
  const [desktop, mobile, leavesImg, coinImg, stampImg] = await Promise.all([habitatDesktop, habitatMobile, leaves, coin, stamp].map(load));
  const clips = new Map<string, Clip>();
  const manifest = Object.values(p2manifest)[0];
  for (const r of parsePhase2(manifest, VARIANT)) {
    const url = p2url(r.file);
    if (!url) { notes.push(`missing strip ${r.file}`); continue; }
    try {
      const img = await load(url);
      const frames: Frame[] = [];
      for (let f = 0; f < r.frames; f++) {
        const rect = r.rects?.[f];
        // rects may be [x,y,w,h] inside the strip, optionally [x,y,w,h,dx,dy] trim offsets
        frames.push(rect ? { img, sx: rect[0], sy: rect[1], sw: rect[2], sh: rect[3], dx: rect[4] ?? 0, dy: rect[5] ?? 0, cell: r.w, ax: r.ax, ay: r.ay }
          : { img, sx: f * r.w, sy: 0, sw: r.w, sh: r.h, dx: 0, dy: 0, cell: r.w, ax: r.ax, ay: r.ay });
      }
      if (frames.every(fr => fr.sx + fr.sw <= img.naturalWidth && fr.sy + fr.sh <= img.naturalHeight)) clips.set(`${r.key}:${r.anim}`, { frames, fps: r.fps, loop: r.loop, source: 'phase2', durations: r.durations });
      else notes.push(`strip ${r.file} smaller than its frame list`);
    } catch (e: any) { notes.push(String(e.message)); }
  }
  const still = (k: Key, pose: Pose): Clip => {
    const key = art(k);
    const img = statics[`${key}:${pose}`] ?? statics[`${key}:front`];
    return { frames: [{ img, sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight, dx: 0, dy: 0, cell: img.naturalWidth, ax: img.naturalWidth / 2, ay: img.naturalHeight * 227 / 256 }], fps: 0, loop: true, source: 'phase1' };
  };
  return {
    habitat: { desktop, mobile, leaves: leavesImg }, coin: coinImg, stamp: stampImg,
    phase2: { loaded: clips.size > 0, clips: clips.size, notes },
    overlay: (k, pose) => { const key = art(k); return clips.get(`${key}:overlay_${pose}`) ?? clips.get(`${key}:${pose}_overlay`) ?? null; },
    has: (k, anim) => clips.has(`${art(k)}:${anim}`),
    hasFossil: k => !!statics[`${art(k)}:fossil`] || clips.has(`${art(k)}:fossil`),
    clip(k, anim, pose) {
      const key = art(k);
      if (anim === 'cooling' || anim === 'hatch' || anim === 'first_bid') { const c = clips.get(`${key}:${anim}`); if (c) return c; }
      if (pose === 'fossil') return clips.get(`${key}:fossil`) ?? still(key, 'fossil');
      const c = clips.get(`${key}:${anim}`) ?? (anim !== 'idle' ? clips.get(`${key}:idle`) : undefined);
      // Hungry and critical must stay readable. Use an animated base only
      // when the designer also supplied that mood's overlay.
      if (c && (pose === 'front' || this.overlay(key, pose))) return c;
      return still(key, pose);
    },
  };
}
