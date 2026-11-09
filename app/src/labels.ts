// Specimen label placement from UI-SPEC 5. Pure, so it is unit tested.
// Try slots in order, keep each label inside the stage (8 px inset), clear of
// every creature keep out box, every placed label and the canopy notes. The
// chosen slot is cached per creature state so labels do not jump while idle.
export interface Box { x: number; y: number; w: number; h: number }
export type Slot = 'al' | 'ar' | 'l' | 'r' | 'bl' | 'br';
export interface Want { id: string; key: string; box: Box; w: number; h: number; active: boolean }
export interface Placed { key: string; slot: Slot; x: number; y: number; ax: number; ay: number; c1x: number; tx: number; ty: number }
const ORDER: Slot[] = ['al', 'ar', 'l', 'r', 'bl', 'br'];
const PREFER: Record<string, { desktop: Slot; mobile: Slot }> = { moss: { desktop: 'al', mobile: 'al' }, echo: { desktop: 'ar', mobile: 'ar' }, pip: { desktop: 'r', mobile: 'br' }, ash: { desktop: 'l', mobile: 'r' } };
const hit = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export function slotRect(s: Slot, b: Box, w: number, h: number, gap: number): Box {
  const cx = b.x + b.w / 2;
  switch (s) {
    case 'al': return { x: b.x - w * 0.55, y: b.y - h - gap, w, h };
    case 'ar': return { x: b.x + b.w - w * 0.45, y: b.y - h - gap, w, h };
    case 'l': return { x: b.x - w - gap, y: b.y + b.h * 0.28 - h / 2, w, h };
    case 'r': return { x: b.x + b.w + gap, y: b.y + b.h * 0.28 - h / 2, w, h };
    case 'bl': return { x: cx - w - gap / 2, y: b.y + b.h + gap / 2, w, h };
    case 'br': return { x: cx + gap / 2, y: b.y + b.h + gap / 2, w, h };
  }
}
export function placeLabels(items: Want[], W: number, H: number, avoid: Box[], compact: boolean, cache: Map<string, Slot>): Placed[] {
  const inset = 8, gap = compact ? 10 : 18, out: Placed[] = [], taken: Box[] = [...avoid];
  const inside = (r: Box) => r.x >= inset && r.y >= inset && r.x + r.w <= W - inset && r.y + r.h <= H - inset;
  const clamp = (r: Box): Box => ({ ...r, x: Math.max(inset, Math.min(W - inset - r.w, r.x)), y: Math.max(inset, Math.min(H - inset - r.h, r.y)) });
  // above and below slots may slide sideways to stay inside the stage
  const fit = (s: Slot, r: Box): Box => s === 'l' || s === 'r' ? r : { ...r, x: Math.max(inset, Math.min(W - inset - r.w, r.x)) };
  for (const it of items) {
    const boxes = items.filter(o => o !== it).map(o => o.box);
    const ok = (r: Box) => inside(r) && !hit(r, it.box) && !boxes.some(b => hit(r, b)) && !taken.some(b => hit(r, b));
    const pref = PREFER[it.key.replace(/\d+$/, '')]?.[compact ? 'mobile' : 'desktop'];
    const order = [cache.get(it.id), pref, ...ORDER].filter(Boolean) as Slot[];
    // each slot first at its spec spot, then slid along its free axis (sideways for above and below, up and down for the sides), nearest first
    const slid = (s: Slot): Box[] => {
      const base = fit(s, slotRect(s, it.box, it.w, it.h, gap)), side = s === 'l' || s === 'r', span = side ? it.box.h * 0.8 + it.h : it.w;
      const out: Box[] = [base];
      for (let d = 8; d <= span; d += 8) for (const sg of [1, -1]) out.push(side ? { ...base, y: base.y + sg * d } : { ...base, x: base.x + sg * d });
      return out.map(q => ({ ...q, x: Math.round(q.x), y: Math.round(q.y) }));
    };
    let slot: Slot | undefined, r!: Box;
    for (const s of order) { const c = slid(s).find(ok); if (c) { slot = s; r = c; break; } }
    if (!slot) { // nothing fits cleanly: take the least bad slot clamped into the stage
      slot = order.map(s => ({ s, r: clamp(slotRect(s, it.box, it.w, it.h, gap)) })).sort((a, b) => score(a.r) - score(b.r))[0].s;
      r = clamp(slotRect(slot, it.box, it.w, it.h, gap));
    }
    function score(q: Box) { return (hit(q, it.box) ? 4 : 0) + boxes.filter(b => hit(q, b)).length * 2 + taken.filter(b => hit(q, b)).length * 3; }
    cache.set(it.id, slot); taken.push(r);
    // leader: from the label side that faces the creature (top middle for slots below) to the keep out edge by its head
    const headY = it.box.y + it.box.h * 0.3, below = slot === 'bl' || slot === 'br';
    const leftOf = r.x + r.w / 2 < it.box.x + it.box.w / 2;
    const ax = below ? r.x + r.w / 2 : leftOf ? r.x + r.w : r.x, ay = below ? r.y : r.y + r.h / 2;
    const tx = below ? Math.max(it.box.x, Math.min(it.box.x + it.box.w, ax)) : leftOf ? it.box.x : it.box.x + it.box.w;
    const ty = below ? it.box.y + it.box.h : headY;
    out.push({ key: it.key, slot, x: Math.round(r.x), y: Math.round(r.y), ax, ay, c1x: (ax + tx) / 2, tx, ty });
  }
  return out;
}
