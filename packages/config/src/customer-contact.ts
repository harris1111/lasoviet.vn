import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const contactChannelSchema = z.object({
  value: z.string().trim(),
  visible: z.boolean(),
}).strict();

export const customerContactConfigSchema = z.object({
  email: z.object({
    value: z.string().trim().email(),
    visible: z.boolean(),
  }).strict(),
  phone: contactChannelSchema,
  zalo: contactChannelSchema,
  address: contactChannelSchema,
  legalEntity: contactChannelSchema,
  social: contactChannelSchema,
}).strict();

export type ContactChannelConfig = z.infer<typeof contactChannelSchema>;
export type CustomerContactConfig = z.infer<typeof customerContactConfigSchema>;

export function validateCustomerContactConfig(source: unknown): CustomerContactConfig {
  const parsed = customerContactConfigSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error("CUSTOMER_CONTACT_CONFIG_INVALID");
  }
  return parsed.data;
}

function runtimeConfigFile(name: string): string {
  const workingDirectoryFile = resolve(process.cwd(), "config", name);
  if (existsSync(workingDirectoryFile)) {
    return workingDirectoryFile;
  }
  return resolve(process.cwd(), "..", "..", "config", name);
}

export const customerContactConfig: CustomerContactConfig = validateCustomerContactConfig(
  JSON.parse(readFileSync(runtimeConfigFile("customer-contact.json"), "utf8")),
);

export function buildCustomerSupportMailto(options?: {
  email?: string;
  orderCode?: string;
  locale?: "vi" | "en";
  subject?: string;
}): string {
  const email = options?.email || customerContactConfig.email.value;
  let subject = options?.subject;
  if (!subject && options?.orderCode) {
    const isVi = options?.locale !== "en";
    subject = isVi
      ? `[Lá Số Việt] Hỗ trợ đơn hàng ${options.orderCode}`
      : `[La So Viet] Support for order ${options.orderCode}`;
  }
  if (subject) {
    return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  }
  return `mailto:${email}`;
}
