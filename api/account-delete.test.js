const assert = require('node:assert/strict');
const {
  afterEach: nodeAfterEach,
  beforeEach: nodeBeforeEach,
  describe: nodeDescribe,
  test: nodeTest,
} = require('node:test');

const { createAccountDeleteHandler } = require('./account-delete.js');

const SUPABASE_URL = 'https://unit-test.supabase.co';
const SERVICE_ROLE_KEY = 'unit-test-service-role-key';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const ACCESS_TOKEN = 'unit-test-access-token';

function createRequest(overrides = {}) {
  return {
    method: 'POST',
    headers: { authorization: `Bearer ${ACCESS_TOKEN}` },
    ...overrides,
  };
}

function createResponse() {
  return {
    headers: new Map(),
    statusCode: null,
    payload: undefined,
    ended: false,
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
    end() {
      this.ended = true;
      return this;
    },
  };
}

function createUserResponse({ status = 200, userId = USER_ID } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => (status === 200 ? { id: userId } : {}),
  };
}

function createDeleteResponse({ status = 200 } = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({}) };
}

function createHandler(fetchImpl) {
  return createAccountDeleteHandler({
    fetchImpl,
    logger: { error() {} },
  });
}

async function invoke(handler, req = createRequest(), res = createResponse()) {
  await handler(req, res);
  return res;
}

nodeDescribe('account delete endpoint', () => {
  nodeBeforeEach(() => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
  });

  nodeAfterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  nodeTest('returns 503 when server configuration is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await invoke(createHandler(() => assert.fail('must not call upstream')));

    assert.equal(res.statusCode, 503);
    assert.match(res.payload.message, /not configured/i);
  });

  nodeTest('rejects methods other than POST', async () => {
    const res = await invoke(createHandler(() => assert.fail('must not call upstream')), createRequest({ method: 'GET' }));

    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.get('allow'), 'POST');
  });

  nodeTest('rejects requests without a bearer token', async () => {
    const res = await invoke(createHandler(() => assert.fail('must not call upstream')), createRequest({ headers: {} }));

    assert.equal(res.statusCode, 401);
  });

  nodeTest('verifies the session and deletes the verified user only', async () => {
    const calls = [];
    const res = await invoke(
      createHandler(async (url, init) => {
        calls.push({ url: String(url), method: init?.method ?? 'GET', headers: init?.headers });
        return String(url).endsWith('/auth/v1/user')
          ? createUserResponse()
          : createDeleteResponse();
      }),
    );

    assert.equal(res.statusCode, 204);
    assert.ok(res.ended);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, `${SUPABASE_URL}/auth/v1/user`);
    assert.equal(calls[0].headers.authorization, `Bearer ${ACCESS_TOKEN}`);
    assert.equal(calls[1].url, `${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}`);
    assert.equal(calls[1].method, 'DELETE');
    assert.equal(calls[1].headers.authorization, `Bearer ${SERVICE_ROLE_KEY}`);
  });

  nodeTest('maps an invalid session to 401 without deleting anything', async () => {
    const calls = [];
    const res = await invoke(
      createHandler(async (url, init) => {
        calls.push(String(url));
        return createUserResponse({ status: 401 });
      }),
    );

    assert.equal(res.statusCode, 401);
    assert.equal(calls.length, 1);
  });

  nodeTest('returns 401 when the verified session has no user id', async () => {
    const res = await invoke(
      createHandler(async () => createUserResponse({ userId: '' })),
    );

    assert.equal(res.statusCode, 401);
  });

  nodeTest('treats an already-deleted user as success', async () => {
    const res = await invoke(
      createHandler(async (url) =>
        String(url).endsWith('/auth/v1/user') ? createUserResponse() : createDeleteResponse({ status: 404 }),
      ),
    );

    assert.equal(res.statusCode, 204);
  });

  nodeTest('returns 502 when the upstream user lookup fails', async () => {
    const res = await invoke(createHandler(async () => createUserResponse({ status: 500 })));

    assert.equal(res.statusCode, 502);
  });

  nodeTest('returns 502 when the upstream deletion fails without partial delete', async () => {
    const res = await invoke(
      createHandler(async (url) =>
        String(url).endsWith('/auth/v1/user') ? createUserResponse() : createDeleteResponse({ status: 500 }),
      ),
    );

    assert.equal(res.statusCode, 502);
  });

  nodeTest('returns 502 when the upstream is unreachable', async () => {
    const res = await invoke(createHandler(async () => { throw new Error('network down'); }));

    assert.equal(res.statusCode, 502);
  });

  nodeTest('returns 504 when the upstream times out', async () => {
    const res = await invoke(
      createAccountDeleteHandler({
        fetchImpl: async () => { throw Object.assign(new Error('timed out'), { name: 'TimeoutError' }); },
        upstreamTimeoutMs: 1,
        logger: { error() {} },
      }),
    );

    assert.equal(res.statusCode, 504);
  });
});
