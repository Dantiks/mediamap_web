// Нагрузочный тест главной страницы локальной сборки.
// Запуск: node scripts/security-tests/load-home.mjs [url] [concurrency] [seconds]
const url = process.argv[2] ?? "http://127.0.0.1:3016/ru";
const conc = Number(process.argv[3] ?? 50);
const secs = Number(process.argv[4] ?? 15);
const end = Date.now() + secs * 1000;
let ok = 0, fail = 0, codes = {};
const lat = [];
async function worker() {
  while (Date.now() < end) {
    const t = performance.now();
    try {
      const r = await fetch(url);
      await r.arrayBuffer();
      lat.push(performance.now() - t);
      codes[r.status] = (codes[r.status] ?? 0) + 1;
      r.ok ? ok++ : fail++;
    } catch { fail++; }
  }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: conc }, worker));
const dt = (Date.now() - t0) / 1000;
lat.sort((a, b) => a - b);
const pct = (p) => lat.length ? lat[Math.floor(lat.length * p)].toFixed(1) : "-";
console.log(JSON.stringify({ url, conc, secs: +dt.toFixed(1), total: ok + fail, ok, fail, rps: +((ok + fail) / dt).toFixed(1), codes, latency_ms: { p50: pct(0.5), p90: pct(0.9), p99: pct(0.99), max: lat.length ? lat.at(-1).toFixed(1) : "-" } }, null, 2));
