import { Project, SyntaxKind } from "ts-morph";
import { BLOCK_CATALOG } from "../block-catalog";
import type { BlockId, Section } from "../types";

const ENV_PREFIX_TO_BLOCK: Array<[RegExp, BlockId]> = [
  [/^STRIPE_/, "billing-subscription"],
  [/^TELEGRAM_/, "telegram-bot"],
  [/^FRAUD_/, "fraud-score"],
  [/^ROUTING_/, "routing-engine"],
  [/^AUTOLOGIN_|PROXY_/, "autologin"],
  [/^ANALYTICS_/, "analytics"],
  [/^RATELIMIT_|^RATE_LIMIT_/, "rate-limiting"],
  [/^ONBOARDING_|^SIGNUP_/, "onboarding"],
  [/^MANUAL_QUEUE_/, "manual-review"],
  [/^AUDIT_/, "intake"],
  [/^ROOT_DOMAIN$/, "multi-tenancy"],
];

export interface EnvExtractOpts {
  envFilePath: string;
  cwd?: string;
}

export async function extractEnv(
  opts: EnvExtractOpts,
): Promise<Map<BlockId | "__shared__", Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const project = new Project({ tsConfigFilePath: `${cwd}/tsconfig.json` });
  const sf = project.addSourceFileAtPath(`${cwd}/${opts.envFilePath}`);

  const out = new Map<BlockId | "__shared__", Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__shared__", []);

  const zObjects = sf
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((c) => c.getExpression().getText() === "z.object");

  for (const call of zObjects) {
    const arg = call.getArguments()[0];
    if (!arg?.isKind(SyntaxKind.ObjectLiteralExpression)) continue;
    for (const prop of arg.asKindOrThrow(SyntaxKind.ObjectLiteralExpression).getProperties()) {
      if (!prop.isKind(SyntaxKind.PropertyAssignment)) continue;
      const pa = prop.asKindOrThrow(SyntaxKind.PropertyAssignment);
      const name = pa.getName().replace(/['"]/g, "");
      const init = pa.getInitializer();
      if (!init) continue;

      const block = resolveEnvBlock(name);
      const body = `Environment variable. Zod schema fragment:\n\n\`\`\`ts\n${name}: ${init.getText()}\n\`\`\``;

      out.get(block)!.push({
        source: "env",
        heading: name,
        anchor: `env-${name.toLowerCase()}`,
        body,
      });
    }
  }
  return out;
}

function resolveEnvBlock(name: string): BlockId | "__shared__" {
  for (const [re, block] of ENV_PREFIX_TO_BLOCK) if (re.test(name)) return block;
  return "__shared__";
}
