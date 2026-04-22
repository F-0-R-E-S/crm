export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOpts {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
}

function baseUrl(): string {
  const u = process.env.OLLAMA_BASE_URL;
  if (!u) throw new Error("OLLAMA_BASE_URL is not set");
  return u.replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const t = process.env.OLLAMA_AUTH_TOKEN;
  return t ? { "x-ollama-auth": t } : {};
}

export async function* streamChat(opts: ChatOpts): AsyncGenerator<string, void, unknown> {
  const model = opts.model ?? process.env.DOCS_LLM_MODEL ?? "qwen3:8b-instruct-q5_K_M";
  const temperature = opts.temperature ?? Number(process.env.DOCS_LLM_TEMPERATURE ?? 0.1);
  const maxTokens = opts.maxTokens ?? Number(process.env.DOCS_LLM_MAX_TOKENS ?? 1024);

  const res = await fetch(`${baseUrl()}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      stream: true,
      options: { temperature, num_predict: maxTokens },
    }),
    signal: opts.abortSignal,
  });
  if (!res.ok) throw new Error(`ollama chat failed: ${res.status}`);
  if (!res.body) throw new Error("ollama chat returned no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        const delta: string | undefined = obj.message?.content;
        if (delta) yield delta;
        if (obj.done) return;
      } catch {
        // malformed line — skip silently
      }
    }
  }
}
