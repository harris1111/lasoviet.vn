import { closeSync, constants, fstatSync, fsyncSync, openSync, readFileSync, readSync, writeSync, lstatSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";

// Invoked only beneath the parent's OS flock; direct invocation is unsupported.
let fd;
const fail = code => { throw Object.assign(new Error(code), { code }); };
const integer = value => Number.isSafeInteger(value) && value > 0;
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
  let total = 0;
  for (const row of rows) {
    if (!row || !uuid(row.id) || typeof row.at !== "string" || !Number.isFinite(Date.parse(row.at))) fail("BUDGET_LEDGER_CORRUPT");
    if (row.type === "reserve") {
      if (reservations.has(row.id) || row.campaign !== "v4.2-report" || !integer(row.vnd) || !Number.isSafeInteger(total + row.vnd)) fail("BUDGET_LEDGER_CORRUPT");
      reservations.set(row.id, { vnd: row.vnd, state: "reserved" }); total += row.vnd;
    } else {
      const item = reservations.get(row.id);
      if (!item || !["dispatch", "release", "settle"].includes(row.type)) fail("BUDGET_LEDGER_CORRUPT");
      if (row.type === "dispatch" && item.state === "reserved") item.state = "dispatched";
      else if (row.type === "release" && item.state === "reserved") { item.state = "released"; total -= item.vnd; }
      else if (row.type === "settle" && item.state === "dispatched") item.state = "settled";
      else fail("BUDGET_LEDGER_CORRUPT");
    }
    if (total > config.totalCapVnd || total > config.allocationVnd) fail("BUDGET_LEDGER_CORRUPT");
  }
  let value;
  if (action === "status") {
    value = { totalVnd: total, byCampaign: { "v4.2-report": total }, openReservations: [...reservations.values()].filter(r => ["reserved", "dispatched"].includes(r.state)).length, capVnd: config.totalCapVnd };
  } else if (action === "reserve") {
    if (request.campaign !== "v4.2-report") fail("BUDGET_CAMPAIGN_DEFERRED");
    if (!integer(request.vnd) || !Number.isSafeInteger(total + request.vnd)) fail("BUDGET_RESERVATION_INVALID");
    if (total + request.vnd > config.totalCapVnd) fail("BUDGET_TOTAL_CAP_REACHED");
    if (total + request.vnd > config.allocationVnd) fail("BUDGET_CAMPAIGN_CAP_REACHED");
    value = randomUUID(); append({ type: "reserve", id: value, campaign: request.campaign, vnd: request.vnd });
  } else {
    const item = reservations.get(request.id);
    if (!uuid(request.id) || !item) fail("BUDGET_RESERVATION_UNKNOWN");
    if (action === "dispatch" && item.state === "reserved") append({ type: "dispatch", id: request.id });
    else if (action === "release" && item.state === "reserved") append({ type: "release", id: request.id });
    else if (action === "settle" && item.state === "dispatched") append({ type: "settle", id: request.id });
    else fail("BUDGET_TRANSITION_INVALID");
    value = true;
  }
  console.log(JSON.stringify({ value }));
} catch (error) {
  console.log(JSON.stringify({ error: typeof error.code === "string" && error.code.startsWith("BUDGET_") ? error.code : "BUDGET_LEDGER_CORRUPT" }));
} finally { if (fd !== undefined) closeSync(fd); }
