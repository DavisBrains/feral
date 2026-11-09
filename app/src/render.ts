// Two renderers over the same World and Atlas: PixiJS (WebGL) first and a
// plain Canvas2D fallback.
import * as PIXI from 'pixi.js';
import 'pixi.js/unsafe-eval'; // strict CSP without eval
import type { Frame } from './atlas';
import type { Key } from './scene';
import type { World } from './world';

export interface Renderer { kind: 'pixi' | 'canvas2d'; resize(cssW: number, cssH: number, dpr: number): void; draw(w: World): void; destroy(): void }

export const COLORS: Record<Key, string> = { moss: '#b5fc71', echo: '#7dd9ef', pip: '#d4a4ff', ash: '#d39767' };
const hex = (c: string) => parseInt(c.slice(1), 16);

// Soft radial pools for shadows and mood light. Flat ellipses look cheap.
let softCache: HTMLCanvasElement | null = null;
export function softDisc(): HTMLCanvasElement {
  if (softCache) return softCache;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return (softCache = c);
}
export interface Pool { x: number; y: number; rx: number; ry: number; color: string; alpha: number }
export function pools(w: World): Pool[] {
  const out: Pool[] = [];
  for (const b of w.bodies.values()) {
    if (!b.visible) continue;
    const c = w.scene.creatures.find(c => c.key === b.key); if (!c) continue;
    const r = w.layout.size * b.scale;
    if (c.active) out.push({ x: b.x, y: b.y - r * 0.05, rx: r * 0.75, ry: r * 0.26, color: COLORS[b.key], alpha: 0.32 * b.glow * b.alpha });
    out.push({ x: b.x, y: b.y + 2, rx: r * 0.42, ry: r * 0.09, color: '#000000', alpha: 0.55 * b.alpha });
  }
  return out;
}
// A seed coin turns slowly in flight, showing its edge. Dust does not spin.
export function coinSpin(pt: { kind: string; t: number }, time: number, i: number) {
  if (pt.kind === 'dust') return 1;
  return 0.35 + 0.65 * Math.abs(Math.cos(time * 3.1 + i * 0.9));
}
export interface Placed { key: Key; frame: Frame; overlay: Frame | null; x: number; y: number; w: number; h: number; flip: boolean; alpha: number; warm: number }

// Shared geometry so both renderers place things identically.
export function placeBodies(w: World): Placed[] {
  const out: Placed[] = [];
  for (const b of w.bodies.values()) {
    if (!b.visible || b.alpha <= 0.01) continue;
    const f = b.clip.frames[b.frame] ?? b.clip.frames[0];
    const o = b.overlay ? b.overlay.frames[Math.min(b.frame, b.overlay.frames.length - 1)] : null;
    const s = (w.layout.size * b.scale) / f.cell;
    const sy = s * (1 + b.breathe), sx = s * (1 - b.breathe * 0.5);
    const settled = b.anim === 'fossil' || b.anim === 'cooling';
    // Code tint only stands in for cooling when no designer strip exists.
    out.push({ key: b.key, frame: f, overlay: o, x: b.x, y: b.y + b.bob, w: sx, h: sy, flip: !settled && b.facing < 0, alpha: b.alpha, warm: b.anim === 'fossil' ? 1 - b.cool : 0 });
  }
  return out.sort((a, b) => a.y - b.y);
}
// The lineage root runs under the specimen tags, through the soil.
export function lineageDots(w: World, n = 40): [number, number][] {
  const m = w.bodies.get('moss'), p = w.bodies.get('pip');
  if (!m || !p || w.lineage < 0.02) return [];
  const L = w.layout, x0 = m.x + L.size * 0.12, y0 = m.y + 4, x1 = p.x - L.size * 0.08, y1 = p.y + 4;
  const mid = L.name === 'mobile' ? 790 : 712, cx = (x0 + x1) / 2, cy = 2 * mid - (y0 + y1) / 2;
  const pts: [number, number][] = [];
  const shown = Math.round(n * w.lineage);
  for (let i = 0; i < shown; i++) { const t = i / (n - 1), u = 1 - t; pts.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]); }
  return pts;
}
export function stampRect(w: World) {
  const [fx, fy] = w.layout.fossil, k = w.layout.size / 210;
  const big = w.stamp.big, sw = (big ? 400 : 300) * k * w.stamp.scale, sh = sw * 216 / 384;
  if (w.layout.name === 'mobile') { const mw = (big ? 300 : 240) * w.stamp.scale; return { x: 30 - (mw - 240) / 2, y: fy - 70 - (big ? 20 : 0), w: mw, h: mw * 216 / 384, alpha: w.stamp.alpha }; }
  return { x: fx + 80 * k, y: fy - (big ? 210 : 150) * k, w: sw, h: sh, alpha: w.stamp.alpha * (big ? 1 : 0.92) };
}

