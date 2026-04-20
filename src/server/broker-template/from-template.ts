import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db";
import type { Broker } from "@prisma/client";
import { getTemplateById } from "./catalog";

export interface FromTemplateInput {
  templateId: string;
  name: string;
  endpointUrl: string;
  authConfig: Record<string, unknown>;
  postbackSecret?: string;
  isActive?: boolean;
}

export async function createBrokerFromTemplate(input: FromTemplateInput): Promise<Broker> {
  const tpl = await getTemplateById(input.templateId);
  if (!tpl) throw new Error("template_not_found");

  const postbackSecret = input.postbackSecret ?? randomBytes(24).toString("hex");

  return prisma.broker.create({
    data: {
      name: input.name,
      templateId: tpl.id,
      isActive: input.isActive ?? true,
      endpointUrl: input.endpointUrl,
      httpMethod: tpl.defaultHttpMethod,
      headers: tpl.defaultHeaders as object,
      authType: tpl.defaultAuthType,
      authConfig: input.authConfig as object,
      fieldMapping: tpl.fieldMapping as object,
      staticPayload: tpl.staticPayload as object,
      responseIdPath: tpl.responseIdPath,
      postbackSecret,
      postbackLeadIdPath: tpl.postbackLeadIdPath,
      postbackStatusPath: tpl.postbackStatusPath,
      statusMapping: tpl.statusMapping as object,
      syncMode: "webhook",
    },
  });
}
