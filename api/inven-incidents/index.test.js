const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { readFileSync } = require('node:fs');
const { EventEmitter } = require('node:events');
const { join } = require('node:path');
const { createInvenIncidentHandler } = require('./index');

const fixture = (name) => readFileSync(join(__dirname, '__fixtures__', name), 'utf8');
const request = (overrides = {}) => ({
  method: 'GET',
  query: { nickname: '테스트닉' },
  headers: { 'x-vercel-forwarded-for': '127.0.0.1' },
  ...overrides,
});
const response = () => ({
  headers: new Map(), statusCode: 0, payload: null,
  setHeader(name, value) { this.headers.set(name.toLowerCase(), value); },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; return this; },
});
const upstream = (body, { status = 200, headers } = {}) => new Response(body, { status, headers });
const searchHtml = (ids = [1]) => `<html><body><table>${ids.map((id) => (
  `<tr><td><a class="subject-link" href="/board/lostark/5355/${id}">결과 ${id}</a></td></tr>`
)).join('')}</table></body></html>`;

function twoStageFetch(articleHtml = fixture('article-target.html')) {
  return async (url) => url.toString().includes('?query=list')
    ? upstream(searchHtml())
    : upstream(articleHtml);
}

describe('Inven incident proxy', () => {
  test('uses fixed search parameters, then returns only exact target-field matches', async () => {
    const targets = [];
    const handler = createInvenIncidentHandler({
      logger: { error() {} },
      fetchImpl: async (url) => {
        targets.push(url.toString());
        if (targets.length === 1) return upstream(searchHtml([1, 2]));
        return upstream(targets.length === 2
          ? fixture('article-author-only.html')
          : fixture('article-target.html'));
      },
    });
    const res = response();
    await handler(request({ query: { nickname: '테스트닉', url: 'https://evil.example' } }), res);

    assert.deepEqual(targets, [
      'https://www.inven.co.kr/board/lostark/5355?query=list&name=subjcont&keyword=%ED%85%8C%EC%8A%A4%ED%8A%B8%EB%8B%89',
      'https://www.inven.co.kr/board/lostark/5355/1',
      'https://www.inven.co.kr/board/lostark/5355/2',
    ]);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.payload, {
      results: [{ title: '결과 2', url: 'https://www.inven.co.kr/board/lostark/5355/2' }],
    });
  });

  test('keeps a title match without requiring a target-field match', async () => {
    let fetchCount = 0;
    const titleMatchHtml = '<html><body><table><tr><td>'
      + '<a class="subject-link" href="/board/lostark/5355/1">테스트닉 관련 제목</a>'
      + '</td></tr></table></body></html>';
    const handler = createInvenIncidentHandler({
      logger: { error() {} },
      fetchImpl: async () => {
        fetchCount += 1;
        return upstream(titleMatchHtml);
      },
    });
    const res = response();

    await handler(request(), res);

    assert.equal(fetchCount, 1);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.payload.results, [{
      title: '테스트닉 관련 제목',
      url: 'https://www.inven.co.kr/board/lostark/5355/1',
    }]);
  });

  test('searches expedition aliases and reports the nickname that matched', async () => {
    const targets = [];
    const handler = createInvenIncidentHandler({
      logger: { error() {} },
      fetchImpl: async (url) => {
        const target = url.toString();
        targets.push(target);
        if (target.includes('keyword=%ED%83%80%EC%9E%84%ED%82%A4%EC%9A%94%EC%98%B7')) {
          return upstream(fixture('no-results.html'));
        }
        if (target.includes('keyword=%ED%95%9C%EA%B1%B4%EB%9C%AC')) return upstream(searchHtml());
        return upstream('<div id="powerbbsContent">■ 게임 닉네임<br>대상자: 한건뜬<br>■ 사건 설명<br>내용</div>');
      },
    });
    const res = response();

    await handler(request({
      query: { scope: 'expedition', nicknames: '타임키요옷,한건뜬' },
    }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.payload.results, [{
      title: '결과 1',
      url: 'https://www.inven.co.kr/board/lostark/5355/1',
      matchedNicknames: ['한건뜬'],
    }]);
    assert.equal(targets.filter((target) => target.includes('?query=list')).length, 2);
  });

  test('rejects an expedition that exceeds the bounded nickname count', async () => {
    let fetchCount = 0;
    const handler = createInvenIncidentHandler({
      maxExpeditionNicknames: 2,
      logger: { error() {} },
      fetchImpl: async () => { fetchCount += 1; return upstream(fixture('no-results.html')); },
    });
    const res = response();

    await handler(request({
      query: { scope: 'expedition', nicknames: '첫번째,두번째,세번째' },
    }), res);

    assert.equal(res.statusCode, 400);
    assert.equal(fetchCount, 0);
  });

  test('never fetches non-board URLs found in search HTML', async () => {
    const targets = [];
    const redirects = [];
    const html = '<html><body><table><tr><td>'
      + '<a class="subject-link" href="https://evil.example/board/lostark/5355/9">악성</a>'
      + '<a class="subject-link" href="/board/lostark/5355/1">정상</a>'
      + '</td></tr></table></body></html>';
    const handler = createInvenIncidentHandler({
      logger: { error() {} },
      fetchImpl: async (url, options) => {
        targets.push(url.toString());
        redirects.push(options.redirect);
        return targets.length === 1 ? upstream(html) : upstream(fixture('article-target.html'));
      },
    });
    const res = response();
    await handler(request(), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(targets.slice(1), ['https://www.inven.co.kr/board/lostark/5355/1']);
    assert.deepEqual(redirects, ['error', 'error']);
  });

  test('fails instead of partially verifying too many candidates', async () => {
    let fetchCount = 0;
    const handler = createInvenIncidentHandler({
      maxCandidateVerifications: 2,
      logger: { error() {} },
      fetchImpl: async () => { fetchCount += 1; return upstream(searchHtml([1, 2, 3])); },
    });
    const res = response();
    await handler(request(), res);

    assert.equal(fetchCount, 1);
    assert.equal(res.statusCode, 502);
    assert.match(res.payload.message, /너무 많아/);
  });

  test('returns 502 for a malformed candidate article', async () => {
    const handler = createInvenIncidentHandler({
      logger: { error() {} },
      fetchImpl: twoStageFetch(fixture('article-malformed.html')),
    });
    const res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, 502);
    assert.match(res.payload.message, /대상자 형식/);
  });

  test('returns 502 when a candidate article request fails', async () => {
    let fetchCount = 0;
    const handler = createInvenIncidentHandler({
      logger: { error() {} },
      fetchImpl: async () => (++fetchCount === 1 ? upstream(searchHtml()) : upstream('failure', { status: 503 })),
    });
    const res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, 502);
    assert.match(res.payload.message, /게시글/);
  });

  test('aborts concurrent upstream work when one expedition search fails', async () => {
    let pendingSignal;
    const handler = createInvenIncidentHandler({
      logger: { error() {} },
      fetchImpl: async (url, options) => {
        if (url.toString().includes('keyword=%EC%B2%AB%EB%B2%88%EC%A7%B8')) {
          return upstream('failure', { status: 503 });
        }
        pendingSignal = options.signal;
        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      },
    });
    const res = response();

    await handler(request({
      query: { scope: 'expedition', nicknames: '첫번째,두번째' },
    }), res);

    assert.equal(res.statusCode, 502);
    assert.equal(pendingSignal.aborted, true);
  });

  test('aborts upstream work when the client disconnects', async () => {
    let upstreamSignal;
    const handler = createInvenIncidentHandler({
      logger: { error() {} },
      fetchImpl: async (_url, options) => {
        upstreamSignal = options.signal;
        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      },
    });
    const req = Object.assign(new EventEmitter(), request());
    const res = response();
    const handling = handler(req, res);
    await Promise.resolve();

    req.emit('aborted');
    await handling;

    assert.equal(upstreamSignal.aborted, true);
    assert.equal(res.statusCode, 504);
  });

  test('charges the rate limit for every nickname in an expedition request', async () => {
    const rateStore = new Map();
    const handler = createInvenIncidentHandler({
      rateLimitUnits: 2,
      minimumRequestCost: 1,
      rateStore,
      logger: { error() {} },
      fetchImpl: async () => upstream(fixture('no-results.html')),
    });
    const first = response();
    const second = response();

    await handler(request({ query: { scope: 'expedition', nicknames: '첫번째,두번째' } }), first);
    await handler(request({ query: { nickname: '세번째' } }), second);

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 429);
  });

  test('allows four bounded expedition lookups before exhausting the alias budget', async () => {
    const handler = createInvenIncidentHandler({
      rateLimitUnits: 8,
      minimumRequestCost: 1,
      logger: { error() {} },
      fetchImpl: async () => upstream(fixture('no-results.html')),
    });
    const statuses = [];

    for (let index = 0; index < 5; index += 1) {
      const res = response();
      await handler(request({
        query: { scope: 'expedition', nicknames: `원정대${index}가,원정대${index}나` },
      }), res);
      statuses.push(res.statusCode);
    }

    assert.deepEqual(statuses, [200, 200, 200, 200, 429]);
  });

  test('limits streamed response size', async () => {
    const handler = createInvenIncidentHandler({
      maxResponseBytes: 10,
      logger: { error() {} },
      fetchImpl: async () => upstream(searchHtml()),
    });
    const res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, 502);
    assert.deepEqual(res.payload, { message: '인벤 응답이 너무 큽니다.' });
  });

  test('cancels an oversized response declared by Content-Length', async () => {
    let cancelled = false;
    const body = {
      cancel: async () => { cancelled = true; },
      getReader() { throw new Error('reader must not be opened'); },
    };
    const handler = createInvenIncidentHandler({
      maxResponseBytes: 10,
      logger: { error() {} },
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        body,
        headers: { get: (name) => name === 'content-length' ? '11' : null },
      }),
    });
    const res = response();
    await handler(request(), res);

    assert.equal(cancelled, true);
    assert.equal(res.statusCode, 502);
  });

  test('rejects responses without a bounded readable stream', async () => {
    const handler = createInvenIncidentHandler({
      logger: { error() {} },
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        body: undefined,
        headers: { get: () => null },
        text: async () => searchHtml(),
      }),
    });
    const res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, 502);
  });

  test('rate limits repeated clients in memory', async () => {
    const handler = createInvenIncidentHandler({
      rateLimitUnits: 1,
      minimumRequestCost: 1,
      logger: { error() {} },
      fetchImpl: twoStageFetch(),
    });
    await handler(request(), response());
    const res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, 429);
  });

  test('bounds the in-memory rate store and evicts the oldest client', async () => {
    const rateStore = new Map();
    let timestamp = 0;
    const handler = createInvenIncidentHandler({
      rateStore,
      maxRateStoreKeys: 2,
      rateLimitWindowMs: 1000,
      now: () => timestamp += 1,
      logger: { error() {} },
      fetchImpl: twoStageFetch(),
    });
    await handler(request({ headers: { 'x-vercel-forwarded-for': 'first' } }), response());
    await handler(request({ headers: { 'x-vercel-forwarded-for': 'second' } }), response());
    await handler(request({ headers: { 'x-vercel-forwarded-for': 'third' } }), response());

    assert.equal(rateStore.size, 2);
    assert.equal(rateStore.has('first'), false);
    assert.equal(rateStore.has('third'), true);
  });

  test('shares one timeout across search and article verification', async () => {
    let fetchCount = 0;
    const handler = createInvenIncidentHandler({
      timeoutMs: 5,
      logger: { error() {} },
      fetchImpl: async (_url, { signal }) => {
        fetchCount += 1;
        if (fetchCount === 1) return upstream(searchHtml());
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      },
    });
    const res = response();
    await handler(request(), res);
    assert.equal(fetchCount, 2);
    assert.equal(res.statusCode, 504);
  });
});
