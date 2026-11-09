// Renderer independent animation state. Both the PixiJS renderer and the
// Canvas2D fallback draw exactly this. Motion is cosmetic: it is driven by
// verified scene flows and never changes a number shown in the HTML.
import { frameAt, clipSeconds, type Atlas, type Anim, type Clip } from './atlas';
import { art, type Key, type Node, type Scene } from './scene';

export type LayoutName = 'desktop' | 'mobile';
export interface Layout { name: LayoutName; w: number; h: number; size: number; wander: [number, number];
  homes: Record<Key, [number, number]>; fossil: [number, number]; nodes: Record<'market' | 'escrow' | 'furnace' | 'budget', [number, number]> }

// Foot positions and sizes from design/phase3 UI-SPEC 5 (about 1.6x the first build).
export const LAYOUTS: Record<LayoutName, Layout> = {
  desktop: { name: 'desktop', w: 1600, h: 1000, size: 300, wander: [60, 12],
    homes: { moss: [371, 572], echo: [781, 523], pip: [1192, 556], ash: [560, 760], pip2: [1010, 742], pip3: [1400, 700], pip4: [200, 800] }, fossil: [739, 905],
    nodes: { market: [70, 470], escrow: [1010, 410], furnace: [1090, 735], budget: [70, 300] } },
  mobile: { name: 'mobile', w: 800, h: 1100, size: 262, wander: [26, 8],
    homes: { moss: [182, 584], echo: [436, 558], pip: [631, 685], ash: [300, 740], pip2: [600, 820], pip3: [700, 520], pip4: [110, 720] }, fossil: [356, 900],
    nodes: { market: [30, 520], escrow: [610, 430], furnace: [640, 850], budget: [30, 380] } },
};

const SPEED: Record<string, number> = { moss: 26, echo: 44, pip: 20, ash: 30 };
export const SCALE: Record<string, number> = { moss: 1.03, echo: 0.99, pip: 0.78, ash: 0.91 };
// Several fossils can rest in the soil in live play. Offsets fan them out.
const FOSSIL_FAN: [number, number][] = [[0, 0], [-300, 6], [300, 6], [-560, 14], [560, 14], [-680, 20], [680, 20]];

export interface Body { key: Key; x: number; y: number; tx: number; ty: number; wait: number; facing: 1 | -1; moving: boolean;
  t: number; alpha: number; targetAlpha: number; cool: number; coolTarget: number; anim: Anim; animT: number; clip: Clip; overlay: Clip | null;
  frame: number; scale: number; glow: number; visible: boolean; breathe: number; bob: number; fx: number; fy: number; special: Anim | null; specialUntil: number }
export interface Particle { on: boolean; kind: 'coin' | 'dust' | 'shard'; x: number; y: number; x0: number; y0: number; x1: number; y1: number; cx: number; cy: number;
  t: number; dur: number; delay: number; size: number; alpha: number; then: 'dust' | 'none' | 'stop' }

