import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return null;
}

const configArg = getArg("--config");
const outputArg = getArg("--output");

const configPath = configArg
  ? resolve(process.cwd(), configArg)
  : resolve(__dirname, "../../../config/customer-contact.json");

const outputPath = outputArg
  ? resolve(process.cwd(), outputArg)
  : resolve(__dirname, "../src/customer-contact.generated.ts");

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

const isCheckMode = process.argv.includes("--check");

if (isCheckMode) {
  if (!existsSync(outputPath)) {
    console.error("Generated customer contact file does not exist: " + outputPath);
    process.exit(1);
  }
  const currentContent = readFileSync(outputPath, "utf8");
  if (currentContent !== fileContent) {
    console.error("Customer contact config drift detected. Run pnpm --filter @lasoviet/config build to regenerate.");
    process.exit(1);
  }
  console.log("Customer contact config is in sync.");
  process.exit(0);
}

writeFileSync(outputPath, fileContent, "utf8");
console.log("Successfully generated packages/config/src/customer-contact.generated.ts");
