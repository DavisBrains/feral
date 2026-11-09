// Keep awake. Render's free plan sleeps a web service after 15 quiet minutes, and the
// first visit after that waits about a minute. Until FERAL_KEEP_AWAKE_UNTIL the keeper asks its
// own public /healthz every 10 minutes. That route reads no chain and calls no model, so the ping
// costs nothing. One service awake all month fits inside Render's 750 free hours.
export function keepAwake({ url, until, everyMs = 10 * 60e3, fetchImpl = fetch, now = () => Date.now(), timers = { setInterval, clearInterval }, log = () => {} } = {}) {
  let pings = 0;
  const end = Date.parse(until ?? '');
  if (!url || !Number.isFinite(end) || now() >= end) return null;
  const id = timers.setInterval(() => {
    if (now() >= end) return timers.clearInterval(id);
    fetchImpl(new URL('/healthz', url), { signal: AbortSignal.timeout(15000) })
      .then(r => { if (pings++ % 144 === 0) log(`keep awake ping ${r.status ?? 'sent'}`); }, e => log(`keep awake ping failed, ${String(e.message).slice(0, 80)}`));
  }, everyMs);
  return id;
}
