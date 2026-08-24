# Lost Ark API proxy: Vercel WAF rate limit

The production Lost Ark proxy relies on Vercel WAF for a serverless-safe rate limit. Function-local memory is not a durable counter because Vercel can reuse, create, and retire function instances as traffic changes.

## Production rule

Configure this rule in the Vercel project before deploying the proxy hardening change:

| Setting | Value |
| --- | --- |
| Rule name | `Lost Ark API proxy rate limit` |
| If | Request path starts with `/api/lostark/` |
| Then | Rate Limit |
| Strategy | Fixed Window |
| Time window | 60 seconds |
| Request limit | 120 |
| Counting key | IP |

1. Open the project in the Vercel Dashboard.
2. Open **Firewall**, select **Configure**, and add a new rule.
3. Enter the condition and rate-limit values above.
4. Review the change and select **Publish**. Vercel applies published firewall changes to the production deployment without a redeployment.

The application uses Vercel's default WAF response when the limit is exceeded. No Redis or rate-limit environment variables are required.

## Hobby-plan constraints

At the time this rule was documented, Vercel provides fixed-window WAF rate limiting on Hobby with one rate-limit rule per project and 1,000,000 included allowed requests. Check that the project does not already use its single rate-limit rule; if it does, consolidate the conditions instead of creating a second rule. Counters are maintained per region, so a future multi-region deployment must reassess the effective global limit.

See Vercel's current documentation before changing the rule:

- [WAF Rate Limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- [WAF Custom Rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules)
- [Vercel Functions](https://vercel.com/docs/functions)

## Safe rollout

1. Confirm `LOSTARK_API_KEY` is scoped to the Vercel Production environment only. Production WAF rules do not protect a Preview deployment that has separately been given the key.
2. Publish the WAF rule.
3. Confirm the production request path condition is `/api/lostark/`.
4. Merge and deploy the proxy hardening change.
5. Verify normal allowed requests still succeed.
6. Verify blocked and failed requests do not expose `LOSTARK_API_KEY` or upstream exception details.

Do not disable the WAF rule while this proxy is publicly reachable unless another distributed rate limiter is already active. If Preview deployments later require Lost Ark API access, add equivalent protection before enabling the key there.

## Production verification

Use a disallowed proxy path so verification does not call the Lost Ark upstream API. From Git Bash, replace the host if the production domain changes:

```bash
for i in $(seq 1 121); do
  curl -sS -o /dev/null -w '%{http_code}\n' \
    https://lokki.vercel.app/api/lostark/not-allowed
done
```

Expected result within one 60-second window:

- Initial requests reach the function and return `403` from the endpoint allowlist.
- A request after the configured threshold returns the WAF rate-limit response (`429`).
- After the window expires, the endpoint returns `403` again.

Run this check only once per deployment verification window; it intentionally exercises the production firewall counter.