export async function createPixi(canvas: HTMLCanvasElement, w: World): Promise<Renderer> {
  const app = new PIXI.Application();
  await app.init({ canvas, width: 10, height: 10, backgroundAlpha: 0, antialias: true, preference: 'webgl', autoStart: false, autoDensity: true, resolution: 1, sharedTicker: false });
  if (app.renderer.type !== PIXI.RendererType.WEBGL) throw new Error('webgl unavailable');
  const sources = new Map<HTMLImageElement, any>();
  const textures = new Map<Frame, any>();
  const src = (img: HTMLImageElement) => { let s = sources.get(img); if (!s) { s = new PIXI.ImageSource({ resource: img }); sources.set(img, s); } return s; };
  const tex = (f: Frame) => { let t = textures.get(f); if (!t) { t = new PIXI.Texture({ source: src(f.img), frame: new PIXI.Rectangle(f.sx, f.sy, f.sw, f.sh) }); textures.set(f, t); } return t; };
  const full = (img: HTMLImageElement) => new PIXI.Texture({ source: src(img) });
  const root = new PIXI.Container(); app.stage.addChild(root);
  const bg = new PIXI.Sprite(); root.addChild(bg);
  const glowLayer = new PIXI.Container(); root.addChild(glowLayer);
  const discTex = new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: softDisc() }) });
  const poolSprites: any[] = [];
  const under = new PIXI.Graphics(); root.addChild(under);
  const creatures = new PIXI.Container(); root.addChild(creatures);
  const coins = new PIXI.Container(); root.addChild(coins);
  const stamp = new PIXI.Sprite(full(w.atlas.stamp)); root.addChild(stamp);
  const leaves = new PIXI.Sprite(full(w.atlas.habitat.leaves)); root.addChild(leaves);
  const shade = new PIXI.Graphics(); root.addChild(shade);
  const coinTex = full(w.atlas.coin);
  const halos = w.particles.map(() => { const s = new PIXI.Sprite(discTex); s.anchor.set(0.5); s.visible = false; s.blendMode = 'add'; s.tint = 0xf3bf88; coins.addChild(s); return s; });
  const pool = w.particles.map(() => { const s = new PIXI.Sprite(coinTex); s.anchor.set(0.5); s.visible = false; coins.addChild(s); return s; });
  const sprites = new Map<Key, { base: any; over: any }>();
  let layoutName = '';
  return {
    kind: 'pixi',
    resize(cssW, cssH, dpr) { app.renderer.resolution = dpr; app.renderer.resize(cssW, cssH); root.scale.set(cssW / w.layout.w); },
    draw(world) {
      if (layoutName !== world.layout.name) {
        layoutName = world.layout.name;
        bg.texture = full(world.layout.name === 'mobile' ? world.atlas.habitat.mobile : world.atlas.habitat.desktop);
        leaves.visible = world.layout.name === 'desktop';
        root.scale.set(app.renderer.width / app.renderer.resolution / world.layout.w);
      }
      under.clear();
      const ps = pools(world);
      while (poolSprites.length < ps.length) { const s = new PIXI.Sprite(discTex); s.anchor.set(0.5); s.blendMode = 'normal'; glowLayer.addChild(s); poolSprites.push(s); }
      poolSprites.forEach((s, i) => { const p = ps[i]; s.visible = !!p; if (!p) return; s.position.set(p.x, p.y); s.width = p.rx * 2; s.height = p.ry * 2; s.tint = hex(p.color); s.alpha = p.alpha; s.blendMode = p.color === '#000000' ? 'normal' : 'add'; });
      const rootPts = lineageDots(world);
      if (rootPts.length > 1) {
        under.moveTo(rootPts[0][0], rootPts[0][1]); for (const [x, y] of rootPts) under.lineTo(x, y);
        under.stroke({ color: 0xd4a4ff, width: 9, alpha: 0.12, cap: 'round', join: 'round' });
        under.moveTo(rootPts[0][0], rootPts[0][1]); for (const [x, y] of rootPts) under.lineTo(x, y);
        under.stroke({ color: 0xe6ccff, width: 2.4, alpha: 0.8, cap: 'round', join: 'round' });
        rootPts.forEach(([x, y], i) => { if (i % 8 === 4) under.circle(x, y, 4).fill({ color: 0xe6ccff, alpha: 0.9 }); });
      }
      if (world.ring.t >= 0) { const p = world.layout.homes.pip, t = Math.min(1, world.ring.t); under.ellipse(p[0], p[1] - 30, 30 + t * 150, 12 + t * 60).stroke({ color: 0xd4a4ff, width: 4, alpha: 1 - t }); under.ellipse(p[0], p[1] - 30, 60, 26).fill({ color: 0xd4a4ff, alpha: 0.35 * (1 - t) }); }
      const placed = placeBodies(world);
      for (const s of sprites.values()) { s.base.visible = false; s.over.visible = false; }
      placed.forEach((p, i) => {
        let s = sprites.get(p.key);
        if (!s) { s = { base: new PIXI.Sprite(), over: new PIXI.Sprite() }; creatures.addChild(s.base, s.over); sprites.set(p.key, s); }
        creatures.setChildIndex(s.base, Math.min(i * 2, creatures.children.length - 1));
        for (const [sp, f] of [[s.base, p.frame], [s.over, p.overlay]] as const) {
          if (!f) continue;
          sp.visible = true; sp.texture = tex(f);
          sp.pivot.set(f.ax - f.dx, f.ay - f.dy); sp.position.set(p.x, p.y);
          sp.scale.set(p.flip ? -p.w : p.w, p.h); sp.alpha = p.alpha;
          sp.tint = p.warm > 0 ? (0xff << 16) | (Math.round(255 - 70 * p.warm) << 8) | Math.round(255 - 140 * p.warm) : 0xffffff;
        }
      });
      world.particles.forEach((pt, i) => {
        const s = pool[i], h = halos[i]; s.visible = h.visible = pt.on && pt.delay <= 0;
        if (!s.visible) return;
        const spin = coinSpin(pt, world.time, i);
        h.position.set(pt.x, pt.y); h.width = h.height = pt.size * 2.4; h.alpha = (pt.kind === 'dust' ? 0.1 : 0.32) * pt.alpha;
        s.position.set(pt.x, pt.y); s.width = pt.size * spin; s.height = pt.size; s.alpha = pt.alpha;
        s.tint = pt.kind === 'dust' ? 0xe9e2d6 : pt.kind === 'shard' ? 0xf3bf88 : 0xffffff;
        if (pt.kind === 'dust') s.alpha = pt.alpha * 0.7;
      });
      const r = stampRect(world); stamp.visible = r.alpha > 0.01; stamp.position.set(r.x, r.y); stamp.width = r.w; stamp.height = r.h; stamp.alpha = r.alpha;
      shade.clear(); if (world.quiet > 0.01) shade.rect(0, 0, world.layout.w, world.layout.h).fill({ color: 0x07140e, alpha: 0.14 * world.quiet });
      app.render();
    },
    destroy() { app.destroy(false); },
  };
}

