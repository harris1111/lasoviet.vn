import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { build } = createRequire(require.resolve("vite"))("esbuild");
const stylesRoot = resolve(root, "apps/web/src/styles");
const styles = readFileSync(resolve(stylesRoot, "global.css"), "utf8").replace(/@import "\.\/([^"]+)";/g, (_, file: string) => readFileSync(resolve(stylesRoot, file), "utf8")) + readFileSync(resolve(stylesRoot, "contextual-unlock.css"), "utf8");
let bundle = "";
test.beforeAll(async () => {
  const built = await build({ stdin: { contents: `
    import {createRoot} from 'react-dom/client'; import {NextIntlClientProvider} from 'next-intl';
    import {PendingUnlockBanner} from './src/features/commerce/pending-unlock-banner';
    import {Guest24hDeletionBanner} from './src/features/ziwei/guest-24h-deletion-banner';
    import {OfferLadder} from './src/features/reports/offer-ladder';
    import vi from './messages/vi/reports.json'; import en from './messages/en/reports.json';
    const query=new URLSearchParams(location.search), locale=query.get('locale')==='en'?'en':'vi';
    const quotes={version:1,chartId:'fixture-chart',chartVersionId:'fixture-version',locale,quotedAt:'2026-10-06T18:00:00Z',quotes:[
      {sku:'ZIWEI-NATAL-EXCERPT-P0',state:query.get('quote')||'available',basePriceLa:240,priceLa:240,creditLa:0,discountLa:0,creditExpiresAt:null,creditSourceSkus:[],reportId:null,reportState:null}]};
    createRoot(document.getElementById('fixture')).render(<NextIntlClientProvider locale={locale} timeZone="Asia/Ho_Chi_Minh" messages={{reports:locale==='en'?en:vi}}>
      <PendingUnlockBanner locale={locale}/><Guest24hDeletionBanner locale={locale} signInHref="/dang-nhap"/>
      <OfferLadder chartId="fixture-chart" chartVersionId="fixture-version" locale={locale} initialSku="ZIWEI-NATAL-EXCERPT-P0"
        initialResume={query.get('resume')==='1'} initialQuotes={query.get('guest')==='1'?{status:'guest'}:{status:'ready',value:quotes}} balance={0} scores={{}}/>
    </NextIntlClientProvider>);
  `, loader: "tsx", resolveDir: resolve(root, "apps/web") }, bundle: true,
    alias: { "@lasoviet/contracts": resolve(root, "tests/e2e/helpers/browser-commerce-contracts.ts") },
    plugins: [{name:"session-navigation",setup(context){
      context.onResolve({filter:/auth-client$/},()=>({path:"auth",namespace:"mock"}));
      context.onResolve({filter:/^next\/navigation$/},()=>({path:"navigation",namespace:"mock"}));
      context.onLoad({filter:/.*/,namespace:"mock"},args=>({loader:"js",resolveDir:resolve(root,"apps/web"),contents:args.path==='auth'?
        `import {useSyncExternalStore} from 'react'; const subscribe=f=>{window.addEventListener('fixture-state',f);return()=>window.removeEventListener('fixture-state',f)}; export const authClient={useSession(){return {data:useSyncExternalStore(subscribe,()=>window.__session,()=>null)}}};`:
        `import {useSyncExternalStore} from 'react'; const subscribe=f=>{window.addEventListener('fixture-state',f);return()=>window.removeEventListener('fixture-state',f)};const router={push(){},refresh(){}};export function useRouter(){return router};export function usePathname(){return useSyncExternalStore(subscribe,()=>window.__path,()=>'/')};` }));
    }}], write:false,format:"iife",platform:"browser",jsx:"automatic",define:{"process.env":"{}","process.env.NODE_ENV":'"production"'} });
  bundle=built.outputFiles[0].text;
});
async function mount(page: Page, options: {locale?:string; guest?:boolean; resume?:boolean; quote?:string; hint?:Record<string,unknown>|null; path?:string; hold?:boolean}={}) {
  const locale=options.locale??"vi";
  const state={requests:0,spends:0,orders:0,intents:0,held:[] as Array<()=>Promise<void>>,hint:options.hint===undefined?{version:1,ownerId:"owner",intentId:"11111111-1111-4111-8111-111111111111",chartId:"fixture-chart",chartVersionId:"fixture-version",sku:"ZIWEI-NATAL-EXCERPT-P0",locale,priceLa:240,balanceLa:0,gapLa:240}:options.hint};
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/*",async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==="/api/commerce/wallet/pending-unlock"){
      state.requests++; const reply=()=>route.fulfill({json:state.hint}); if(options.hold){state.held.push(reply);return;}return reply();
    }
    if(url.pathname.endsWith("/quotes"))return route.fulfill({status:options.guest?401:200,json:{version:1,chartId:"fixture-chart",chartVersionId:"fixture-version",locale,quotedAt:"2026-10-06T18:00:00Z",quotes:[{sku:"ZIWEI-NATAL-EXCERPT-P0",state:options.quote??"available",basePriceLa:240,priceLa:240,creditLa:0,discountLa:0,creditExpiresAt:null,creditSourceSkus:[],reportId:null,reportState:null}]}});
    if(url.pathname.endsWith("/balance"))return route.fulfill({json:{totalLa:0,stateVersion:1}});
    if(url.pathname.endsWith("/purchase-intents")){state.intents++;return route.fulfill({json:{id:"11111111-1111-4111-8111-111111111111",amountLa:240,stateVersion:1}});}
    if(url.pathname.endsWith("/unlock")){state.spends++;return route.fulfill({status:409,json:{code:"FIXTURE_UNEXPECTED_SPEND"}});}
    if(url.pathname.endsWith("/top-up-orders")){state.orders++;return route.fulfill({status:409,json:{code:"FIXTURE_UNEXPECTED_ORDER"}});}
    if(url.pathname==="/api/analytics/events")return route.fulfill({status:202,json:{ok:true}});
    if(url.pathname==="/")return route.fulfill({contentType:"text/html",body:'<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="fixture"></div>'});
    return route.abort();
  });
  const query=new URLSearchParams({locale,...(options.guest?{guest:"1"}:{}),...(options.resume?{resume:"1"}:{}),...(options.quote?{quote:options.quote}:{})});
  await page.goto(`http://fixture.test/?${query}`);
  await page.evaluate(({guest,path})=>{Object.assign(window,{__session:guest?null:{user:{id:"owner",emailVerified:true}},__path:path});},{guest:!!options.guest,path:options.path??"/tai-khoan"});
  await page.addStyleTag({content:styles});await page.addScriptTag({content:bundle});
  await expect(page.getByTestId("offer-ladder")).toBeVisible();
  return {state,errors};
}
for(const width of [390,1440])test(`private hint wraps and resumes exact item at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const {state,errors}=await mount(page);
  const banner=page.getByTestId("pending-unlock-banner");await expect(banner).toContainText("240 Lá");
  await expect(banner.getByRole("link")).toHaveAttribute("href","/la-so/fixture-chart/chon-luan-giai?offer=ziwei-natal-excerpt&resume=1");
  const bounds=await banner.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
  await banner.getByRole("button",{name:"Ẩn lời nhắc này"}).click();await expect(banner).toHaveCount(0);
  await page.evaluate(()=>{Object.assign(window,{__path:"/tai-khoan/ho-so-sinh"});window.dispatchEvent(new Event("fixture-state"));});
  await expect.poll(()=>state.requests).toBe(2);await expect(banner).toHaveCount(0);expect(state.spends+state.orders+state.intents).toBe(0);expect(errors).toEqual([]);
});
test("English hint retains locale and explicit resume",async({page})=>{
  await mount(page,{locale:"en"});await expect(page.getByTestId("pending-unlock-banner").getByRole("link")).toHaveAttribute("href","/en/la-so/fixture-chart/chon-luan-giai?offer=ziwei-natal-excerpt&resume=1");
});
test("resume opens fresh confirmation without spending or creating payment",async({page})=>{
  const {state,errors}=await mount(page,{resume:true});await expect(page.locator("dialog[open]")).toHaveCount(1);
  await expect(page.getByTestId("inline-topup")).toBeVisible();expect(state.spends+state.orders).toBe(0);expect(state.intents).toBe(1);
  await page.keyboard.press("Escape");await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.evaluate(()=>window.dispatchEvent(new Event("fixture-state")));await expect(page.locator("dialog[open]")).toHaveCount(0);expect(errors).toEqual([]);
});
for(const kind of ["guest","owned","coming_soon","unavailable"])test(`resume never opens unavailable confirmation: ${kind}`,async({page})=>{
  const {state}=await mount(page,{resume:true,guest:kind==="guest",quote:kind==="guest"?undefined:kind});
  await expect(page.locator("dialog[open]")).toHaveCount(0);expect(state.intents+state.orders+state.spends).toBe(0);
  if(kind==="guest")expect(state.requests).toBe(0);
});
for(const changed of [{ownerId:"foreign"},{locale:"en"},{gapLa:239},{secret:"private"}])test(`ignores invalid hint ${JSON.stringify(changed)}`,async({page})=>{
  const {state}=await mount(page,{hint:{version:1,ownerId:"owner",intentId:"11111111-1111-4111-8111-111111111111",chartId:"chart",chartVersionId:"version",sku:"ZIWEI-NATAL-EXCERPT-P0",locale:"vi",priceLa:240,balanceLa:0,gapLa:240,...changed}});
  await expect.poll(()=>state.requests).toBe(1);await expect(page.getByTestId("pending-unlock-banner")).toHaveCount(0);
});
for(const change of ["signout","account","route"])test(`late hint cannot reappear after ${change}`,async({page})=>{
  const {state}=await mount(page,{hold:true});await expect.poll(()=>state.held.length).toBe(1);
  await page.evaluate(change=>{if(change==="signout")Object.assign(window,{__session:null});else if(change==="account")Object.assign(window,{__session:{user:{id:"other",emailVerified:true}}});else Object.assign(window,{__path:"/thanh-toan/order"});window.dispatchEvent(new Event("fixture-state"));},change);
  await state.held[0]!().catch(()=>{});await expect(page.getByTestId("pending-unlock-banner")).toHaveCount(0);
});
test("guest prompt describes 24h purge and qualified welcome grant",async({page})=>{
  await mount(page,{guest:true});const banner=page.locator(".guest-24h-deletion-banner");await expect(banner).toContainText("24 giờ");await expect(banner).toContainText("một lần 60 Lá");await expect(banner).not.toContainText(/vĩnh viễn|điều thứ hai/);
});

for(const path of ["/", "/en", "/la-so/fixture-chart", "/en/la-so/fixture-chart", "/nap-la", "/thanh-toan/order"])test(`price-free or payment surface suppresses recovery hint: ${path}`,async({page})=>{
  const {state}=await mount(page,{path});await expect(page.getByTestId("pending-unlock-banner")).toHaveCount(0);expect(state.requests).toBe(0);
});
for(const event of ["focus","lsv:wallet-changed"])test(`revalidation clears paid or invalidated hint on ${event}`,async({page})=>{
  const {state}=await mount(page);await expect(page.getByTestId("pending-unlock-banner")).toBeVisible();state.hint=null;
  await page.evaluate(event=>window.dispatchEvent(new Event(event)),event);
  await expect.poll(()=>state.requests).toBe(2);await expect(page.getByTestId("pending-unlock-banner")).toHaveCount(0);
});
test("dismissal is scoped to account and intent",async({page})=>{
  const {state}=await mount(page);await page.getByTestId("pending-unlock-banner").getByRole("button").click();
  state.hint={...state.hint!,intentId:"22222222-2222-4222-8222-222222222222"};
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));await expect(page.getByTestId("pending-unlock-banner")).toBeVisible();
});
