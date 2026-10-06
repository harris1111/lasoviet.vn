import {expect, test, type Page} from "@playwright/test";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {resolve} from "node:path";
const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const {build} = createRequire(require.resolve("vite"))("esbuild");
const stylesRoot = resolve(root, "apps/web/src/styles");
const styles = readFileSync(resolve(stylesRoot, "global.css"), "utf8").replace(/@import "\.\/([^"]+)";/g, (_, file: string) => readFileSync(resolve(stylesRoot, file), "utf8")) + readFileSync(resolve(stylesRoot, "contextual-unlock.css"), "utf8");
const fixture = JSON.parse(readFileSync("plan/evidence/2026-10-06-personal-daily-paid-qa.json", "utf8")).samples[0].reading;
let bundle = "";
test.beforeAll(async () => {
  const output = await build({stdin: {contents: `
    import {createRoot} from 'react-dom/client'; import {NextIntlClientProvider} from 'next-intl';
    import {PersonalDailyReadingPanel} from './src/features/ziwei/personal-daily-reading-panel';
    import vi from './messages/vi/ziwei.json';import en from './messages/en/ziwei.json';
    import reportsVi from './messages/vi/reports.json';import reportsEn from './messages/en/reports.json';
    const query=new URLSearchParams(location.search),locale=query.get('locale')==='en'?'en':'vi';
    const root=createRoot(document.getElementById('fixture')); window.fixtureRender=(version='fixture-version')=>root.render(<NextIntlClientProvider locale={locale} timeZone="Asia/Ho_Chi_Minh" messages={{ziwei:locale==='vi'?vi:en,reports:locale==='vi'?reportsVi:reportsEn}}>
      <PersonalDailyReadingPanel chartId="fixture-chart" key={version} chartVersionId={version} locale={locale} includedOnly={query.get('included')==='1'}/>
    </NextIntlClientProvider>);window.fixtureRender();`, loader: "tsx", resolveDir: resolve(root,"apps/web")}, bundle:true,
    alias:{"@lasoviet/contracts":resolve(root,"tests/e2e/helpers/browser-commerce-contracts.ts")},
    plugins:[{name:"navigation",setup(context){context.onResolve({filter:/^next\/navigation$/},()=>({path:"navigation",namespace:"mock"}));context.onLoad({filter:/.*/,namespace:"mock"},()=>({contents:"const router={push(){},refresh(){}};export function useRouter(){return router;}",loader:"js"}));}}],
    write:false,format:"iife",platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"',"process.env":"{}"}});
  bundle=output.outputFiles[0].text;
});
async function mount(page:Page,options:{bonus?:boolean;purchased?:boolean;locale?:string;included?:boolean;invalid?:boolean;holdIntent?:boolean}={}) {
  await page.clock.install({time:new Date(`${fixture.asOfDate}T16:59:00Z`)});
  const state={reads:0,intents:0,spends:0,claims:0,purchased:!!options.purchased,available:!!options.purchased||!!options.bonus,expired:false,heldIntents:[] as Array<()=>Promise<void>>};
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/*",async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith("/daily-reading")) {state.reads++;return state.available&&!state.expired?route.fulfill({json:{...fixture,chartId:options.invalid?"foreign-chart":"fixture-chart",chartVersionId:"fixture-version"},headers:{"x-daily-purchased":state.purchased?"true":"false"}}):route.fulfill({status:403,json:{code:"DAILY_READING_FORBIDDEN"}});}
    if(url.pathname.endsWith("/purchase-intents")){state.intents++;expect(route.request().postDataJSON()).toMatchObject({sku:"ZIWEI-TODAY-P0",locale:"vi"});const reply=()=>route.fulfill({json:{id:"11111111-1111-4111-8111-111111111111",amountLa:60,stateVersion:1}});if(options.holdIntent){state.heldIntents.push(reply);return;}return reply();}
    if(url.pathname.endsWith("/balance"))return route.fulfill({json:{totalLa:60,stateVersion:1}});
    if(url.pathname.endsWith("/unlock")){state.spends++;state.purchased=true;state.available=true;return route.fulfill({json:{value:{reportId:"daily-content-id"}}});}
    if(url.pathname.endsWith("/guarantee-claim")){state.claims++;state.available=false;return route.fulfill({json:{version:1,claimId:"claim",amountLaRestored:60,balance:{version:1,stateVersion:3,totalLa:60,purchasedLa:0,promotionalLa:60,updatedAt:"2026-09-30T03:00:00Z"},relatedPalaceSuggestion:{palaceId:"ziwei.palace.life",reason:"adjacent"}}});}
    if(url.pathname.endsWith("/parts"))return route.fulfill({json:{version:1,saved:true}});
    if(url.pathname==="/api/analytics/events")return route.fulfill({status:202,json:{ok:true}});
    if(url.pathname==="/")return route.fulfill({contentType:"text/html",body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="fixture"></div>'});
    return route.abort();
  });
  const params=new URLSearchParams({locale:options.locale??"vi",included:options.included?"1":"0"});
  await page.goto(`http://fixture.test/?${params}`);await page.addStyleTag({content:styles});await page.addScriptTag({content:bundle});
  if(options.locale!=="en")await expect.poll(()=>state.reads).toBe(1);
  return {state,errors};
}
for(const width of [390,1440])test(`daily confirmation and immediate reading at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const {state,errors}=await mount(page);
  await page.getByRole("button",{name:"Mở hôm nay – 60 Lá"}).click();await expect(page.getByRole("dialog")).toBeVisible();
  expect(state.spends).toBe(0);await page.getByRole("button",{name:"Xác nhận mở",exact:true}).click();
  await expect(page.getByTestId("personal-daily-reading")).toContainText(fixture.reading.headline);
  expect(state.spends).toBe(1);expect(state.intents).toBe(1);await expect(page.getByRole("dialog")).toHaveCount(0);
  const bounds=await page.getByTestId("personal-daily-reading").boundingBox();expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
  expect(errors).toEqual([]);
});
test("included bonus reads without any purchase",async({page})=>{const {state}=await mount(page,{bonus:true,included:true});await expect(page.getByTestId("personal-daily-reading")).toContainText(fixture.reading.headline);expect(state.intents+state.spends).toBe(0);await expect(page.getByRole("button",{name:"Mở hôm nay – 60 Lá"})).toHaveCount(0);});
test("midnight clears the old paid reading while the page stays open",async({page})=>{const {state}=await mount(page,{purchased:true});await expect(page.getByTestId("personal-daily-reading")).toContainText(fixture.reading.headline);state.expired=true;await page.clock.fastForward(60_001);await expect(page.getByTestId("personal-daily-reading")).not.toContainText(fixture.reading.headline);await expect(page.getByRole("button",{name:"Mở hôm nay – 60 Lá"})).toBeVisible();expect(state.spends).toBe(0);});
test("foreign chart payload never renders",async({page})=>{await mount(page,{purchased:true,invalid:true});await expect(page.getByTestId("personal-daily-reading")).not.toContainText(fixture.reading.headline);});
test("English cannot create an unsupported daily purchase",async({page})=>{const {state}=await mount(page,{locale:"en"});await expect(page.getByTestId("personal-daily-reading")).toBeVisible();await expect(page.getByTestId("personal-daily-reading").getByRole("button")).toHaveCount(0);expect(state.reads+state.intents+state.spends).toBe(0);});

test("version change closes confirmation and rejects a late old intent",async({page})=>{
  const {state,errors}=await mount(page,{holdIntent:true});
  await page.getByRole("button",{name:"Mở hôm nay – 60 Lá"}).click();
  await expect.poll(()=>state.heldIntents.length).toBe(1);
  await page.evaluate(()=>{(window as unknown as {fixtureRender:(version:string)=>void}).fixtureRender("new-version");});
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await state.heldIntents[0]();await page.clock.runFor(100);
  await expect(page.getByRole("dialog")).toHaveCount(0);expect(state.spends).toBe(0);expect(state.intents).toBe(1);expect(errors).toEqual([]);
});
