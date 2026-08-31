const LOSTARK_API_BASE_URL = 'https://developer-lostark.game.onstove.com';
const ALLOWED_METHODS = new Set(['GET', 'POST']);
const UPSTREAM_TIMEOUT_MS = 10 * 1000;
const ALLOWED_GET_PATHS = [
  /^characters\/[^/]+\/siblings$/,
  /^armories\/characters\/[^/]+\/(profiles|arkgrid|equipment|gems|engravings|arkpassive|cards|avatars)$/,
  /^news\/events$/,
  /^gamecontents\/calendar$/,
  /^markets\/options$/,
];
const ALLOWED_POST_PATHS = new Set(['markets/items', 'auctions/items']);

function resolvePath(pathQuery) {
  if (Array.isArray(pathQuery)) return pathQuery.join('/');
  if (typeof pathQuery === 'string') return pathQuery;
  return '';
}

function buildTargetUrl(req) {
  const path = resolvePath(req.query.path);
  const url = new URL(`/${path}`, LOSTARK_API_BASE_URL);

  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
    } else if (value != null) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function isAllowedPath(method, path) {
  if (method === 'GET') return ALLOWED_GET_PATHS.some((pattern) => pattern.test(path));
  if (method === 'POST') return ALLOWED_POST_PATHS.has(path);
  return false;
}

function resolveBody(req) {
  if (req.method === 'GET' || req.body == null) return undefined;
  return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
}

function createProxyHandler({
  fetchImpl = globalThis.fetch,
  upstreamTimeoutMs = UPSTREAM_TIMEOUT_MS,
  logger = console,
} = {}) {
  return async function handler(req, res) {
    const apiKey = process.env.LOSTARK_API_KEY;

    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');

    if (!apiKey) {
      res.status(500).json({ message: 'Lost Ark API key is not configured.' });
      return;
    }

    if (!ALLOWED_METHODS.has(req.method)) {
      res.setHeader('Allow', Array.from(ALLOWED_METHODS).join(', '));
      res.status(405).json({ message: 'Method not allowed.' });
      return;
    }

    const path = resolvePath(req.query.path);
    if (!isAllowedPath(req.method, path)) {
      res.status(403).json({ message: 'Endpoint is not allowed.' });
      return;
    }

    const timeoutSignal = AbortSignal.timeout(upstreamTimeoutMs);

    try {
      const response = await fetchImpl(buildTargetUrl(req), {
        method: req.method,
        headers: {
          accept: 'application/json',
          authorization: `bearer ${apiKey}`,
          ...(req.method === 'POST' ? { 'content-type': 'application/json' } : {}),
        },
        body: resolveBody(req),
        signal: timeoutSignal,
      });

      const contentType = response.headers.get('content-type') || 'application/json';
      res.status(response.status);
      res.setHeader('content-type', contentType);
      res.send(await response.text());
    } catch (error) {
      const timedOut = timeoutSignal.aborted || error?.name === 'TimeoutError';
      const status = timedOut ? 504 : 502;
      const message = timedOut
        ? 'Lost Ark API request timed out.'
        : 'Lost Ark API is temporarily unavailable.';

      logger.error(message, { errorName: error?.name || 'UnknownError' });
      res.status(status).json({ message });
    }
  };
}

const handler = createProxyHandler();

module.exports = handler;
module.exports.createProxyHandler = createProxyHandler;
