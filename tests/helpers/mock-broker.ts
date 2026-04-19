import { createServer, type Server } from "node:http";

export interface MockBroker {
  server: Server;
  port: number;
  received: Array<{ path: string; body: unknown; headers: Record<string, string> }>;
  respondWith: (status: number, body: unknown) => void;
  stop: () => Promise<void>;
}

export async function startMockBroker(): Promise<MockBroker> {
  const received: MockBroker["received"] = [];
  let nextStatus = 200;
  let nextBody: unknown = { id: "mock-ext-1", status: "accepted" };
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const raw = Buffer.concat(chunks).toString("utf8");
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = raw; }
    received.push({ path: req.url ?? "/", body: parsed, headers: req.headers as Record<string, string> });
    res.statusCode = nextStatus;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(nextBody));
  });
  const port = await new Promise<number>((resolve) => {
    server.listen(0, () => resolve((server.address() as { port: number }).port));
  });
  return {
    server, port, received,
    respondWith: (s, b) => { nextStatus = s; nextBody = b; },
    stop: () => new Promise((r) => server.close(() => r())),
  };
}
