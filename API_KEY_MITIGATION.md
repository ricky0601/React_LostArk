# API Key Mitigation Design

## Current Issue

`src/utils/api.ts` reads `REACT_APP_API_KEY` in the browser bundle and sends it directly as the Lost Ark API bearer token. In Create React App, `REACT_APP_*` values are embedded into client-side assets, so the token is recoverable by any user.

## Recommended Target State

Move all Lost Ark API calls behind a server-side boundary that injects the bearer token at request time.

## Minimal Architecture

1. Browser calls same-origin endpoints such as `/api/lostark/...`.
2. A server function or proxy layer reads the real API key from server-only environment variables.
3. The proxy forwards requests to `https://developer-lostark.game.onstove.com` and returns sanitized JSON responses.
4. Client code no longer imports or references any secret-bearing environment variable.

## Migration Steps

1. Introduce a small proxy layer in the deployment environment.
2. Replace `BASE_URL` usage in `src/utils/api.ts` with same-origin `/api/lostark` calls.
3. Remove `REACT_APP_API_KEY` from frontend runtime configuration.
4. Add basic rate limiting and error logging on the proxy.

## Notes

- This does not require changing page-level UI code.
- If a backend is not available, a serverless function or edge function is sufficient.
- Until the proxy exists, the current client-side token should be treated as public.
