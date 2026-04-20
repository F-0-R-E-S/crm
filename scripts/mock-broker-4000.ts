import { createServer } from "node:http";

const received: Array<{ path: string; body: unknown }> = [];

const server = createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { parsed = raw; }
  received.push({ path: req.url ?? "/", body: parsed });
  console.log(`[mock] ${req.method} ${req.url} →`, JSON.stringify(parsed));
  res.statusCode = 200;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({
    id: `mock-ext-${Date.now()}`,
    status: "accepted",
    autologin_url: "https://mock.broker/autologin/abc123",
  }));
});

server.listen(4000, () => {
  console.log("[mock] broker echo listening on http://localhost:4000");
});

process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
