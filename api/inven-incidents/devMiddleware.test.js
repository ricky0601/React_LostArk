const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { createInvenIncidentDevMiddleware } = require('./devMiddleware');

const response = () => ({
  statusCode: 200,
  headers: new Map(),
  payload: '',
  setHeader(name, value) { this.headers.set(name.toLowerCase(), value); },
  end(payload) { this.payload = payload; },
});

describe('Inven incident Vite middleware', () => {
  test('executes the API handler and returns JSON instead of the source file', async () => {
    let receivedRequest;
    const middleware = createInvenIncidentDevMiddleware(async (req, res) => {
      receivedRequest = req;
      res.status(200).json({ results: [{ title: '검색 결과', url: 'https://www.inven.co.kr/board/lostark/5355/1' }] });
    });
    const res = response();

    await middleware({
      method: 'GET',
      url: '/api/inven-incidents?nickname=%EB%B0%B1%EC%A0%95%ED%95%91',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    }, res, assert.fail);

    assert.equal(receivedRequest.query.nickname, '백정핑');
    assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(JSON.parse(res.payload), {
      results: [{ title: '검색 결과', url: 'https://www.inven.co.kr/board/lostark/5355/1' }],
    });
  });

  test('passes unrelated requests to Vite', async () => {
    let nextCalled = false;
    const middleware = createInvenIncidentDevMiddleware(async () => assert.fail('API handler must not run'));

    await middleware({ url: '/src/App.tsx' }, response(), () => { nextCalled = true; });

    assert.equal(nextCalled, true);
  });
});
