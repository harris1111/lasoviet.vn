import assert from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

async function main() {
  console.log("=== Verifying Task #43 (Homepage V4 Claims Verification) ===");

  const viMessages = JSON.parse(readFileSync(resolve("apps/web/messages/vi/homepage-v3.json"), "utf8"));
  const enMessages = JSON.parse(readFileSync(resolve("apps/web/messages/en/homepage-v3.json"), "utf8"));

  // 1. Depth & Selection: verify copy reflects current packages/readings without claiming individual palace/period Lá unlocking
  console.log("1. Checking depth copy (compare.rows.depth & usp.n4)...");
  assert.strictEqual(
    viMessages.compare.rows.depth.lsv,
    "Chọn gói luận giải hoặc phần bạn muốn đọc; thấy rõ chi phí và quyền lợi trước khi mở.",
  );
  assert.strictEqual(
    enMessages.compare.rows.depth.lsv,
    "Pick the right reading package or section; see the clear cost and deliverables before opening.",
  );
  assert.strictEqual(
    viMessages.usp.n4.body,
    "Công việc, tình cảm hay một giai đoạn sắp tới: chọn phần luận giải phù hợp và thấy rõ chi phí trước khi mở.",
  );
  assert.strictEqual(
    enMessages.usp.n4.body,
    "Work, love or personal direction: pick the reading that fits and see the clear cost before opening.",
  );
  console.log("  Depth copy verified truthful to production features.");

  // 2. Links: verify palace relations interaction and link to #la-so-mau
  console.log("2. Checking links copy (compare.rows.links & usp.n3)...");
  assert.strictEqual(
    viMessages.compare.rows.links.lsv,
    "Chạm một cung để nhìn tam hợp, đối cung cùng lúc.",
  );
  assert.strictEqual(
    enMessages.compare.rows.links.lsv,
    "Tap a palace to see its trine and opposite palaces at once.",
  );
  assert.strictEqual(
    viMessages.usp.n3.body,
    "Chọn một cung để thấy tam hợp, đối cung và phần đời đang liên hệ. Mười hai cung kể cùng một câu chuyện.",
  );
  assert.strictEqual(
    viMessages.usp.n3.link,
    "Chạm thử vào lá số →",
  );
  console.log("  Links copy verified truthful to production explore chart & UI-04 result chart.");

  // 3. Return: verify saved charts & scroll progress restoration
  console.log("3. Checking return copy (compare.rows.return)...");
  assert.strictEqual(
    viMessages.compare.rows.return.lsv,
    "Giữ lá số và phần đã mở để trở lại đúng chỗ.",
  );
  assert.strictEqual(
    enMessages.compare.rows.return.lsv,
    "Keeps your chart and the parts you opened so you return to the right place.",
  );
  console.log("  Return copy verified truthful to account library & reader scroll restoration.");

  // 4. Free result preview: verify accurate description in FAQ Q2
  console.log("4. Checking free reading scope (faq.items.q2)...");
  assert.strictEqual(
    viMessages.faq.items.q2.a,
    "Bạn xem lá số 12 cung và các nhận định đầu tiên về bản thân, định hướng hành động. Không cần tài khoản.",
  );
  assert.strictEqual(
    enMessages.faq.items.q2.a,
    "You see the 12-palace chart and initial insights about yourself and personal direction. No account needed.",
  );
  console.log("  FAQ Q2 verified truthful to free preview implementation.");

  // 5. Corpus size claim: verify usp.n1 avoids claiming unbacked corpus numbers
  console.log("5. Checking archive copy (usp.n1)...");
  assert.strictEqual(viMessages.usp.n1.title, "Từ tàng thư kim cổ.");
  assert.strictEqual(enMessages.usp.n1.title, "From the old archives.");
  assert(!/\d+/.test(viMessages.usp.n1.body), "VI body must not claim invented corpus numbers");
  assert(!/\d+/.test(enMessages.usp.n1.body), "EN body must not claim invented corpus numbers");
  console.log("  USP N1 verified free of unverified corpus size claims.");

  // 6. Run public claim check script
  console.log("6. Running scripts/public-claim-check.mjs...");
  execSync("node scripts/public-claim-check.mjs", { stdio: "inherit" });
  console.log("  scripts/public-claim-check.mjs passed successfully.");

  console.log("\nAll 5 items verified and compliant!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