export class World {
  layout: Layout = LAYOUTS.desktop;
  bodies = new Map<Key, Body>();
  particles: Particle[] = [];
  scene!: Scene;
  reduced = false;
  stamp = { alpha: 0, target: 0, scale: 1, big: false };
  ring = { t: -1 };
  ringKey: Key = 'pip';
  lineage = 0; lineageTarget = 0;
  quiet = 0; quietTarget = 0;
  time = 0;
  constructor(public atlas: Atlas, maxParticles: number) {
    for (let i = 0; i < maxParticles; i++) this.particles.push({ on: false, kind: 'coin', x: 0, y: 0, x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, t: 0, dur: 1, delay: 0, size: 24, alpha: 1, then: 'none' });
  }
  setLayout(name: LayoutName) {
    if (this.layout.name === name && this.bodies.size) return;
    this.layout = LAYOUTS[name];
    for (const b of this.bodies.values()) { const [x, y] = this.home(b.key); b.x = b.tx = x; b.y = b.ty = y; }
    for (const p of this.particles) p.on = false;
  }
  home(k: Key): [number, number] {
    const c = this.scene?.creatures.find(c => c.key === k);
    if (!c || c.active) return this.layout.homes[k];
    const i = Math.max(0, this.scene.creatures.filter(x => !x.active).findIndex(x => x.key === k));
    const [dx, dy] = FOSSIL_FAN[i % FOSSIL_FAN.length], m = this.layout.name === 'mobile' ? 0.55 : 1;
    return [this.layout.fossil[0] + dx * m, this.layout.fossil[1] + dy];
  }
  // animate=false snaps (scrubbing, jumps, first paint). Only a forward step
  // by one recorded event plays its flows.
  setScene(s: Scene, animate: boolean) {
    const prev = this.scene; this.scene = s;
    const motion = animate && !this.reduced;
    for (const c of s.creatures) {
      let b = this.bodies.get(c.key);
      const [hx, hy] = this.home(c.key);
      if (!b) {
        b = { key: c.key, x: hx, y: hy, tx: hx, ty: hy, wait: Math.random() * 2, facing: 1, moving: false, t: Math.random() * 6, alpha: 1, targetAlpha: 1, cool: c.active ? 0 : 1, coolTarget: c.active ? 0 : 1,
          anim: 'idle', animT: 0, clip: this.atlas.clip(c.key, 'idle', c.pose), overlay: null, frame: 0, scale: SCALE[art(c.key)], glow: 0, visible: true, breathe: 0, bob: 0, fx: hx, fy: hy, special: null, specialUntil: 0 };
        this.bodies.set(c.key, b);
        if (animate && s.hatch && c.key === (s.hatchKey ?? 'pip')) { this.ringKey = c.key; b.alpha = 0; b.targetAlpha = 1; this.ring.t = this.reduced ? -1 : 0; if (motion) this.playSpecial(b, 'hatch', 0.45); }
      }
      const wasActive = prev?.creatures.find(p => p.key === c.key)?.active;
      if (motion && wasActive && !c.active) this.playSpecial(b, 'cooling');
      if (motion && s.kind === 'child-first-bid' && c.key === 'pip') this.playSpecial(b, 'first_bid');
      if (!motion) b.special = null;
      b.visible = true; b.targetAlpha = 1;
      b.coolTarget = c.active ? 0 : 1;
      if (!animate) { b.cool = b.coolTarget; b.alpha = 1; b.x = b.tx = hx; b.y = b.ty = hy; }
      else if (!c.active && b.cool < 1) { b.fx = b.x; b.fy = b.y; b.tx = hx; b.ty = hy; b.wait = 0; }
      b.glow = c.mood === 'abundant' ? 1 : c.mood === 'steady' ? 0.55 : c.mood === 'hungry' ? 0.25 : 0.08;
      this.pickClip(b, c.pose);
    }
    for (const [k, b] of this.bodies) if (!s.creatures.some(c => c.key === k)) { b.visible = false; b.alpha = 0; }
    this.lineageTarget = s.born ? 1 : 0; if (!motion) this.lineage = this.lineageTarget;
    this.quietTarget = s.creatures.some(c => !c.active) ? 1 : 0; if (!motion) this.quiet = this.quietTarget;
    this.stamp.target = s.refusalSeen ? 1 : 0; this.stamp.big = s.refusal;
    if (!motion) { this.stamp.alpha = this.stamp.target; this.stamp.scale = 1; }
    else if (s.refusal) { this.stamp.alpha = 0; this.stamp.scale = 1.25; }
    if (!animate) { this.ring.t = -1; for (const p of this.particles) p.on = false; }
    if (motion && prev && s.index === prev.index + 1) this.spawnFlows(s);
    if (motion && s.refusal) this.spawnShard();
  }
  playSpecial(b: Body, anim: Anim, delay = 0) {
    if (!this.atlas.has(b.key, anim)) return;
    b.special = anim; b.specialUntil = this.time + delay + clipSeconds(this.atlas.clip(b.key, anim, 'front')) + 0.05;
    b.anim = anim; b.clip = this.atlas.clip(b.key, anim, 'front'); b.animT = -delay;
    if (anim === 'hatch') b.alpha = 1;
  }
  pickClip(b: Body, pose = this.scene.creatures.find(c => c.key === b.key)!.pose) {
    if (b.special && this.time < b.specialUntil) return;
    b.special = null;
    const working = this.scene.working.includes(b.key);
    const anim: Anim = pose === 'fossil' ? 'fossil' : working ? 'work' : b.moving ? 'walk' : 'idle';
    const clip = this.atlas.clip(b.key, anim, pose);
    if (clip !== b.clip || anim !== b.anim) { b.clip = clip; b.anim = anim; b.animT = 0; }
    b.overlay = pose === 'hungry' || pose === 'critical' ? this.atlas.overlay(b.key, pose) : null;
  }
  pos(n: Node): [number, number] {
    if (n === 'market' || n === 'escrow' || n === 'furnace' || n === 'budget') return this.layout.nodes[n];
    const b = this.bodies.get(n);
    const lift = this.layout.size * 0.35;
    return b ? [b.x, b.y - lift] : [this.layout.homes[n][0], this.layout.homes[n][1] - lift];
  }
  free() { return this.particles.find(p => !p.on); }
  spawnFlows(s: Scene) {
    s.flows.forEach((f, fi) => {
      const hk = s.hatchKey ?? 'pip';
      const [x0, y0] = this.pos(f.from), [x1, y1] = f.to === hk && s.hatch ? [this.layout.homes[hk][0], this.layout.homes[hk][1] - 40] : this.pos(f.to);
      const n = Math.min(12, 4 + Math.round(f.amount / 20));
      for (let i = 0; i < n; i++) {
        const p = this.free(); if (!p) return;
        const lift = 90 + Math.random() * 60;
        Object.assign(p, { on: true, kind: 'coin', x0, y0, x1, y1, x: x0, y: y0, cx: (x0 + x1) / 2 + (Math.random() - 0.5) * 80, cy: Math.min(y0, y1) - lift,
          t: 0, dur: 1.25 + Math.random() * 0.4, delay: fi * 0.3 + i * 0.09 + (s.hatch && f.to === hk ? 0.9 : 0), size: (this.layout.name === 'mobile' ? 40 : 36) + Math.random() * 8, alpha: 1, then: f.to === 'furnace' ? 'dust' : 'none' });
      }
    });
  }
  spawnShard() {
    const [x, y] = this.layout.fossil; const p = this.free(); if (!p) return;
    Object.assign(p, { on: true, kind: 'shard', x0: x + 20, y0: y - 60, x1: x + 70, y1: y - 110, x: x + 20, y: y - 60, cx: x + 50, cy: y - 120, t: 0, dur: 0.9, delay: 0.2, size: 30, alpha: 1, then: 'stop' });
  }
  update(dt: number) {
    dt = Math.min(dt, 0.05); this.time += dt;
    const ease = (v: number, target: number, rate: number) => v + (target - v) * Math.min(1, dt * rate);
    for (const b of this.bodies.values()) {
      const c = this.scene.creatures.find(c => c.key === b.key);
      if (!c) continue;
      // reduced motion: opacity only, no travel
      if (b.special === 'hatch') b.targetAlpha = 1;
      b.alpha = b.special === 'hatch' ? 1 : this.reduced ? (b.alpha < b.targetAlpha ? Math.min(b.targetAlpha, b.alpha + dt / 0.2) : b.targetAlpha) : ease(b.alpha, b.targetAlpha, b.key === this.ringKey && this.ring.t >= 0 && this.ring.t < 0.45 ? 0 : 3.2);
      b.cool = this.reduced ? b.coolTarget : b.coolTarget > b.cool ? Math.min(1, b.cool + dt / 0.65) : b.coolTarget;
      const settled = !c.active;
      if (this.reduced || settled) {
        if (settled && !this.reduced && b.cool < 1) { const k = 1 - Math.pow(1 - b.cool, 3); b.x = b.fx + (b.tx - b.fx) * k; b.y = b.fy + (b.ty - b.fy) * k; }
        else { const [hx, hy] = this.home(b.key); b.x = hx; b.y = hy; }
        b.moving = false; b.breathe = this.reduced || settled ? 0 : Math.sin(this.time * 1.4) * 0.012; b.bob = 0;
      } else {
        const pace = c.mood === 'critical' ? 0 : c.mood === 'hungry' ? 0.5 : 1;
        b.t += dt;
        if (b.wait > 0 || pace === 0 || this.scene.working.includes(b.key)) {
          b.wait -= dt; b.moving = false;
          if (b.wait <= 0 && pace > 0) {
            const [hx, hy] = this.home(b.key), [rx, ry] = this.layout.wander;
            const r = art(b.key) === 'pip' ? 0.5 : 1;
            b.tx = hx + (Math.random() * 2 - 1) * rx * r; b.ty = hy + (Math.random() * 2 - 1) * ry;
          }
        } else {
          const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
          const step = SPEED[art(b.key)] * pace * dt * (this.layout.name === 'mobile' ? 0.6 : 1);
          if (d <= step || d < 1) { b.x = b.tx; b.y = b.ty; b.moving = false; b.wait = 2.5 + Math.random() * (art(b.key) === 'pip' ? 2 : 4); }
          else { b.x += dx / d * step; b.y += dy / d * step; b.moving = true; if (Math.abs(dx) > 2) b.facing = dx > 0 ? 1 : -1; }
        }
        const rate = c.mood === 'critical' ? 0.7 : c.mood === 'hungry' ? 1.1 : 1.6;
        b.breathe = Math.sin(b.t * rate * 2) * (c.mood === 'critical' ? 0.008 : 0.016);
        // walking from code: a short step bob when no walk strip exists
        b.bob = b.moving && !this.atlas.has(b.key, 'walk') ? Math.abs(Math.sin(b.t * (art(b.key) === 'pip' ? 9 : 7))) * -5 : 0;
      }
      this.pickClip(b, c.pose);
      b.animT += dt;
      const n = b.clip.frames.length;
      b.frame = n <= 1 || this.reduced ? 0 : frameAt(b.clip, Math.max(0, b.animT));
    }
    if (this.ring.t >= 0) { this.ring.t += dt / 0.9; if (this.ring.t > 1.4) this.ring.t = -1; }
    this.lineage = this.reduced ? this.lineageTarget : ease(this.lineage, this.lineageTarget, 2.5);
    this.quiet = ease(this.quiet, this.quietTarget, 2);
    this.stamp.alpha = ease(this.stamp.alpha, this.stamp.target, this.reduced ? 20 : 6);
    this.stamp.scale = ease(this.stamp.scale, 1, 7);
    for (const p of this.particles) {
      if (!p.on) continue;
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.t += dt / p.dur;
      if (p.kind === 'dust') { p.y -= dt * 30; p.alpha = Math.max(0, 1 - p.t); if (p.t >= 1) p.on = false; continue; }
      const t = Math.min(1, p.t), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, u = 1 - e;
      p.x = u * u * p.x0 + 2 * u * e * p.cx + e * e * p.x1; p.y = u * u * p.y0 + 2 * u * e * p.cy + e * e * p.y1;
      if (p.kind === 'shard' && p.t >= 1) { p.alpha -= dt * 1.2; if (p.alpha <= 0) p.on = false; continue; }
      if (p.t >= 1) {
        if (p.then === 'dust') { p.kind = 'dust'; p.t = 0; p.dur = 0.9 + Math.random() * 0.5; p.size *= 0.6; p.x += (Math.random() - 0.5) * 30; }
        else p.on = false;
      }
    }
  }
}
