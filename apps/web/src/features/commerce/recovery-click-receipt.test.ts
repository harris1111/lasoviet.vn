import {describe,expect,it} from "vitest";
import {recoveryDeliveryId} from "./recovery-click-receipt";
describe("opaque recovery fragment",()=>{
 it("accepts only one exact opaque receipt",()=>{expect(recoveryDeliveryId("#recovery=22222222-2222-4222-8222-222222222222")).toBe("22222222-2222-4222-8222-222222222222");});
 it.each(["","#utm_source=reminder","#recovery=owner","#recovery=22222222-2222-4222-8222-222222222222&owner=foreign","#token=secret"])("rejects %s",value=>{expect(recoveryDeliveryId(value)).toBeNull();});
});
