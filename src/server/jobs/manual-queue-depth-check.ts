import { emitAlert } from "@/server/alerts/emitter";
import { getManualQueueDepth } from "@/server/routing/manual-queue";

const DEFAULT_THRESHOLD = Number.parseInt(process.env.MANUAL_QUEUE_ALERT_THRESHOLD ?? "25", 10);

export async function checkManualQueueDepth(threshold = DEFAULT_THRESHOLD): Promise<void> {
  const depth = await getManualQueueDepth();
  if (depth >= threshold) {
    await emitAlert("manual_queue_depth_exceeded", { depth, threshold });
  }
}
