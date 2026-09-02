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
  ],
  out: "./drizzle",
  dialect: "postgresql",
});
