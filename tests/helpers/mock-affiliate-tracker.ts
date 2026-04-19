import { type Server, createServer } from "node:http";

export interface MockTracker {
  server: Server;
  port: number;
  hits: Array<{ url: string; headers: Record<string, string> }>;
  respondWith: (status: number) => void;
  stop: () => Promise<void>;
}

export async function startMockTracker(): Promise<MockTracker> {
  const hits: MockTracker["hits"] = [];
  let nextStatus = 200;
  const server = createServer((req, res) => {
    hits.push({ url: req.url ?? "", headers: req.headers as Record<string, string> });
    res.statusCode = nextStatus;
    res.end("ok");
  });
  const port = await new Promise<number>((r) =>
    server.listen(0, () => r((server.address() as { port: number }).port)),
  );
  return {
    server,
    port,
    hits,
    respondWith: (s) => {
      nextStatus = s;
    },
    stop: () => new Promise((r) => server.close(() => r())),
  };
}
