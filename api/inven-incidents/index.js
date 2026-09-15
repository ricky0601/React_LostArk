const {
  InvenArticleParseError,
  extractInvenTargetSection,
  parseInvenSearchHtml,
  targetSectionHasNickname,
  toValidatedResultUrl,
} = require('./parser');

const INVEN_SEARCH_URL = 'https://www.inven.co.kr/board/lostark/5355';
const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_CANDIDATE_VERIFICATIONS = 12;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_REQUESTS = 15;
const MAX_RATE_STORE_KEYS = 10000;

function buildSearchUrl(nickname) {
  const url = new URL(INVEN_SEARCH_URL);
  url.searchParams.set('query', 'list');
  url.searchParams.set('name', 'subjcont');
  url.searchParams.set('keyword', nickname);
  return url;
}

function getClientIp(req) {
  const forwarded = req.headers?.['x-vercel-forwarded-for'];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
}

async function readLimitedText(response, maxBytes, controller) {
  const declaredSize = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    controller.abort();
    await response.body?.cancel?.().catch(() => undefined);
    throw new Error('INVEN_RESPONSE_TOO_LARGE');
  }
  if (!response.body?.getReader) throw new Error('INVEN_RESPONSE_STREAM_UNAVAILABLE');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      controller.abort();
      await reader.cancel().catch(() => undefined);
      throw new Error('INVEN_RESPONSE_TOO_LARGE');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
  const charset = /charset=([^;\s]+)/i.exec(response.headers.get('content-type') || '')?.[1] || 'utf-8';
  return new TextDecoder(charset).decode(bytes);
}

function updateRateStore(rateStore, ip, timestamp, windowMs, maxKeys) {
  for (const [key, times] of rateStore) {
    const recent = times.filter((time) => timestamp - time < windowMs);
    if (recent.length) rateStore.set(key, recent);
    else rateStore.delete(key);
  }
  if (!rateStore.has(ip) && rateStore.size >= maxKeys) {
    let oldestKey;
    let oldestTime = Infinity;
    for (const [key, times] of rateStore) {
      const latest = times[times.length - 1] ?? -Infinity;
      if (latest < oldestTime) {
        oldestKey = key;
        oldestTime = latest;
      }
    }
    if (oldestKey !== undefined) rateStore.delete(oldestKey);
  }
  return rateStore.get(ip) || [];
}

function createInvenIncidentHandler({
  fetchImpl = globalThis.fetch,
  now = Date.now,
  timeoutMs = UPSTREAM_TIMEOUT_MS,
  maxResponseBytes = MAX_RESPONSE_BYTES,
  maxCandidateVerifications = MAX_CANDIDATE_VERIFICATIONS,
  rateLimitRequests = RATE_LIMIT_REQUESTS,
  rateLimitWindowMs = RATE_LIMIT_WINDOW_MS,
  rateStore = new Map(),
  maxRateStoreKeys = MAX_RATE_STORE_KEYS,
  logger = console,
} = {}) {
  return async function handler(req, res) {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    if (req.method !== 'GET') {
      res.setHeader('allow', 'GET');
      res.status(405).json({ message: 'Method not allowed.' });
      return;
    }
    const nicknameValue = Array.isArray(req.query?.nickname) ? req.query.nickname[0] : req.query?.nickname;
    const nickname = typeof nicknameValue === 'string' ? nicknameValue.trim() : '';
    if (!/^[가-힣A-Za-z0-9]{2,12}$/.test(nickname)) {
      res.status(400).json({ message: '확인할 닉네임을 올바르게 입력해 주세요.' });
      return;
    }

    const timestamp = now();
    const ip = getClientIp(req);
    const recent = updateRateStore(rateStore, ip, timestamp, rateLimitWindowMs, maxRateStoreKeys);
    if (recent.length >= rateLimitRequests) {
      res.setHeader('retry-after', String(Math.ceil(rateLimitWindowMs / 1000)));
      res.status(429).json({ message: '잠시 후 다시 검색해 주세요.' });
      return;
    }
    rateStore.set(ip, [...recent, timestamp]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let verifyingArticle = false;
    try {
      const response = await fetchImpl(buildSearchUrl(nickname), {
        method: 'GET',
        headers: { accept: 'text/html' },
        redirect: 'error',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`INVEN_SEARCH_STATUS_${response.status}`);
      const html = await readLimitedText(response, maxResponseBytes, controller);
      const candidates = parseInvenSearchHtml(html);
      const bodyCandidates = candidates.filter((candidate) => !candidate.title.includes(nickname));
      if (bodyCandidates.length > maxCandidateVerifications) {
        throw new Error('INVEN_TOO_MANY_CANDIDATES');
      }

      const results = [];
      for (const candidate of candidates) {
        // 제목 검색 결과는 그대로 인정하고, 본문 검색 결과만 대상자 구간을 검증한다.
        if (candidate.title.includes(nickname)) {
          results.push(candidate);
          continue;
        }
        verifyingArticle = true;
        const articleUrl = toValidatedResultUrl(candidate.url);
        if (!articleUrl || articleUrl !== candidate.url) throw new Error('INVEN_UNSAFE_CANDIDATE_URL');
        const articleResponse = await fetchImpl(articleUrl, {
          method: 'GET',
          headers: { accept: 'text/html' },
          redirect: 'error',
          signal: controller.signal,
        });
        if (!articleResponse.ok) throw new Error(`INVEN_ARTICLE_STATUS_${articleResponse.status}`);
        const articleHtml = await readLimitedText(articleResponse, maxResponseBytes, controller);
        const targetSection = extractInvenTargetSection(articleHtml);
        if (targetSectionHasNickname(targetSection, nickname)) results.push(candidate);
      }
      res.status(200).json({ results });
    } catch (error) {
      const timedOut = controller.signal.aborted && error?.message !== 'INVEN_RESPONSE_TOO_LARGE';
      logger.error('Inven incident search failed.', { errorName: error?.name || 'UnknownError' });
      if (error?.message === 'INVEN_HTML_STRUCTURE') {
        res.status(502).json({ message: '인벤 검색 결과 형식이 변경되어 결과를 읽을 수 없습니다.' });
      } else if (error instanceof InvenArticleParseError) {
        res.status(502).json({ message: '인벤 게시글의 대상자 형식을 확인할 수 없습니다.' });
      } else if (error?.message === 'INVEN_TOO_MANY_CANDIDATES') {
        res.status(502).json({ message: '검색 결과가 너무 많아 대상자를 모두 확인할 수 없습니다.' });
      } else if (error?.message === 'INVEN_RESPONSE_TOO_LARGE') {
        res.status(502).json({ message: '인벤 응답이 너무 큽니다.' });
      } else if (timedOut) {
        res.status(504).json({ message: '인벤 검색 요청 시간이 초과되었습니다.' });
      } else if (verifyingArticle) {
        res.status(502).json({ message: '인벤 게시글을 확인할 수 없습니다.' });
      } else {
        res.status(502).json({ message: '인벤 검색을 일시적으로 사용할 수 없습니다.' });
      }
    } finally {
      clearTimeout(timeout);
    }
  };
}

const handler = createInvenIncidentHandler();
module.exports = handler;
module.exports.createInvenIncidentHandler = createInvenIncidentHandler;
module.exports.buildSearchUrl = buildSearchUrl;
