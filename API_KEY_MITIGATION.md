# API Key Mitigation Design

## Previous Issue

`src/utils/api.ts` used to read `REACT_APP_API_KEY` in the browser bundle and send it directly as the Lost Ark API bearer token. In Create React App, `REACT_APP_*` values are embedded into client-side assets, so the token is recoverable by any user.

This has been mitigated by moving Lost Ark API calls behind `api/lostark/[...path].js`.

## Current Target State

All Lost Ark API calls should stay behind a server-side boundary that injects the bearer token at request time.

## Minimal Architecture

1. Browser calls same-origin endpoints such as `/api/lostark/...`.
2. The Vercel function reads the real API key from the server-only `LOSTARK_API_KEY` environment variable.
3. The proxy forwards requests to `https://developer-lostark.game.onstove.com` and returns sanitized JSON responses.
4. Client code no longer imports or references any secret-bearing environment variable.

## Deployment Checklist

1. Set `LOSTARK_API_KEY` in Vercel project environment variables.
2. Do not set or use `REACT_APP_API_KEY` for production builds.
3. Rotate any Lost Ark API key that may have been exposed through a previous client build.
4. Confirm browser network requests go to `/api/lostark/...`, not directly to `developer-lostark.game.onstove.com`.

## Notes

- This does not require changing page-level UI code.
- The current proxy includes an endpoint allowlist and a lightweight per-instance rate limit. For higher traffic, move rate limiting to a durable store or platform firewall.
