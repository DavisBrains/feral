// Who steers the live season. The chain keeps the visitor who started it. The
// keeper keeps the current helm in meta, so an idle season can pass to the next
// visitor and the showcase season keeps going instead of being wiped.
export const TAKEOVER_MS = Number(process.env.FERAL_TAKEOVER_MS || 2 * 60 * 1000);
export const isEnded = s => !s || !!s.closed || ['won', 'lost', 'failed'].includes(s.status) || String(s.status).startsWith('abandoned');
export function helmOf(meta, s) {
  if (!s) return null;
  return meta?.helm?.season === s.id && meta.helm.pilot ? meta.helm.pilot : s.pilot;
}
export function you(meta, s, me, now, { paused = false, takeoverMs = TAKEOVER_MS } = {}) {
  if (paused) return { pilot: false, can_start: false, can_take: false, lease_left_ms: 0 };
  const ended = isEnded(s), live = s && s.status === 'live' && !ended;
  const pilot = !!(s && me && helmOf(meta, s) === me);
  const idle = now - (meta?.lastActivity ?? 0);
  const can_take = !!(live && me && !pilot && idle > takeoverMs);
  // A new season only once this one ends, or by the pilot who holds it.
  const can_start = !!(ended || pilot || (s && !live && idle > takeoverMs));
  return { pilot, can_start, can_take, lease_left_ms: live && !pilot ? Math.max(0, takeoverMs - idle) : 0 };
}
// Check and set in one synchronous step so two visitors cannot both take it.
export function takeOver(meta, s, me, now, opts) {
  const y = you(meta, s, me, now, opts);
  if (!y.can_take) return { ok: false, error: y.pilot ? 'You already hold this season.' : 'This season is still in use. Watch, or try again when it sits idle.' };
  meta.helm = { season: s.id, pilot: me, since: now };
  meta.lastActivity = now;
  return { ok: true };
}
