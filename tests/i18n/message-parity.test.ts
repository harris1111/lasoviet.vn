import { describe, expect, it } from "vitest";
import viCommon from "../../apps/web/messages/vi/common.json";
import viNavigation from "../../apps/web/messages/vi/navigation.json";
import enCommon from "../../apps/web/messages/en/common.json";
import enNavigation from "../../apps/web/messages/en/navigation.json";
import {
  assertMessageParity,
  flattenKeys,
} from "../../scripts/check-i18n-parity.mjs";

const viMessages = {
  common: viCommon,
  navigation: viNavigation,
};

const enMessages = {
  common: enCommon,
  navigation: enNavigation,
};

describe("Vietnamese and English message parity", () => {
  it("keeps message keys aligned across locales", () => {
    expect(flattenKeys(viMessages)).toEqual(flattenKeys(enMessages));
    expect(assertMessageParity(viMessages, enMessages)).toEqual({
      ok: true,
    });
  });

  it("rejects incompatible interpolation tokens", () => {
    expect(() =>
      assertMessageParity(
        { greeting: "Xin chao, {name}!" },
        { greeting: "Hello!" },
      ),
    ).toThrow("I18N_TOKEN_MISMATCH");
  });
});
