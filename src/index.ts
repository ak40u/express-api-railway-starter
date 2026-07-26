import express, { type NextFunction, type Request, type Response } from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"

const app = express()
const port = Number(process.env.PORT ?? 8080)

// Railway terminates TLS at its proxy and forwards the real client address in
// X-Forwarded-For. Without this, every request looks like it comes from the proxy,
// which breaks rate limiting and any per-client logic. `1` means trust exactly one
// hop - trusting all of them would let a client spoof its own address.
app.set("trust proxy", 1)

app.use(helmet())
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(",").filter(Boolean) ?? true,
  }),
)
app.use(express.json({ limit: "1mb" }))

// Applied to /api only, so a burst of traffic cannot lock out the health check
// and make the platform replace a container that is working fine.
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 120),
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
)

app.get("/", (_req, res) => {
  res.json({
    message: "Express API on Railway",
    endpoints: ["GET /health", "GET /api/time", "POST /api/echo"],
  })
})

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptimeSeconds: Math.round(process.uptime()) })
})

app.get("/api/time", (_req, res) => {
  res.json({ now: new Date().toISOString() })
})

app.post("/api/echo", (req, res) => {
  const { message } = req.body ?? {}
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required and must be a non-empty string" })
  }
  res.json({ message: message.trim() })
})

app.use((_req, res) => {
  res.status(404).json({ error: "not found" })
})

// Express 5 forwards rejected promises here, so an unhandled async failure returns
// 500 instead of taking the process down.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: "internal server error" })
})

const server = app.listen(port, () => {
  console.log(`listening on ${port}`)
})

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
  })
}
