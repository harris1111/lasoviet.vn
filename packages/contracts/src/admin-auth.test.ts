import { describe, expect, it } from "vitest";
import {
  AdminCapabilitySchema,
  AdminAccessV1Schema,
  ADMIN_CAPABILITIES,
} from "./admin-auth.js";

describe("admin capability and access schema", () => {
  it("includes admin.commerce.manage in capability schema and options", () => {
    expect(ADMIN_CAPABILITIES).toContain("admin.commerce.manage");
    expect(AdminCapabilitySchema.parse("admin.commerce.manage")).toBe("admin.commerce.manage");
  });

  it("validates AdminAccessV1 with admin.commerce.manage capability", () => {
    const access = {
      actorId: "admin-1",
      roleAssignmentId: "role-1",
      role: "super_admin",
      capabilities: ["admin.commerce.manage", "admin.commerce.read"],
    };
    expect(AdminAccessV1Schema.parse(access)).toEqual(access);
  });

  it("rejects unknown capability strings", () => {
    expect(() => AdminCapabilitySchema.parse("admin.commerce.invalid")).toThrow();
  });
});
