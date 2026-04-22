import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { BLOCK_CATALOG, resolveBlock } from "../block-catalog";
import type { BlockId, Section } from "../types";

// Matches: boss.schedule(JOB_NAMES.someKey, "cron-expr", ...)
const SCHEDULE_JOB_NAMES_RE = /\.schedule\s*\(\s*JOB_NAMES\.(\w+)\s*,\s*['"]([^'"]+)['"]/g;
// Matches: boss.schedule("literal-name", "cron-expr", ...)
const SCHEDULE_LITERAL_RE = /\.schedule\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;

// Matches: someKey: "some-job-name" inside JOB_NAMES = { ... }
const JOB_NAMES_ENTRY_RE = /(\w+):\s*['"]([^'"]+)['"]/g;

function execAll(re: RegExp, src: string): RegExpExecArray[] {
  re.lastIndex = 0;
  const results: RegExpExecArray[] = [];
  let m = re.exec(src);
  while (m !== null) {
    results.push(m);
    m = re.exec(src);
  }
  return results;
}

export interface JobsExtractOpts {
  jobsDir: string;
  workerFile?: string;
  queueFile?: string;
  cwd?: string;
}

export async function extractJobs(opts: JobsExtractOpts): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const workerFile = opts.workerFile ?? "worker.ts";
  const queueFile = opts.queueFile ?? "src/server/jobs/queue.ts";

  const out = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__unassigned__", []);

  // Build JOB_NAMES camelKey -> job-name map from queue.ts
  const jobNameMap = new Map<string, string>(); // camelKey -> "kebab-job-name"
  try {
    const queueSrc = await readFile(`${cwd}/${queueFile}`, "utf8");
    // Extract the block between "JOB_NAMES = {" and "} as const"
    const blockMatch = /JOB_NAMES\s*=\s*\{([^}]+)\}/s.exec(queueSrc);
    if (blockMatch) {
      for (const m of execAll(JOB_NAMES_ENTRY_RE, blockMatch[1])) {
        jobNameMap.set(m[1], m[2]);
      }
    }
  } catch {
    // queue file not found — carry on
  }

  // Build schedule map: job-name -> cron expression, from worker.ts
  const schedules = new Map<string, string>();
  try {
    const workerSrc = await readFile(`${cwd}/${workerFile}`, "utf8");
    // JOB_NAMES.key style
    for (const m of execAll(SCHEDULE_JOB_NAMES_RE, workerSrc)) {
      const camelKey = m[1];
      const cron = m[2];
      const jobName = jobNameMap.get(camelKey);
      if (jobName) schedules.set(jobName, cron);
    }
    // literal string style
    for (const m of execAll(SCHEDULE_LITERAL_RE, workerSrc)) {
      schedules.set(m[1], m[2]);
    }
  } catch {
    // worker file not found — carry on
  }

  // Scan all job files
  const files = await fg(`${opts.jobsDir}/**/*.ts`, { cwd, absolute: true });

  for (const f of files) {
    // Skip test files
    if (f.endsWith(".test.ts")) continue;

    const jobName = f.split("/").pop()!.replace(/\.ts$/, "");
    const block =
      (resolveBlock({ kind: "job-name", name: jobName }) as BlockId | null) ?? "__unassigned__";
    const schedule = schedules.get(jobName);
    const rel = f.slice(cwd.length + 1);

    const scheduleText = schedule
      ? `schedule: \`${schedule}\`\n\n`
      : "schedule: on-demand (enqueued from code).\n\n";
    const body = `pg-boss job \`${jobName}\`.\n\n${scheduleText}Handler: \`${rel}\``;

    out.get(block)!.push({
      source: "jobs",
      heading: jobName,
      anchor: `job-${jobName}`,
      body,
    });
  }

  // Return without __unassigned__ so callers get Map<BlockId, Section[]>
  const result = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) result.set(b.id, out.get(b.id) ?? []);
  return result;
}
