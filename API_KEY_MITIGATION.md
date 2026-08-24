# API Key Mitigation Design

## Previous Issue

`src/utils/api.ts` used to read `REACT_APP_API_KEY` in the browser bundle and send it directly as the Lost Ark API bearer token. In Create React App, `REACT_APP_*` values are embedded into client-side assets, so the token is recoverable by any user.

This has been mitigated by moving Lost Ark API calls behind `api/lostark/[...].js`.

## Current Target State

All Lost Ark API calls should stay behind a server-side boundary that injects the bearer token at request time.

## Minimal Architecture

1. Browser calls same-origin endpoints such as `/api/lostark/...`.
2. The Vercel function reads the real API key from the server-only `LOSTARK_API_KEY` environment variable.
3. The proxy forwards requests to `https://developer-lostark.game.onstove.com` and returns sanitized JSON responses.
4. Client code no longer imports or references any secret-bearing environment variable.

## Current Vercel Routing

This project is built with Vite to `build/` and deployed with Vercel Framework Preset `Other`.

`vercel.json` must keep the API proxy rewrite before the generated static route rewrites and BrowserRouter fallback:

```json
{
  "rewrites": [
    { "source": "/api/lostark/:path*", "destination": "/api/lostark/[...]" },
    { "source": "/character", "destination": "/character/index.html" },
    { "source": "/:path*", "destination": "/404.html" }
  ]
}
```

For local development, `vite.config.mts` reads `LOSTARK_API_KEY` only while configuring the server proxy. It is not copied into Vite `define` or exposed through a `VITE_` variable.

Do not rename the function back to `api/lostark/[...path].js`; that shape previously built a function but left `/api/lostark/*` returning Vercel platform `404 NOT_FOUND` in production.

## Deployment Checklist

1. Set `LOSTARK_API_KEY` in the Vercel Production environment only. If Preview deployments need the key, protect them separately before enabling it.
2. Do not set or use `REACT_APP_API_KEY` or `VITE_LOSTARK_API_KEY` for production builds.
3. Rotate any Lost Ark API key that may have been exposed through a previous client build.
4. Confirm browser network requests go to `/api/lostark/...`, not directly to `developer-lostark.game.onstove.com`.
5. Confirm `https://lokki.vercel.app/api/lostark/news/events` returns `200` JSON after production deploy.

## Notes

- This does not require changing page-level UI code.
- The proxy keeps its endpoint and method allowlists, but rate limiting is enforced by a production Vercel WAF rule instead of ephemeral function memory. Configure the rule before deploying a version containing this change; see `docs/vercel-waf-rate-limit.md`.
- The proxy aborts Lost Ark upstream requests after 10 seconds and returns sanitized `502`/`504` responses for upstream failures.
- See `docs/troubleshooting/vercel-lostark-api-route-404.md` for the production routing failure that led to the current splat function shape.
