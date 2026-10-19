import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { StreamingServer } from '../server.ts';
import path from 'node:path';
import fs from 'node:fs';

const TEST_DB_PATH = path.resolve(process.cwd(), 'perf_test.db');
const TEST_PORT = 4002;
const BASE_URL = `http://localhost:${TEST_PORT}`;

describe('Phase 7 — Performance Benchmarking, Concurrency & Chaos Test Suite', () => {
  let server: StreamingServer;

  before(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
    server = new StreamingServer(TEST_DB_PATH);
    await server.listen(TEST_PORT, 'localhost');
  });

  after(async () => {
    await server.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
  });

  test('1. Database Query Latency Benchmark (<5ms SLA)', () => {
    const iterations = 50;

    // A. Catalog Home Query Latency
    const startCatalog = performance.now();
    for (let i = 0; i < iterations; i++) {
      server.catalogService.getHomeFeed();
    }
    const elapsedCatalog = performance.now() - startCatalog;
    const avgCatalogMs = elapsedCatalog / iterations;

    assert.ok(avgCatalogMs < 5.0, `Catalog query latency (${avgCatalogMs.toFixed(3)}ms) must be under 5ms`);

    // B. Search Filter Latency
    const startSearch = performance.now();
    for (let i = 0; i < iterations; i++) {
      server.searchService.search({ query: 'animation' });
    }
    const elapsedSearch = performance.now() - startSearch;
    const avgSearchMs = elapsedSearch / iterations;

    assert.ok(avgSearchMs < 3.0, `Search query latency (${avgSearchMs.toFixed(3)}ms) must be under 3ms`);
  });

  test('2. High Concurrency Burst (100 concurrent async requests)', async () => {
    const endpoints = [
      '/health',
      '/api/v1/catalog/home',
      '/api/v1/search?q=sintel',
      '/api/v1/playback/resolve/media-001',
      '/api/v1/sponsors/active'
    ];

    const requests = Array.from({ length: 100 }, (_, i) => {
      const endpoint = endpoints[i % endpoints.length];
      return fetch(`${BASE_URL}${endpoint}`).then(res => {
        assert.strictEqual(res.status, 200);
        return res.json();
      });
    });

    const start = performance.now();
    const results = await Promise.all(requests);
    const elapsed = performance.now() - start;

    assert.strictEqual(results.length, 100);
    assert.ok(elapsed < 2000, `100 concurrent requests must complete in <2000ms (took ${elapsed.toFixed(1)}ms)`);
  });

  test('3. Chaos & Malformed Input Resistance', async () => {
    // A. Malformed JSON payload to /auth/login
    const malformedRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email": "broken-json", missing_quotes}'
    });
    assert.strictEqual(malformedRes.status, 400);

    // B. SQL Injection probe in search query parameter
    const sqlInjectRes = await fetch(`${BASE_URL}/api/v1/search?q=${encodeURIComponent("'; DROP TABLE media_items; --")}`);
    assert.strictEqual(sqlInjectRes.status, 200);
    const data = await sqlInjectRes.json();
    assert.strictEqual(data.success, true);

    // Verify media items remain intact
    const feed = server.catalogService.getHomeFeed();
    assert.ok(feed.featured.length >= 1, 'Database table must remain intact after SQL injection probe');

    // C. Non-existent ID resolution
    const nullByteRes = await fetch(`${BASE_URL}/api/v1/catalog/media/media-non-existent-999`);
    assert.strictEqual(nullByteRes.status, 404);
  });

  test('4. Atomic Batch Telemetry Concurrency (50 concurrent telemetry flushes)', async () => {
    const flushes = Array.from({ length: 50 }, (_, i) => {
      return fetch(`${BASE_URL}/api/v1/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [
            {
              sessionId: `sess-stress-${i}`,
              mediaId: 'media-001',
              platform: 'android-tv',
              eventType: 'start',
              startupTimeMs: 400 + (i * 2)
            }
          ]
        })
      }).then(res => res.json());
    });

    const results = await Promise.all(flushes);
    assert.strictEqual(results.length, 50);
    for (const res of results) {
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.ingested, 1);
    }
  });
});
