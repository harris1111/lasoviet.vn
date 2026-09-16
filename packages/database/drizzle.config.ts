import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./src/schema/auth.ts",
    "./src/schema/privacy.ts",
    "./src/schema/birth-profile.ts",
    "./src/schema/outbox.ts",
    "./src/schema/audit.ts",
    "./src/schema/admin-access.ts",
    "./src/schema/notifications.ts",
    "./src/schema/commerce.ts",
    "./src/schema/reports.ts",
    "./src/schema/assets.ts",
    "./src/schema/support-cases.ts",
    "./src/schema/knowledge.ts",
    "./src/schema/analytics.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
});
