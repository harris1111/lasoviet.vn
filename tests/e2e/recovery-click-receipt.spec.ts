import {expect,test} from "@playwright/test";
import {createRequire} from "node:module";
import {resolve} from "node:path";
const root=process.cwd(),require=createRequire(resolve(root,"package.json"));
const {build}=createRequire(require.resolve("vite"))("esbuild");
const orderId="11111111-1111-4111-8111-111111111111",deliveryId="22222222-2222-4222-8222-222222222222";
let bundle="";
test.beforeAll(async()=>{
 const result=await build({stdin:{contents:`import {createRoot} from 'react-dom/client';import {RecoveryClickReceipt} from './src/features/commerce/recovery-click-receipt';createRoot(document.getElementById('fixture')).render(<RecoveryClickReceipt orderId="${orderId}"/>);`,loader:"tsx",resolveDir:resolve(root,"apps/web")},bundle:true,write:false,format:"iife",platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'}});
 bundle=result.outputFiles[0].text;
});
test("records an opaque click once, removes the fragment and does not mutate commerce",async({page})=>{
 const posts:unknown[]=[];const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.route("**/*",async route=>{
  if(route.request().method()==="POST") {expect(new URL(route.request().url()).pathname).toBe("/api/commerce/recovery/receipt");posts.push(route.request().postDataJSON());return route.fulfill({status:200,json:{version:1,orderId,source:"reminder",classification:"captured_click"}});}
  return route.fulfill({contentType:"text/html",body:'<div id="fixture"></div>'});
 });
 await page.goto(`https://fixture.test/thanh-toan/${orderId}?utm_source=reminder#recovery=${deliveryId}`);await page.addScriptTag({content:bundle});
 await expect.poll(()=>posts.length).toBe(1);expect(posts).toEqual([{version:1,orderId,deliveryId}]);
 expect(new URL(page.url()).hash).toBe("");expect(new URL(page.url()).search).toBe("?utm_source=reminder");
 await page.reload();await page.addScriptTag({content:bundle});await expect(page.locator("#fixture")).toBeEmpty();
 expect(posts).toHaveLength(1);expect(errors).toEqual([]);
});
for(const hash of ["","#recovery=invalid","#token=unrelated"])test(`bare UTM or unrelated fragment ${hash} cannot record a click`,async({page})=>{
 const posts:string[]=[];await page.route("**/*",route=>{if(route.request().method()==="POST")posts.push(route.request().url());return route.fulfill({contentType:"text/html",body:'<div id="fixture"></div>'});});
 await page.goto(`https://fixture.test/thanh-toan/${orderId}?utm_source=reminder${hash}`);await page.addScriptTag({content:bundle});await expect(page.locator("#fixture")).toBeEmpty();
 expect(posts).toEqual([]);expect(new URL(page.url()).hash).toBe(hash);
});
