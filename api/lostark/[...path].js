const LOSTARK_API_BASE_URL = 'https://developer-lostark.game.onstove.com';
const ALLOWED_METHODS = new Set(['GET', 'POST']);
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;
const rateLimitStore = new Map();
const ALLOWED_GET_PATHS = [
  /^characters\/[^/]+\/siblings$/,
  /^armories\/characters\/[^/]+\/(profiles|arkgrid|equipment|gems|engravings|arkpassive|cards)$/,
  /^news\/events$/,
  /^gamecontents\/calendar$/,
  /^markets\/options$/,
];
const ALLOWED_POST_PATHS = new Set(['markets/items', 'auctions/items']);

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(req) {
  const now = Date.now();
  const ip = getClientIp(req);
  const current = rateLimitStore.get(ip);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

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
      value.forEach((item) => url.searchParams.append(key, item));
    } else if (value != null) {
      url.searchParams.set(key, value);
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

module.exports = async function handler(req, res) {
  const apiKey = process.env.LOSTARK_API_KEY;

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

  if (isRateLimited(req)) {
    res.status(429).json({ message: 'Too many requests.' });
    return;
  }

  const response = await fetch(buildTargetUrl(req), {
    method: req.method,
    headers: {
      accept: 'application/json',
      authorization: `bearer ${apiKey}`,
      ...(req.method === 'POST' ? { 'content-type': 'application/json' } : {}),
    },
    body: resolveBody(req),
  });

  const contentType = response.headers.get('content-type') || 'application/json';
  res.status(response.status);
  res.setHeader('content-type', contentType);
  res.send(await response.text());
};
