import { createServer } from "node:http";

const server = createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = raw;
  }
  console.log(`[mock-B:4001] ${req.method} ${req.url} →`, JSON.stringify(parsed));
  res.statusCode = 200;
  res.setHeader("content-type", "application/json");
  res.end(
    JSON.stringify({
      id: `mockB-ext-${Date.now()}`,
      status: "accepted",
    }),
  );
});

server.listen(4001, () => {
  console.log("[mock-B] broker echo listening on http://localhost:4001");
});
