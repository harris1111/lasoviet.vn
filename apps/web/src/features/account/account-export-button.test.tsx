import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountExportButton,
  AccountExportButtonView,
  createAccountExportAction,
  defaultTriggerDownload,
  executeAccountExport,
  getExportErrorMessage,
  type AccountExportState,
} from "./account-export-button";

describe("executeAccountExport", () => {
  it("fetches the same-origin export endpoint and triggers a JSON download", async () => {
    const blob = new Blob(['{"test":true}'], { type: "application/json" });
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
    } as unknown as Response);
    const triggerDownload = vi.fn();

    await expect(executeAccountExport({ fetchFn, triggerDownload })).resolves.toEqual({
      ok: true,
    });
    expect(fetchFn).toHaveBeenCalledWith("/api/account/export", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    expect(triggerDownload).toHaveBeenCalledWith(
      blob,
      "lasoviet-account-export.json",
    );
  });

  it("classifies HTTP and structured export-size limits without downloading", async () => {
    for (const response of [
      {
        ok: false,
        status: 413,
        clone: () => ({ json: () => Promise.resolve({}) }),
      },
      {
        ok: false,
        status: 400,
        clone: () => ({
          json: () =>
            Promise.resolve({ code: "ACCOUNT_EXPORT_LIMIT_EXCEEDED" }),
        }),
      },
    ]) {
      const triggerDownload = vi.fn();
      await expect(
        executeAccountExport({
          fetchFn: vi.fn().mockResolvedValue(response) as unknown as typeof fetch,
          triggerDownload,
        }),
      ).resolves.toEqual({ ok: false, error: "limit_exceeded" });
      expect(triggerDownload).not.toHaveBeenCalled();
    }
  });

  it("returns a generic error for unavailable and network failures", async () => {
    const unavailable = {
      ok: false,
      status: 503,
      clone: () => ({ json: () => Promise.reject(new Error("not JSON")) }),
    };
    await expect(
      executeAccountExport({
        fetchFn: vi.fn().mockResolvedValue(unavailable) as unknown as typeof fetch,
      }),
    ).resolves.toEqual({ ok: false, error: "generic" });
    await expect(
      executeAccountExport({
        fetchFn: vi.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch,
      }),
    ).resolves.toEqual({ ok: false, error: "generic" });
  });
});

describe("defaultTriggerDownload", () => {
  it("creates, clicks, removes, and revokes the object URL", () => {
    const blob = new Blob(["test"], { type: "application/json" });
    const link = { href: "", download: "", click: vi.fn() };
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const createObjectURL = vi.fn().mockReturnValue("blob:export");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue(link),
      body: { appendChild, removeChild },
    });

    try {
      defaultTriggerDownload(blob, "lasoviet-account-export.json");
      expect(link.href).toBe("blob:export");
      expect(link.download).toBe("lasoviet-account-export.json");
      expect(appendChild).toHaveBeenCalledWith(link);
      expect(link.click).toHaveBeenCalledOnce();
      expect(removeChild).toHaveBeenCalledWith(link);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:export");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("AccountExportButton", () => {
  it("localizes error messages and renders accessible busy and error states", () => {
    expect(getExportErrorMessage("limit_exceeded", "vi")).toContain("5 MB");
    expect(getExportErrorMessage("generic", "en")).toContain("try again later");

    const busyHtml = renderToStaticMarkup(
      <AccountExportButton locale="vi" initialBusy={true} />,
    );
    expect(busyHtml).toContain("Đang xuất...");
    expect(busyHtml).toContain("disabled");
    expect(busyHtml).toContain('aria-busy="true"');

    const alertHtml = renderToStaticMarkup(
      <AccountExportButton
        locale="en"
        initialError="Export service is temporarily unavailable. Please try again later."
      />,
    );
    expect(alertHtml).toContain('role="alert"');
  });

  it("transitions busy state and renders the localized size-limit alert", async () => {
    const transitions: AccountExportState[] = [];
    let state: AccountExportState = { isBusy: false, errorMessage: null };
    const onClick = createAccountExportAction({
      locale: "vi",
      fetchFn: vi.fn().mockResolvedValue({
        ok: false,
        status: 413,
        clone: () => ({ json: () => Promise.resolve({}) }),
      }) as unknown as typeof fetch,
      triggerDownload: vi.fn(),
      onStateChange: (next) => {
        state = next;
        transitions.push(next);
      },
    });

    await onClick();
    expect(transitions).toEqual([
      { isBusy: true, errorMessage: null },
      {
        isBusy: false,
        errorMessage:
          "Dữ liệu xuất vượt quá giới hạn cho phép (5 MB). Vui lòng liên hệ bộ phận hỗ trợ.",
      },
    ]);

    const html = renderToStaticMarkup(
      <AccountExportButtonView
        locale="vi"
        isBusy={state.isBusy}
        errorMessage={state.errorMessage}
        onClick={onClick}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("disabled");
  });
});
