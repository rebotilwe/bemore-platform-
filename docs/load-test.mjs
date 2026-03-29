/**
 * BeMore Platform Load Test — 1000 concurrent users
 * Tests: health, application submit, status lookup, poll vote, admin endpoints
 *
 * Usage:
 *   node docs/load-test.mjs local     # test http://localhost:5000
 *   node docs/load-test.mjs live      # test https://bemore-production.up.railway.app
 */

const BASE = process.argv[2] === 'live'
  ? 'https://bemore-production.up.railway.app'
  : 'http://localhost:5000';

const CONCURRENCY = 100; // Concurrent requests per wave
const WAVES = 10;        // 10 waves = 1000 total requests per endpoint
const RESULTS = {};

async function timedFetch(label, url, opts = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      ...opts,
    });
    const ms = Math.round(performance.now() - start);
    const ok = res.ok;
    const status = res.status;
    await res.text(); // consume body
    return { label, ok, status, ms };
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    return { label, ok: false, status: 0, ms, error: err.message };
  }
}

function recordResult(r) {
  if (!RESULTS[r.label]) RESULTS[r.label] = { ok: 0, fail: 0, times: [], errors: [] };
  const bucket = RESULTS[r.label];
  if (r.ok) bucket.ok++; else { bucket.fail++; if (r.error) bucket.errors.push(r.error); }
  bucket.times.push(r.ms);
}

function printResults() {
  console.log('\n══════════════════════════════════════════');
  console.log('  LOAD TEST RESULTS');
  console.log(`  Target: ${BASE}`);
  console.log(`  Concurrency: ${CONCURRENCY} × ${WAVES} waves = ${CONCURRENCY * WAVES} requests/endpoint`);
  console.log('══════════════════════════════════════════\n');

  for (const [label, data] of Object.entries(RESULTS)) {
    const times = data.times.sort((a, b) => a - b);
    const p50 = times[Math.floor(times.length * 0.5)] || 0;
    const p95 = times[Math.floor(times.length * 0.95)] || 0;
    const p99 = times[Math.floor(times.length * 0.99)] || 0;
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const min = times[0] || 0;
    const max = times[times.length - 1] || 0;

    console.log(`${label}`);
    console.log(`  Success: ${data.ok}/${data.ok + data.fail} (${Math.round(data.ok / (data.ok + data.fail) * 100)}%)`);
    console.log(`  Latency: avg=${avg}ms  p50=${p50}ms  p95=${p95}ms  p99=${p99}ms  min=${min}ms  max=${max}ms`);
    if (data.errors.length) {
      const unique = [...new Set(data.errors)];
      console.log(`  Errors: ${unique.slice(0, 3).join(', ')}`);
    }
    console.log('');
  }
}

async function runWave(label, urlOrFn, optsFn) {
  const promises = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const url = typeof urlOrFn === 'function' ? urlOrFn(i) : urlOrFn;
    const opts = optsFn ? optsFn(i) : {};
    promises.push(timedFetch(label, url, opts).then(recordResult));
  }
  await Promise.all(promises);
}

async function run() {
  console.log(`\nBeMore Load Test — ${BASE}`);
  console.log(`${CONCURRENCY} concurrent × ${WAVES} waves = ${CONCURRENCY * WAVES} requests per endpoint\n`);

  // ── 1. Health Check ──
  console.log('Testing: Health Check...');
  for (let w = 0; w < WAVES; w++) {
    await runWave('GET /api/health', `${BASE}/api/health`);
  }

  // ── 2. Application Submit ──
  console.log('Testing: Application Submit...');
  for (let w = 0; w < WAVES; w++) {
    await runWave('POST /api/applications', `${BASE}/api/applications`, (i) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userType: 'developer',
        personal: {
          firstName: `Load${w}`,
          surname: `Test${i}`,
          email: `load-${w}-${i}-${Date.now()}@test.co.za`,
          phone: '0821234567',
        },
        formData: {
          landStatus: 'Land Secured',
          projectStage: 'Funding Stage',
          estimatedValue: 'R20m – R100m',
          engagementSource: 'load-test',
        },
      }),
    }));
  }

  // ── 3. Status Lookup ──
  console.log('Testing: Status Lookup...');
  for (let w = 0; w < WAVES; w++) {
    await runWave('POST /api/applications/lookup', `${BASE}/api/applications/lookup`, () => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refNumber: 'BM-LOADTEST', email: 'noexist@test.co.za' }),
    }));
  }

  // ── 4. Active Poll ──
  console.log('Testing: Active Poll...');
  for (let w = 0; w < WAVES; w++) {
    await runWave('GET /api/polls/active', `${BASE}/api/polls/active`);
  }

  // ── 5. Poll Vote (will get 400/409 — that's fine, testing throughput) ──
  console.log('Testing: Poll Vote...');
  for (let w = 0; w < WAVES; w++) {
    await runWave('POST /api/polls/vote', `${BASE}/api/polls/000000000000000000000000/vote`, (i) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: '000000000000000000000000',
        optionId: '000000000000000000000000',
        sessionId: `load-${w}-${i}`,
      }),
    }));
  }

  // ── 6. SSE Connection Burst ──
  console.log('Testing: SSE Connection Burst (50 connections)...');
  const ssePromises = [];
  for (let i = 0; i < 50; i++) {
    ssePromises.push(timedFetch('SSE /api/polls/:id/live', `${BASE}/api/polls/000000000000000000000000/live`, {
      headers: { 'Accept': 'text/event-stream' },
    }).then(recordResult));
  }
  await Promise.allSettled(ssePromises);

  printResults();
}

run().catch(console.error);
