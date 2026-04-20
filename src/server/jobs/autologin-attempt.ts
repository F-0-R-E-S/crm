import { type RunAttemptInput, runAutologinAttempt } from "@/server/autologin/run-attempt";
import { logger } from "@/server/observability";

export interface AutologinAttemptPayload extends RunAttemptInput {
  traceId: string;
}

export async function handleAutologinAttempt(p: AutologinAttemptPayload): Promise<void> {
  const { traceId, ...rest } = p;
  try {
    const out = await runAutologinAttempt(rest);
    logger.info({ traceId, ...out }, "autologin_attempt_done");
  } catch (err) {
    logger.error(
      { traceId, err: err instanceof Error ? err.message : "unknown" },
      "autologin_attempt_unhandled",
    );
  }
}
