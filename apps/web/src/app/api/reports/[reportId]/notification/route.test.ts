import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../../../../api/private-api-client", () => ({privateApiClient: vi.fn(), PrivateApiClientError: class extends Error {constructor(readonly code: string,readonly status?: number){super(code);}}}));
vi.mock("../../../../../auth/resolve-current-actor", () => ({resolveVerifiedAccountActor: vi.fn(),VerifiedAccountResolutionError: class extends Error{}}));
import { privateApiClient, PrivateApiClientError } from "../../../../../api/private-api-client";
import { resolveVerifiedAccountActor, VerifiedAccountResolutionError } from "../../../../../auth/resolve-current-actor";
import { GET, POST } from "./route";
const reportId = "11111111-1111-4111-8111-111111111111", reportVersionId = "22222222-2222-4222-8222-222222222222";
const url = `https://lasoviet.net/api/reports/${reportId}/notification`,context={params:Promise.resolve({reportId})};
const actor = {kind:"account" as const,userId:"owner",sessionId:"session",requestId:"request"};
const view = {version:1,reportId,reportVersionId,locale:"vi",state:"subscribed",stateVersion:1};
describe("private owned report notification BFF", () => {
 beforeEach(()=>{vi.resetAllMocks();vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);});
 it("requires account authorization with private headers",async()=>{
  vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"));
  const r=await GET(new Request(url),context);expect(r.status).toBe(401);expect(r.headers.get("cache-control")).toBe("no-store");expect(r.headers.get("x-robots-tag")).toBe("noindex, nofollow");expect(privateApiClient).not.toHaveBeenCalled();
 });
 it.each(["https://evil.example","null","http://127.0.0.1"])("rejects mutation origin %s before API access",async origin=>{
  expect((await POST(new Request(url,{method:"POST",headers:{origin}}),context)).status).toBe(403);expect(privateApiClient).not.toHaveBeenCalled();
 });
 it.each([{...view,reportId:reportVersionId},{...view,ownerId:"foreign"},{...view,state:"sent"}])("rejects unexpected upstream identity or fields",async value=>{
  vi.mocked(privateApiClient).mockReturnValue({request:vi.fn().mockResolvedValue({ok:true,value})});expect((await GET(new Request(url),context)).status).toBe(502);
 });
 it("passes only schema-bound command and validates immutable version",async()=>{
  const request=vi.fn().mockResolvedValue({ok:true,value:view});vi.mocked(privateApiClient).mockReturnValue({request});
  const r=await POST(new Request(url,{method:"POST",headers:{origin:"https://lasoviet.net","content-type":"application/json"},body:JSON.stringify({version:1,reportVersionId,action:"subscribe"})}),context);
  expect(r.status).toBe(200);expect(await r.json()).toEqual(view);expect(request).toHaveBeenCalledWith(`/reports/${reportId}/notification`,expect.objectContaining({method:"POST"}));
 });
 it("rejects injected owner, malformed version and unbounded query",async()=>{
  for(const data of [{version:1,reportVersionId,action:"subscribe",ownerId:"foreign"},{version:1,reportVersionId:"invalid",action:"cancel"}]) {
   expect((await POST(new Request(url,{method:"POST",headers:{origin:"https://lasoviet.net","content-type":"application/json"},body:JSON.stringify(data)}),context)).status).toBe(400);
  }
  expect((await GET(new Request(url+"?ownerId=foreign"),context)).status).toBe(400);expect(privateApiClient).not.toHaveBeenCalled();
 });
 it("trusts canonical Origin rather than internal proxy URL",async()=>{
  vi.mocked(privateApiClient).mockReturnValue({request:vi.fn().mockResolvedValue({ok:true,value:view})});
  const r=await POST(new Request(`http://web:3000/api/reports/${reportId}/notification`,{method:"POST",headers:{origin:"https://lasoviet.net","content-type":"application/json"},body:JSON.stringify({version:1,reportVersionId,action:"subscribe"})}),context);
  expect(r.status).toBe(200);
 });
 it("rejects canonical-origin cross-site metadata and missing Origin",async()=>{
  for(const headers of [{origin:"https://lasoviet.net","sec-fetch-site":"cross-site"},{}])expect((await POST(new Request(url,{method:"POST",headers:headers as Record<string,string>}),context)).status).toBe(403);
  expect(privateApiClient).not.toHaveBeenCalled();
 });
 it.each([404,409,503])("redacts upstream error at %s",async status=>{
  vi.mocked(privateApiClient).mockReturnValue({request:vi.fn().mockRejectedValue(new PrivateApiClientError("private detail",status))});
  const r=await GET(new Request(url),context);expect(r.status).toBe(status);expect(await r.text()).toBe("");
 });
});