const tintCache = new Map<string, HTMLCanvasElement>();
function tinted(color: string) {
  let c = tintCache.get(color); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.drawImage(softDisc(), 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, 128, 128);
  tintCache.set(color, c); return c;
}
export function createCanvas2D(canvas: HTMLCanvasElement, w: World): Renderer {
  const ctx = canvas.getContext('2d')!;
  let cssW = 1, dpr = 1;
  const img = (f: Frame, x: number, y: number, sx: number, sy: number, flip: boolean) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -sx : sx, sy);
    ctx.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, -(f.ax - f.dx), -(f.ay - f.dy), f.sw, f.sh); ctx.restore();
  };
  return {
    kind: 'canvas2d',
    resize(W, H, d) { cssW = W; dpr = d; canvas.width = Math.round(W * d); canvas.height = Math.round(H * d); },
    draw(world) {
      const L = world.layout, k = (cssW / L.w) * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.drawImage(L.name === 'mobile' ? world.atlas.habitat.mobile : world.atlas.habitat.desktop, 0, 0, L.w, L.h);
      for (const p of pools(world)) {
        // tint the soft disc through an offscreen pass per colour
        ctx.globalAlpha = p.alpha; ctx.globalCompositeOperation = p.color === '#000000' ? 'source-over' : 'lighter';
        ctx.drawImage(tinted(p.color), p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      const root = lineageDots(world);
      if (root.length > 1) {
        ctx.lineCap = ctx.lineJoin = 'round';
        for (const [wd, a, col] of [[9, 0.12, '#d4a4ff'], [2.4, 0.8, '#e6ccff']] as const) { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); root.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#e6ccff'; root.forEach(([x, y], i) => { if (i % 8 === 4) { ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); } });
      }
      if (world.ring.t >= 0) { const p = L.homes.pip, t = Math.min(1, world.ring.t); ctx.globalAlpha = 1 - t; ctx.strokeStyle = '#d4a4ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(p[0], p[1] - 30, 30 + t * 150, 12 + t * 60, 0, 0, 7); ctx.stroke(); }
      for (const p of placeBodies(world)) {
        ctx.globalAlpha = p.alpha;
        if (p.warm > 0) ctx.filter = `sepia(${p.warm}) saturate(${1 + p.warm * 2})`;
        img(p.frame, p.x, p.y, p.w, p.h, p.flip); if (p.overlay) img(p.overlay, p.x, p.y, p.w, p.h, p.flip);
        ctx.filter = 'none';
      }
      for (const pt of world.particles) {
        if (!pt.on || pt.delay > 0) continue;
        ctx.globalAlpha = pt.kind === 'dust' ? pt.alpha * 0.7 : pt.alpha;
        if (pt.kind === 'dust') { ctx.fillStyle = '#e9e2d6'; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size / 4, 0, 7); ctx.fill(); }
        else {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.32 * pt.alpha; const hs = pt.size * 2.4; ctx.drawImage(tinted('#f3bf88'), pt.x - hs / 2, pt.y - hs / 2, hs, hs); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = pt.alpha;
          const sw = pt.size * coinSpin(pt, world.time, 0); ctx.drawImage(world.atlas.coin, pt.x - sw / 2, pt.y - pt.size / 2, sw, pt.size);
        }
      }
      const r = stampRect(world); if (r.alpha > 0.01) { ctx.globalAlpha = r.alpha; ctx.drawImage(world.atlas.stamp, r.x, r.y, r.w, r.h); }
      ctx.globalAlpha = 1;
      if (L.name === 'desktop') ctx.drawImage(world.atlas.habitat.leaves, 0, 0, L.w, L.h);
      if (world.quiet > 0.01) { ctx.globalAlpha = 0.14 * world.quiet; ctx.fillStyle = '#07140e'; ctx.fillRect(0, 0, L.w, L.h); ctx.globalAlpha = 1; }
    },
    destroy() {},
  };
}
