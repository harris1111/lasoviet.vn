import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, "../../../config/customer-contact.json");
const outputPath = resolve(__dirname, "../src/customer-contact.generated.ts");

const contactChannelSchema = z.object({
  value: z.string().trim(),
  visible: z.boolean(),
}).strict();

const customerContactConfigSchema = z.object({
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

const raw = JSON.parse(readFileSync(configPath, "utf8"));
const validated = customerContactConfigSchema.parse(raw);

const fileContent = `// Auto-generated from config/customer-contact.json. Do not edit manually.
import type { CustomerContactConfig } from "./customer-contact.js";

export const customerContactConfig: CustomerContactConfig = Object.freeze(${JSON.stringify(validated, null, 2)});
`;

writeFileSync(outputPath, fileContent, "utf8");
console.log("Successfully generated packages/config/src/customer-contact.generated.ts");
