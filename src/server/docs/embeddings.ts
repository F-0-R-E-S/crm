export const EMBEDDING_DIM = 1024;
const MAX_BATCH = 32;

function baseUrl(): string {
  const u = process.env.OLLAMA_BASE_URL;
  if (!u) throw new Error("OLLAMA_BASE_URL is not set — cannot produce embeddings");
  return u.replace(/\/$/, "");
}

function model(): string {
  return process.env.OLLAMA_EMBEDDING_MODEL ?? "bge-m3";
}

function authHeaders(): Record<string, string> {
  const t = process.env.OLLAMA_AUTH_TOKEN;
  return t ? { "x-ollama-auth": t } : {};
}

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${baseUrl()}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ model: model(), input: text }),
  });
  if (!res.ok) throw new Error(`embed failed: ${res.status}`);
  const j = await res.json();
  return (j.embedding ?? j.embeddings?.[0]) as number[];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const slice = texts.slice(i, i + MAX_BATCH);
    const res = await fetch(`${baseUrl()}/api/embed`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ model: model(), input: slice }),
    });
    if (!res.ok) throw new Error(`embed batch failed: ${res.status}`);
    const j = await res.json();
    out.push(...(j.embeddings as number[][]));
  }
  return out;
}
