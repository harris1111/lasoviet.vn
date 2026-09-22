import { describe, expect, it } from "vitest";

import {
  buildCustomerSupportMailto,
  customerContactConfig,
  validateCustomerContactConfig,
} from "./customer-contact";

describe("customerContactConfig", () => {
  it("loads valid customer contact config with email enabled and others disabled", () => {
    expect(customerContactConfig.email.value).toBe("support@lasoviet.net");
    expect(customerContactConfig.email.visible).toBe(true);
    expect(customerContactConfig.phone.visible).toBe(false);
    expect(customerContactConfig.zalo.visible).toBe(false);
    expect(customerContactConfig.address.visible).toBe(false);
    expect(customerContactConfig.legalEntity.visible).toBe(false);
    expect(customerContactConfig.social.visible).toBe(false);
  });

  it("throws on invalid customer contact config source", () => {
    expect(() =>
      validateCustomerContactConfig({
        email: { value: "not-an-email", visible: true },
      }),
    ).toThrow("CUSTOMER_CONTACT_CONFIG_INVALID");
  });

  it("builds safe customer support mailto link with prefilled order code", () => {
    const viMailto = buildCustomerSupportMailto({
      orderCode: "LSV-INV-2026-001",
      locale: "vi",
    });
    expect(viMailto).toBe(
      "mailto:support@lasoviet.net?subject=%5BL%C3%A1%20S%E1%BB%91%20Vi%E1%BB%87t%5D%20H%E1%BB%97%20tr%E1%BB%A3%20%C4%91%C6%A1n%20h%C3%A0ng%20LSV-INV-2026-001",
    );

    const enMailto = buildCustomerSupportMailto({
      orderCode: "LSV-INV-2026-001",
      locale: "en",
    });
    expect(enMailto).toBe(
      "mailto:support@lasoviet.net?subject=%5BLa%20So%20Viet%5D%20Support%20for%20order%20LSV-INV-2026-001",
    );

    const plainMailto = buildCustomerSupportMailto();
    expect(plainMailto).toBe("mailto:support@lasoviet.net");
  });
});
