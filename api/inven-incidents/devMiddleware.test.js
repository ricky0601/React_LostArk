const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
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

  test('forwards expedition search parameters to the API handler', async () => {
    let receivedQuery;
    const middleware = createInvenIncidentDevMiddleware(async (req, res) => {
      receivedQuery = req.query;
      res.status(200).json({ results: [] });
    });

    await middleware({
      method: 'GET',
      url: '/api/inven-incidents?scope=expedition&nicknames=%ED%83%80%EC%9E%84%ED%82%A4%EC%9A%94%EC%98%B7%2C%ED%95%9C%EA%B1%B4%EB%9C%AC',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    }, response(), assert.fail);

    assert.deepEqual(receivedQuery, {
      nickname: undefined,
      scope: 'expedition',
      nicknames: '타임키요옷,한건뜬',
    });
  });

  test('forwards local client-abort events to the API handler', async () => {
    let aborted = false;
    const middleware = createInvenIncidentDevMiddleware(async (req, res) => {
      await new Promise((resolve) => {
        req.once('aborted', () => {
          aborted = true;
          res.status(499).json({ message: 'aborted' });
          resolve();
        });
      });
    });
    const req = Object.assign(new EventEmitter(), {
      method: 'GET',
      url: '/api/inven-incidents?nickname=%EB%B0%B1%EC%A0%95%ED%95%91',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    });
    const res = Object.assign(new EventEmitter(), response());
    const handling = middleware(req, res, assert.fail);
    await Promise.resolve();

    req.emit('aborted');
    await handling;

    assert.equal(aborted, true);
    assert.equal(res.statusCode, 499);
  });

  test('passes unrelated requests to Vite', async () => {
    let nextCalled = false;
    const middleware = createInvenIncidentDevMiddleware(async () => assert.fail('API handler must not run'));

    await middleware({ url: '/src/App.tsx' }, response(), () => { nextCalled = true; });

    assert.equal(nextCalled, true);
  });
});
