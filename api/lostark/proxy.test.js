const assert = require('node:assert/strict');
const {
  afterEach: nodeAfterEach,
  beforeEach: nodeBeforeEach,
  describe: nodeDescribe,
  test: nodeTest,
} = require('node:test');

const { createProxyHandler } = require('./[...].js');

const TEST_API_KEY = 'unit-test-api-key';

function createRequest(overrides = {}) {
  return {
    method: 'GET',
    headers: {},
    query: { path: ['news', 'events'] },
    body: undefined,
    ...overrides,
  };
}

function createResponse() {
  return {
    headers: new Map(),
    statusCode: null,
    payload: undefined,
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    send(payload) {
      this.payload = payload;
      return this;
    },
  };
}

function createUpstreamResponse({
  status = 200,
  contentType = 'application/json; charset=utf-8',
  body = '{}',
} = {}) {
  return {
    status,
    headers: { get: (name) => (name === 'content-type' ? contentType : null) },
    text: async () => body,
  };
}

function createHandler(options = {}) {
  return createProxyHandler({
    logger: { error() {} },
    ...options,
  });
}

nodeDescribe('Lost Ark API proxy', () => {
  nodeBeforeEach(() => {
    process.env.LOSTARK_API_KEY = TEST_API_KEY;
  });

  nodeAfterEach(() => {
    delete process.env.LOSTARK_API_KEY;
  });

  nodeTest('rejects requests when the server-side API key is missing', async () => {
    delete process.env.LOSTARK_API_KEY;
    let fetchCalled = false;
    const handler = createHandler({
      fetchImpl: async () => {
        fetchCalled = true;
      },
    });
    const res = createResponse();

    await handler(createRequest(), res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.payload, { message: 'Lost Ark API key is not configured.' });
    assert.equal(fetchCalled, false);
  });

  nodeTest('rejects methods and endpoints outside the allowlist', async (t) => {
    const handler = createHandler({
      fetchImpl: async () => assert.fail('The upstream must not be called.'),
    });

    await t.test('method', async () => {
      const res = createResponse();
      await handler(createRequest({ method: 'DELETE' }), res);
      assert.equal(res.statusCode, 405);
      assert.equal(res.headers.get('allow'), 'GET, POST');
    });

    await t.test('endpoint', async () => {
      const res = createResponse();
      await handler(createRequest({ query: { path: ['admin', 'secrets'] } }), res);
      assert.equal(res.statusCode, 403);
    });
  });

  nodeTest('allows the character avatars endpoint used by the spec simulator', async () => {
    let capturedUrl;
    const handler = createHandler({
      fetchImpl: async (url) => {
        capturedUrl = url;
        return createUpstreamResponse({ body: '[]' });
      },
    });
    const res = createResponse();

    await handler(
      createRequest({
        query: { path: ['armories', 'characters', '한건뜬', 'avatars'] },
      }),
      res
    );

    assert.equal(
      capturedUrl.toString(),
      'https://developer-lostark.game.onstove.com/armories/characters/%ED%95%9C%EA%B1%B4%EB%9C%AC/avatars'
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload, '[]');
  });

  nodeTest('forwards only controlled headers to an allowed upstream endpoint', async () => {
    let capturedUrl;
    let capturedOptions;
    const handler = createHandler({
      fetchImpl: async (url, options) => {
        capturedUrl = url;
        capturedOptions = options;
        return createUpstreamResponse({ body: '{"events":[]}' });
      },
    });
    const req = createRequest({
      headers: { authorization: 'bearer attacker-token', cookie: 'session=value' },
      query: { path: ['news', 'events'], locale: 'ko-KR' },
    });
    const res = createResponse();

    await handler(req, res);

    assert.equal(capturedUrl.toString(), 'https://developer-lostark.game.onstove.com/news/events?locale=ko-KR');
    assert.deepEqual(capturedOptions.headers, {
      accept: 'application/json',
      authorization: `bearer ${TEST_API_KEY}`,
    });
    assert.ok(capturedOptions.signal instanceof AbortSignal);
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload, '{"events":[]}');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  nodeTest('serializes allowed POST bodies as JSON', async () => {
    let capturedOptions;
    const handler = createHandler({
      fetchImpl: async (_url, options) => {
        capturedOptions = options;
        return createUpstreamResponse();
      },
    });
    const res = createResponse();

    await handler(
      createRequest({
        method: 'POST',
        query: { path: ['markets', 'items'] },
        body: { CategoryCode: 20000 },
      }),
      res
    );

    assert.equal(capturedOptions.body, '{"CategoryCode":20000}');
    assert.equal(capturedOptions.headers['content-type'], 'application/json');
  });

  nodeTest('returns a sanitized 504 response when the upstream times out', async () => {
    const handler = createHandler({
      upstreamTimeoutMs: 5,
      fetchImpl: async (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    });
    const res = createResponse();
    const keepEventLoopAlive = setTimeout(() => {}, 50);

    try {
      await handler(createRequest(), res);
    } finally {
      clearTimeout(keepEventLoopAlive);
    }

    assert.equal(res.statusCode, 504);
    assert.deepEqual(res.payload, { message: 'Lost Ark API request timed out.' });
    assert.equal(JSON.stringify(res.payload).includes(TEST_API_KEY), false);
  });

  nodeTest('returns a sanitized 502 response for other upstream failures', async () => {
    const handler = createHandler({
      fetchImpl: async () => {
        throw new Error(`upstream failed with ${TEST_API_KEY}`);
      },
    });
    const res = createResponse();

    await handler(createRequest(), res);

    assert.equal(res.statusCode, 502);
    assert.deepEqual(res.payload, { message: 'Lost Ark API is temporarily unavailable.' });
    assert.equal(JSON.stringify(res.payload).includes(TEST_API_KEY), false);
  });

  nodeTest('preserves upstream status and content type without exposing response caching', async () => {
    const handler = createHandler({
      fetchImpl: async () =>
        createUpstreamResponse({
          status: 429,
          contentType: 'application/problem+json',
          body: '{"message":"rate limited"}',
        }),
    });
    const res = createResponse();

    await handler(createRequest(), res);

    assert.equal(res.statusCode, 429);
    assert.equal(res.headers.get('content-type'), 'application/problem+json');
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });
});
