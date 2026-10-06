import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("../../../../../api/private-api-client",()=>({privateApiClient:vi.fn(),PrivateApiClientError:class extends Error{constructor(readonly code:string,readonly status?:number){super(code);}}}));
vi.mock("../../../../../auth/resolve-current-actor",()=>({resolveVerifiedAccountActor:vi.fn(),VerifiedAccountResolutionError:class extends Error{}}));
import {privateApiClient,PrivateApiClientError} from "../../../../../api/private-api-client";
import {resolveVerifiedAccountActor,VerifiedAccountResolutionError} from "../../../../../auth/resolve-current-actor";
import {POST} from "./route";
const orderId="11111111-1111-4111-8111-111111111111",deliveryId="22222222-2222-4222-8222-222222222222",url="https://lasoviet.net/api/commerce/recovery/receipt";
const command={version:1,orderId,deliveryId},view={version:1,orderId,source:"reminder",classification:"captured_click"};
function request(body:unknown=command,origin="https://lasoviet.net",target=url){return new Request(target,{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});}
describe("private recovery receipt BFF",()=>{
 beforeEach(()=>{vi.resetAllMocks();vi.mocked(resolveVerifiedAccountActor).mockResolvedValue({kind:"account",userId:"owner",sessionId:"session",requestId:"request"});});
 it.each(["https://evil.example","null","https://lasoviet.vn"])("rejects %s before actor access",async origin=>{expect((await POST(request(command,origin))).status).toBe(403);expect(resolveVerifiedAccountActor).not.toHaveBeenCalled();});
 it("requires verified account and private headers",async()=>{vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"));const r=await POST(request());expect(r.status).toBe(401);expect(r.headers.get("cache-control")).toBe("no-store");expect(r.headers.get("x-robots-tag")).toBe("noindex, nofollow");});
 it("sends only the strict immutable receipt command",async()=>{const call=vi.fn().mockResolvedValue({ok:true,value:view});vi.mocked(privateApiClient).mockReturnValue({request:call});const r=await POST(request());expect(r.status).toBe(200);expect(await r.json()).toEqual(view);expect(call).toHaveBeenCalledWith("/commerce/recovery/receipt",expect.objectContaining({method:"POST",body:JSON.stringify(command)}));});
 it.each([{...command,ownerId:"foreign"},{...command,utm_source:"reminder"},{...command,deliveryId:"invalid"}])("rejects injected fields",async body=>{expect((await POST(request(body))).status).toBe(400);expect(privateApiClient).not.toHaveBeenCalled();});
 it("rejects query parameters",async()=>{expect((await POST(request(command,"https://lasoviet.net",url+"?utm_source=reminder"))).status).toBe(400);});
 it.each([404,503,500])("redacts upstream %s",async status=>{vi.mocked(privateApiClient).mockReturnValue({request:vi.fn().mockRejectedValue(new PrivateApiClientError("PRIVATE",status))});expect((await POST(request())).status).toBe(status===500?502:status);});
 it("rejects wrong upstream order or monetary projection",async()=>{for(const value of [{...view,orderId:deliveryId},{...view,paidVnd:29000}]){vi.mocked(privateApiClient).mockReturnValue({request:vi.fn().mockResolvedValue({ok:true,value})});expect((await POST(request())).status).toBe(502);}});
});
