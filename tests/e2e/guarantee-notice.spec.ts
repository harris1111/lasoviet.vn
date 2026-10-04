import {expect, test} from "@playwright/test";
import {createRequire} from "node:module";
import {resolve} from "node:path";
const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const {build} = createRequire(require.resolve("vite"))("esbuild");
let bundle = "";
test.beforeAll(async () => {
  const result = await build({
    stdin: {resolveDir: resolve(root, "apps/web"), loader: "tsx", contents: `
      import {createRoot} from "react-dom/client";
      import {NextIntlClientProvider} from "next-intl";
      import {GuaranteeNoticeProvider} from "./src/features/reports/guarantee-notice-provider";
      import {useGuaranteeNotice} from "./src/features/reports/guarantee-notice-context";
      import vi from "./messages/vi/reports.json";
      function Controls() {
        const controller = useGuaranteeNotice();
        return <><button onClick={() => {window.approveFromA = controller.showApproved}}>Capture A request</button>
          <button onClick={() => controller.showApproved({chartId:"chart-b",amountLaRestored:240,relatedPalaceId:"ziwei.palace.travel"})}>Approve B</button>
          <button onClick={() => window.approveFromA({chartId:"chart-a",amountLaRestored:120,relatedPalaceId:"ziwei.palace.life"})}>Resolve delayed A</button></>;
      }
      createRoot(document.getElementById("fixture")).render(<NextIntlClientProvider locale="vi" timeZone="UTC" messages={{reports:vi}}><GuaranteeNoticeProvider locale="vi"><Controls/></GuaranteeNoticeProvider></NextIntlClientProvider>);
    `},
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    define: {"process.env.NODE_ENV": '"production"'},
    plugins: [{name: "isolated-session", setup(builder: any) {
      builder.onResolve({filter: /auth-client$/}, () => ({path: "session", namespace: "fixture"}));
      builder.onLoad({filter: /.*/, namespace: "fixture"}, () => ({loader: "js", resolveDir: resolve(root, "apps/web"), contents: `
        import {useSyncExternalStore} from "react";
        let current = {isPending:false,data:{user:{id:"account-a",emailVerified:true,isAnonymous:false}}};
        const subscribers = new Set();
        window.setNoticeSession = next => {current=next; for(const listener of subscribers) listener()};
        export const authClient = {useSession:()=>useSyncExternalStore(listener=>{subscribers.add(listener);return()=>subscribers.delete(listener)},()=>current)};
      `}));
      builder.onResolve({filter: /ziwei-tabs-state$/}, () => ({path: "palaces", namespace: "palace-fixture"}));
      builder.onLoad({filter: /.*/, namespace: "palace-fixture"}, () => ({contents: 'export const CANONICAL_TAB_PALACE_IDS = ["life","siblings","spouse","children","wealth","health","travel","friends","career","property","fortune","parents"];', loader: "js"}));
    }}],
  });
  bundle = result.outputFiles[0].text;
});
test("delayed previous-account response cannot erase the current refund result", async ({page}) => {
  await page.route("**/*", route => route.fulfill({contentType: "text/html", body: '<html><body><main id="fixture"></main></body></html>'}));
  await page.goto("https://notice.test/"); await page.addScriptTag({content: bundle});
  await page.getByRole("button", {name: "Capture A request"}).click();
  await page.evaluate(() => (window as any).setNoticeSession({isPending:false,data:{user:{id:"account-b",emailVerified:true,isAnonymous:false}}}));
  await page.getByRole("button", {name: "Approve B"}).click();
  const notice = page.getByTestId("guarantee-result-notice");
  await expect(notice).toContainText("Đã hoàn 240 Lá");
  await page.getByRole("button", {name: "Resolve delayed A"}).click();
  await expect(notice).toContainText("Đã hoàn 240 Lá");
  await expect(notice.getByRole("link")).toHaveAttribute("href", "/la-so/chart-b?tab=palaces&open=travel");
  await page.evaluate(() => (window as any).setNoticeSession({isPending:true,data:{user:{id:"account-b",emailVerified:true}}}));
  await expect(notice).toHaveCount(0);
  await page.evaluate(() => (window as any).setNoticeSession({isPending:false,data:{user:{id:"account-b",emailVerified:true}}}));
  await expect(notice).toContainText("Đã hoàn 240 Lá");
  await page.evaluate(() => (window as any).setNoticeSession({isPending:false,data:null}));
  await expect(notice).toHaveCount(0);
  await page.evaluate(() => (window as any).setNoticeSession({isPending:false,data:{user:{id:"account-b",emailVerified:true}}}));
  await expect(notice).toHaveCount(0);
  await page.getByRole("button", {name: "Approve B"}).click();
  await page.getByRole("button", {name: "Đóng thông báo"}).click(); await expect(notice).toHaveCount(0);
});
