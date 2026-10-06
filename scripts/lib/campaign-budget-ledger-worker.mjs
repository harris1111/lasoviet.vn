import { closeSync, constants, fstatSync, fsyncSync, openSync, readFileSync, readSync, writeSync, lstatSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { API_REFERENCE_PRICING, quoteNativeApiReference } from "./native-campaign-api-pricing.mjs";

// Invoked only beneath the parent's OS flock; direct invocation is unsupported.
let fd;
const fail = code => { throw Object.assign(new Error(code), { code }); };
const integer = value => Number.isSafeInteger(value) && value > 0;
const sha = value => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
const exactKeys = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const traceKeys = ["pricingVersion", "pricingSnapshotSha256", "requestedAlias", "wireModel", "requestId", "effectiveMaxOutputTokens", "requestSha256"];
const validTrace = trace => exactKeys(trace, traceKeys) && trace.pricingVersion === API_REFERENCE_PRICING.version && trace.pricingSnapshotSha256 === API_REFERENCE_PRICING.snapshotSha256 && trace.requestedAlias === "ag/gemini-3.8-flash" && trace.wireModel === "gemini-3.8-flash-medium" && /^agent\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/\d{13}\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/1$/.test(trace.requestId) && integer(trace.effectiveMaxOutputTokens) && trace.effectiveMaxOutputTokens >= 16_384 && trace.effectiveMaxOutputTokens <= 64_000 && sha(trace.requestSha256);
const receiptKeys = ["rawCountersComplete", "accountingStatus", "modelVersion", "inputTokens", "outputTokens", "cachedTokens", "reasoningTokens", "totalTokens"];
function validateSettlement(value, item, at) {
  if (!exactKeys(value, ["receipt", "outputSha256"]) || !sha(value.outputSha256) || !exactKeys(value.receipt, receiptKeys) || value.receipt.accountingStatus !== "unverified") fail("BUDGET_ATTEMPT_SETTLEMENT_INVALID");
  let quote;
  try { quote = quoteNativeApiReference(value.receipt, { at: new Date(at) }); } catch { fail("BUDGET_ATTEMPT_SETTLEMENT_INVALID"); }
  if (quote.pricingVersion !== item.trace.pricingVersion || quote.snapshotSha256 !== item.trace.pricingSnapshotSha256 || BigInt(quote.quoteVnd) > BigInt(item.vnd)) fail("BUDGET_ATTEMPT_SETTLEMENT_INVALID");
}
const uuid = value => typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
try {
  const request = JSON.parse(readFileSync(0, "utf8"));
  const { path, config, action, at } = request;
  const readDescriptor = (descriptor, maxSize = 8_000_000) => {
    const size = fstatSync(descriptor).size;
    if (size > maxSize) fail("BUDGET_LEDGER_CORRUPT");
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = readSync(descriptor, bytes, offset, size - offset, offset);
      if (!count) fail("BUDGET_LEDGER_CORRUPT");
      offset += count;
    }
    return bytes.toString("utf8");
  };
  const syncDirectory = () => {
    const directory = openSync(dirname(path), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    try { fsyncSync(directory); } finally { closeSync(directory); }
  };
  // The persistent OS lock file doubles as an initialization marker. Missing
  // or empty storage after initialization must never bootstrap zero exposure.
  const expectedMarker = JSON.stringify({ version: 2, ...config }) + "\n";
  const marker = readDescriptor(3, 10_000);
  let initialize = false;
  if (!marker) {
    try { lstatSync(path); fail("BUDGET_LEDGER_CORRUPT"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    const bytes = Buffer.from(expectedMarker);
    let written = 0;
    while (written < bytes.length) written += writeSync(3, bytes, written, bytes.length - written, written);
    fsyncSync(3); syncDirectory();
    initialize = true;
  } else if (marker !== expectedMarker) fail("BUDGET_LEDGER_CONFIG_MISMATCH");
  try {
    fd = openSync(path, constants.O_RDWR | constants.O_APPEND | constants.O_NOFOLLOW |
      (initialize ? constants.O_CREAT | constants.O_EXCL : 0), 0o600);
  } catch (error) {
    if (error.code === "ENOENT") fail("BUDGET_LEDGER_MISSING");
    throw error;
  }
  const stat = fstatSync(fd);
  if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o077)) fail("BUDGET_LEDGER_UNSAFE");
  const append = row => {
    const bytes = Buffer.from(JSON.stringify({ ...row, at }) + "\n");
    let offset = 0;
    while (offset < bytes.length) offset += writeSync(fd, bytes, offset, bytes.length - offset);
    fsyncSync(fd);
    syncDirectory();
  };
  const readJournal = () => readDescriptor(fd);
  let source = readJournal();
  if (!source && initialize) {
    append({ type: "config", version: 2, ...config });
    source = readJournal();
  }
  if (!source.endsWith("\n")) fail("BUDGET_LEDGER_CORRUPT");
  let rows;
  try { rows = source.slice(0, -1).split("\n").map(line => JSON.parse(line)); }
  catch { fail("BUDGET_LEDGER_CORRUPT"); }
  const first = rows.shift();
  if (first.type !== "config" || first.version !== 2 || first.totalCapVnd !== config.totalCapVnd || first.allocationVnd !== config.allocationVnd) {
    fail("BUDGET_LEDGER_CONFIG_MISMATCH");
  }
  const reservations = new Map();
  const attempts = new Set();
  let total = 0;
  for (const row of rows) {
    if (!row || !uuid(row.id) || typeof row.at !== "string" || !Number.isFinite(Date.parse(row.at))) fail("BUDGET_LEDGER_CORRUPT");
    if (["reserve", "reserve-attempt"].includes(row.type)) {
      if (reservations.has(row.id) || row.campaign !== "v4.2-report" || !integer(row.vnd) || !Number.isSafeInteger(total + row.vnd)) fail("BUDGET_LEDGER_CORRUPT");
      const keyed = row.type === "reserve-attempt";
      if (keyed && (!sha(row.attemptKey) || !validTrace(row.trace) || attempts.has(row.attemptKey) || [...reservations.values()].some(item => item.attemptKey && ["reserved", "dispatched"].includes(item.state)))) fail("BUDGET_LEDGER_CORRUPT");
      if (keyed) attempts.add(row.attemptKey);
      reservations.set(row.id, { vnd: row.vnd, state: "reserved", ...(keyed ? { attemptKey: row.attemptKey, trace: row.trace } : {}) }); total += row.vnd;
    } else {
      const item = reservations.get(row.id);
      if (!item || !["dispatch", "release", "settle", "settle-attempt"].includes(row.type)) fail("BUDGET_LEDGER_CORRUPT");
      if (row.type === "dispatch" && item.state === "reserved") item.state = "dispatched";
      else if (row.type === "release" && item.state === "reserved") { item.state = "released"; total -= item.vnd; }
      else if (row.type === "settle" && item.state === "dispatched" && !item.attemptKey) item.state = "settled";
      else if (row.type === "settle-attempt" && item.state === "dispatched" && item.attemptKey) {
        validateSettlement(row.settlement, item, row.at); item.state = "settled";
      }
      else fail("BUDGET_LEDGER_CORRUPT");
    }
    if (total > config.totalCapVnd || total > config.allocationVnd) fail("BUDGET_LEDGER_CORRUPT");
  }
  let value;
  if (action === "status") {
    value = { totalVnd: total, byCampaign: { "v4.2-report": total }, openReservations: [...reservations.values()].filter(r => ["reserved", "dispatched"].includes(r.state)).length, capVnd: config.totalCapVnd };
  } else if (["reserve", "reserve-attempt"].includes(action)) {
    if (request.campaign !== "v4.2-report") fail("BUDGET_CAMPAIGN_DEFERRED");
    if (!integer(request.vnd) || !Number.isSafeInteger(total + request.vnd)) fail("BUDGET_RESERVATION_INVALID");
    const keyed = action === "reserve-attempt";
    if (keyed && (!sha(request.attemptKey) || !validTrace(request.trace))) fail("BUDGET_ATTEMPT_INVALID");
    if (keyed && attempts.has(request.attemptKey)) fail("BUDGET_ATTEMPT_ALREADY_CLAIMED");
    if (keyed && [...reservations.values()].some(item => item.attemptKey && ["reserved", "dispatched"].includes(item.state))) fail("BUDGET_ATTEMPT_UNRESOLVED");
    if (total + request.vnd > config.totalCapVnd) fail("BUDGET_TOTAL_CAP_REACHED");
    if (total + request.vnd > config.allocationVnd) fail("BUDGET_CAMPAIGN_CAP_REACHED");
    value = randomUUID(); append({ type: keyed ? "reserve-attempt" : "reserve", id: value, campaign: request.campaign, vnd: request.vnd, ...(keyed ? { attemptKey: request.attemptKey, trace: request.trace } : {}) });
  } else {
    const item = reservations.get(request.id);
    if (!uuid(request.id) || !item) fail("BUDGET_RESERVATION_UNKNOWN");
    if (action === "dispatch" && item.state === "reserved") append({ type: "dispatch", id: request.id });
    else if (action === "release" && item.state === "reserved") append({ type: "release", id: request.id });
    else if (action === "settle" && item.state === "dispatched" && !item.attemptKey) append({ type: "settle", id: request.id });
    else if (action === "settle-attempt" && item.state === "dispatched" && item.attemptKey) {
      validateSettlement(request.settlement, item, at); append({ type: "settle-attempt", id: request.id, settlement: request.settlement });
    }
    else fail("BUDGET_TRANSITION_INVALID");
    value = true;
  }
  console.log(JSON.stringify({ value }));
} catch (error) {
  console.log(JSON.stringify({ error: typeof error.code === "string" && error.code.startsWith("BUDGET_") ? error.code : "BUDGET_LEDGER_CORRUPT" }));
} finally { if (fd !== undefined) closeSync(fd); }
