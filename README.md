# Express API starter for Railway

Express 5 on TypeScript, with the middleware an internet-facing API actually
needs.

## Why this exists

The ExpressJS template on Railway deploys a repository whose `package.json` is a
2018 `express-generator` skeleton:

```json
"express": "~4.16.1",
"pug": "2.0.0-beta11",
"debug": "~2.6.9",
"http-errors": "~1.6.3"
```

Express 4.16 shipped in 2017 and `pug@2.0.0-beta11` is a beta from the same era.
Roughly four deployments in ten do not come up, and the ones that do are running
a stack nobody has patched in seven years.

This starter is Express 5 on current Node, with a committed lockfile that passes
`npm audit --audit-level=high` — which matters here, because Railway refuses to
build when the lockfile carries a HIGH advisory.

## What's in here

| File | Why it exists |
|------|---------------|
| `src/index.ts` | The API, the middleware stack, and shutdown handling |
| `railway.json` | Health check on `/health`, restart on failure |
| `package-lock.json` | Committed, audited clean |

Four decisions worth understanding, because each is a thing that bites in
production rather than locally:

- **`app.set("trust proxy", 1)`.** TLS terminates at the platform proxy and the
  real client address arrives in `X-Forwarded-For`. Without this every request
  looks like it came from the proxy, which breaks rate limiting and any
  per-client logic. `1` trusts exactly one hop — trusting all of them would let a
  client spoof its own address.
- **Rate limiting is applied to `/api`, not globally.** A burst of traffic should
  not lock out the health check and make the platform replace a container that is
  working fine.
- **`helmet()`** sets the security headers that a browser-facing API is expected
  to send; there is no reason to ship without them.
- **Graceful shutdown.** Railway sends `SIGTERM` before replacing a container;
  without a handler, in-flight requests are cut off on every deploy.

## Endpoints

| Method | Path | Does |
|--------|------|------|
| GET | `/` | Lists the endpoints |
| GET | `/health` | Status and uptime — outside the rate limiter |
| GET | `/api/time` | Server time |
| POST | `/api/echo` | Echoes `{"message": "..."}`, 400 when it is missing |

## Run locally

```bash
npm ci
npm run dev        # http://localhost:8080
```

## Configuration

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | no | Defaults to 8080 |
| `CORS_ORIGINS` | no | Comma-separated allowed origins; all origins when unset |
| `RATE_LIMIT_PER_MINUTE` | no | Requests per minute per client on `/api`, default 120 |

## License

MIT
