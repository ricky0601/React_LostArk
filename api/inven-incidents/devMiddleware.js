const { createInvenIncidentHandler } = require('./index');

function createInvenIncidentDevMiddleware(handler = createInvenIncidentHandler()) {
  return async function invenIncidentDevMiddleware(req, res, next) {
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    if (requestUrl.pathname !== '/api/inven-incidents') {
      next();
      return;
    }

    const nicknameValues = requestUrl.searchParams.getAll('nickname');
    const apiRequest = {
      method: req.method,
      query: {
        nickname: nicknameValues.length > 1 ? nicknameValues : nicknameValues[0],
        scope: requestUrl.searchParams.get('scope') || undefined,
        nicknames: requestUrl.searchParams.get('nicknames') || undefined,
      },
      headers: req.headers,
      socket: req.socket,
      once: req.once?.bind(req),
      removeListener: req.removeListener?.bind(req),
    };
    const apiResponse = {
      setHeader: (name, value) => res.setHeader(name, value),
      once: res.once?.bind(res),
      removeListener: res.removeListener?.bind(res),
      status(code) {
        res.statusCode = code;
        return apiResponse;
      },
      json(payload) {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(payload));
        return apiResponse;
      },
    };

    try {
      await handler(apiRequest, apiResponse);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createInvenIncidentDevMiddleware };
