const UPSTREAM_TIMEOUT_MS = 10 * 1000;
const ALLOWED_METHODS = new Set(['POST']);

/** 요청 Bearer 토큰을 검증해 삭제 대상 사용자를 서버가 직접 결정한다. 클라이언트가 보낸 사용자 ID는 신뢰하지 않는다. */
function extractBearerToken(req) {
  const authorization = req?.headers?.authorization;
  if (typeof authorization !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1] : null;
}

function createAccountDeleteHandler({
  fetchImpl = globalThis.fetch,
  upstreamTimeoutMs = UPSTREAM_TIMEOUT_MS,
  logger = console,
} = {}) {
  return async function handler(req, res) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');

    if (!supabaseUrl || !serviceRoleKey) {
      res.status(503).json({ message: 'Account deletion is not configured.' });
      return;
    }

    if (!ALLOWED_METHODS.has(req.method)) {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ message: 'Method not allowed.' });
      return;
    }

    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      res.status(401).json({ message: 'Sign in is required to delete an account.' });
      return;
    }

    const timeoutSignal = AbortSignal.timeout(upstreamTimeoutMs);

    try {
      const userResponse = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${accessToken}`,
        },
        signal: timeoutSignal,
      });

      if (userResponse.status === 401 || userResponse.status === 403) {
        res.status(401).json({ message: 'Sign-in session is invalid or expired.' });
        return;
      }

      if (!userResponse.ok) {
        logger.error('Supabase user verification failed.', { status: userResponse.status });
        res.status(502).json({ message: 'Account deletion is temporarily unavailable.' });
        return;
      }

      const { id: userId } = await userResponse.json();
      if (typeof userId !== 'string' || userId.length === 0) {
        res.status(401).json({ message: 'Sign-in session is invalid or expired.' });
        return;
      }

      // auth.users 삭제는 FK ON DELETE CASCADE로 lokki_* 소유 데이터를 같은 트랜잭션에서 제거한다.
      // 이 호출이 실패하면 어떤 데이터도 삭제되지 않으므로 부분 삭제가 발생하지 않는다.
      const deleteResponse = await fetchImpl(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
        },
        signal: timeoutSignal,
      });

      if (deleteResponse.ok || deleteResponse.status === 404) {
        res.status(204).end();
        return;
      }

      logger.error('Supabase user deletion failed.', { status: deleteResponse.status });
      res.status(502).json({ message: 'Account deletion is temporarily unavailable.' });
    } catch (error) {
      const timedOut = timeoutSignal.aborted || error?.name === 'TimeoutError';
      const status = timedOut ? 504 : 502;
      const message = timedOut
        ? 'Account deletion timed out. Try again.'
        : 'Account deletion is temporarily unavailable.';

      logger.error(message, { errorName: error?.name || 'UnknownError' });
      res.status(status).json({ message });
    }
  };
}

const handler = createAccountDeleteHandler();

module.exports = handler;
module.exports.createAccountDeleteHandler = createAccountDeleteHandler;
