import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import TopUpPage from "./page";
vi.mock("../../../auth/resolve-current-actor", () => ({ resolveVerifiedAccountActor: vi.fn(async () => ({ kind: "account", userId: "member", sessionId: "session", requestId: "request" })), VerifiedAccountResolutionError: class extends Error {} }));
vi.mock("../../../features/account/account-data-loader", () => ({ accountDataLoader: { loadWalletBalance: vi.fn(async () => ({ ok: true, value: { totalLa: 2000 } })) } }));
vi.mock("../../../features/reports/paid-topic-selector", () => ({ PaidTopicSelector: ({ initialTab }: { initialTab: string }) => <div data-active-tab={initialTab} /> }));
describe("membership reminder navigation", () => {
  it("opens the membership tab only for the closed membership query value", async () => {
    const membership = await TopUpPage({ params: Promise.resolve({ locale: "vi" }), searchParams: Promise.resolve({ tab: "hoi-vien" }) });
    expect(renderToStaticMarkup(membership)).toContain('data-active-tab="hoi-vien"');
    const fallback = await TopUpPage({ params: Promise.resolve({ locale: "vi" }), searchParams: Promise.resolve({ tab: "arbitrary" }) });
    expect(renderToStaticMarkup(fallback)).toContain('data-active-tab="nap-la"');
  });
});
