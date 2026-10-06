import {expect,test,type Page} from "@playwright/test";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {readFileSync} from "node:fs";
const root=process.cwd(),require=createRequire(resolve(root,"package.json"));
const {build}=createRequire(require.resolve("vite"))("esbuild");
const reportId="11111111-1111-4111-8111-111111111111",reportVersionId="22222222-2222-4222-8222-222222222222";
const stylesRoot=resolve(root,"apps/web/src/styles");
const styles=readFileSync(resolve(stylesRoot,"global.css"),"utf8").replace(/@import "\.\/([^"]+)";/g,(_,file:string)=>readFileSync(resolve(stylesRoot,file),"utf8"));
let bundle="";
test.beforeAll(async()=>{
 const output=await build({stdin:{contents:`
 import {createRoot} from 'react-dom/client';import {NextIntlClientProvider} from 'next-intl';
 import {ReportNotification} from './src/features/reports/report-notification';
 import vi from './messages/vi/reports.json';import en from './messages/en/reports.json';
 const locale=new URLSearchParams(location.search).get('locale')==='en'?'en':'vi';
 const root=createRoot(document.getElementById('fixture'));
 window.renderFixture=(version='${reportVersionId}')=>root.render(<NextIntlClientProvider locale={locale} timeZone="Asia/Ho_Chi_Minh" messages={{reports:locale==='vi'?vi:en}}><ReportNotification reportId="${reportId}" reportVersionId={version} locale={locale}/></NextIntlClientProvider>);
 window.renderFixture();`,loader:"tsx",resolveDir:resolve(root,"apps/web")},bundle:true,
 alias:{"@lasoviet/contracts":resolve(root,"packages/contracts/src/report-notification-v1.ts")},
 write:false,format:"iife",platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'}});
 bundle=output.outputFiles[0].text;
});
async function mount(page:Page,options:{locale?:"vi"|"en";invalid?:boolean;failPost?:boolean;holdPost?:boolean}={}) {
 const locale=options.locale??"vi";let state="not_registered";const commands:string[]=[];const held:Array<()=>Promise<void>>=[];
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.route("**/*",async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith("/notification")) {
   const value=()=>({version:1,reportId,reportVersionId:options.invalid?reportId:reportVersionId,locale,state,stateVersion:commands.length});
   if(route.request().method()==="POST") {
    const command=route.request().postDataJSON();expect(command.reportVersionId).toBe(reportVersionId);commands.push(command.action);
    if(options.failPost)return route.fulfill({status:409,body:""});
    state=command.action==="subscribe"?"subscribed":"cancelled";
    const reply=()=>route.fulfill({json:value()});if(options.holdPost){held.push(reply);return;}return reply();
   }
   return route.fulfill({json:value()});
  }
  if(url.pathname==="/")return route.fulfill({contentType:"text/html",body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="fixture"></div>'});
  return route.abort();
 });
 await page.goto(`https://fixture.test/?locale=${locale}`);await page.addStyleTag({content:styles});await page.addScriptTag({content:bundle});return {commands,held,errors};
}
for(const width of [390,1440])test(`registers and cancels owned request at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:860});const s=await mount(page);
 await page.getByRole("button",{name:"Báo tôi khi xong",exact:true}).click();await expect(page.getByRole("status")).toContainText("Đã đăng ký");
 await expect(page.getByText("Hủy yêu cầu nhắc riêng không hủy thông báo tự động của đơn mua.")).toBeVisible();
 await page.getByRole("button",{name:"Hủy yêu cầu nhắc riêng",exact:true}).click();await expect(page.getByRole("button",{name:"Báo tôi khi xong",exact:true})).toBeVisible();
 expect(s.commands).toEqual(["subscribe","cancel"]);expect(s.errors).toEqual([]);
});
test("maintains English copy parity",async({page})=>{
 const s=await mount(page,{locale:"en"});await page.getByRole("button",{name:"Notify me when ready",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("Registered for this report");expect(s.errors).toEqual([]);
});
test("foreign immutable version cannot expose a register control",async({page})=>{
 const s=await mount(page,{invalid:true});await expect(page.getByRole("alert")).toBeVisible();expect(await page.getByRole("button").count()).toBe(0);expect(s.commands).toEqual([]);
});
test("failed command never claims registration",async({page})=>{
 await mount(page,{failPost:true});await page.getByRole("button",{name:"Báo tôi khi xong",exact:true}).click();await expect(page.getByRole("alert")).toBeVisible();expect(await page.getByRole("status").count()).toBe(0);
});
test("late registration response cannot appear after immutable version changes",async({page})=>{
 const s=await mount(page,{holdPost:true});await page.getByRole("button",{name:"Báo tôi khi xong",exact:true}).click();
 await expect.poll(()=>s.held.length).toBe(1);await page.evaluate(()=> (window as unknown as {renderFixture:(v:string)=>void}).renderFixture("33333333-3333-4333-8333-333333333333"));
 await expect(page.getByRole("alert")).toBeVisible();await s.held[0]();expect(await page.getByRole("status").count()).toBe(0);expect(s.commands).toEqual(["subscribe"]);
});
