import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
assert.equal(process.env.LSV_ACCEPTANCE_FIXTURE, "true");
assert.equal(new URL(process.env.DATABASE_URL).hostname, "lsv5863-qa-db");
assert.equal(process.env.SEPAY_ENV, "disabled");
assert.equal(process.env.FREE_PALACE_GENERATION_ENABLED, "false");
const ActualDate = globalThis.Date;
function now() {
  const {now} = JSON.parse(readFileSync("/qa/clock.json", "utf8"));
  assert(/^(?:2026-10-(10|11)T23:[0-5][0-9]:[0-5][0-9]|2027-02-06T12:[0-5][0-9]:[0-5][0-9]|2028-02-01T12:[0-5][0-9]:[0-5][0-9])\.000Z$/.test(now), "CLOSED_QA_CLOCK_REQUIRED");
  return ActualDate.parse(now);
}
// Next's date instrumentation copies own static methods; preserve native shape.
const FixtureDate = function Date(...args) {
  if (!new.target) return new ActualDate(now()).toString();
  return Reflect.construct(ActualDate, args.length ? args : [now()], new.target === FixtureDate ? ActualDate : new.target);
};
FixtureDate.prototype = ActualDate.prototype;
for (const [key, value] of Object.entries({parse: ActualDate.parse, UTC: ActualDate.UTC, now})) {
  Object.defineProperty(FixtureDate, key, {value, configurable: true, writable: true});
}
globalThis.Date = FixtureDate;
