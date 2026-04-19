export interface VoipResult {
  lineType: string | null;
  mocked: boolean;
  error?: string;
}

export async function checkVoip(phoneE164: string): Promise<VoipResult> {
  const key = process.env.NUMVERIFY_API_KEY;
  if (!key) return { lineType: "mobile", mocked: true };

  const timeout = Number(process.env.ANTIFRAUD_VOIP_TIMEOUT_MS ?? "3000");
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctrl.abort();
      reject(new Error(`voip_timeout_${timeout}ms`));
    }, timeout);
  });
  try {
    const url = `http://apilayer.net/api/validate?access_key=${key}&number=${encodeURIComponent(phoneE164)}`;
    const res = await Promise.race([fetch(url, { signal: ctrl.signal }), timeoutPromise]);
    if (timer) clearTimeout(timer);
    if (!res.ok) return { lineType: null, mocked: false, error: `http ${res.status}` };
    const body = (await res.json()) as { line_type?: string };
    return { lineType: body.line_type ?? null, mocked: false };
  } catch (e) {
    if (timer) clearTimeout(timer);
    return { lineType: null, mocked: false, error: (e as Error).message };
  }
}
