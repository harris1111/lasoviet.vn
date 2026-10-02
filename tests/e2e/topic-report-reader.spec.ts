import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import content from "./helpers/topic-report-content.json";
const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { build } = createRequire(require.resolve("vite"))("esbuild");
const stylesRoot = resolve(root, "apps/web/src/styles");
const stylesheet = readFileSync(resolve(stylesRoot, "global.css"), "utf8").replace(/@import "\.\/([^"]+)";/g, (_, name: string) => readFileSync(resolve(stylesRoot, name), "utf8"));
const report = {version:1,state:"ready",contentVersion:"ziwei.topic-deep-dive.v1",reportId:"topic-report",reportVersionId:"topic-version",chartId:"chart",sku:"ZIWEI-RELATIONSHIP-P0",locale:"vi",fulfillmentStatus:"html_ready",lineage:{supersedesReportVersionId:null},content};
let bundle = "";
test.beforeAll(async () => {
  const result = await build({stdin:{contents:`
    import {createRoot} from "react-dom/client";
    import {NextIntlClientProvider} from "next-intl";
    import {TopicReportReader} from "./src/features/reports/topic-report-reader";
    import reports from "./messages/vi/reports.json";
    createRoot(document.getElementById("fixture")).render(<NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{reports}}><TopicReportReader report={${JSON.stringify(report)}}/></NextIntlClientProvider>);
  `,loader:"tsx",resolveDir:resolve(root,"apps/web")},alias:{"@lasoviet/contracts":resolve(root,"packages/contracts/src/guarantee-feedback-v1.ts")},bundle:true,write:false,format:"iife",platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"',"process.env":"{}"},plugins:[{name:"isolated-router",setup(build: {onResolve: Function;onLoad: Function}){build.onResolve({filter:/^next\/navigation$/},()=>({path:"router",namespace:"stub"}));build.onLoad({filter:/.*/,namespace:"stub"},()=>({contents:'export const useRouter=()=>({refresh(){},push(){}});',loader:"js"}));}}]});
  bundle=result.outputFiles[0].text;
});
for(const width of [320,390,1440]) test(`paid topic readable and printable at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/*",route=>new URL(route.request().url()).pathname==="/"?route.fulfill({contentType:"text/html",body:'<!doctype html><html data-theme="light"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="fixture"></div></body></html>'}):route.fulfill({status:204}));
  await page.goto("http://topic-reader.test/");await page.addStyleTag({content:stylesheet});await page.addScriptTag({content:bundle});
  await expect(page.getByRole("heading",{level:1})).toHaveText(report.content.title);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole("link",{name:"Về thư viện của bạn"})).toHaveAttribute("href","/tai-khoan/bao-cao");
  await expect(page.getByRole("button",{name:"Không đúng",exact:true})).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain("evidenceKeys");
  await page.screenshot({path:`/tmp/lsv58-topic-${width}.png`,fullPage:false});
  await page.emulateMedia({media:"print"});await expect(page.locator(".topic-reader-tools")).toBeHidden();await expect(page.locator(".part-feedback")).toBeHidden();await expect(page.getByRole("heading",{name:"Hành động thực tế"})).toBeVisible();
  expect(errors).toEqual([]);
});
