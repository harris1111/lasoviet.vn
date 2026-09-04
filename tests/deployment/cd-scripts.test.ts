import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "../..");
const bashExecutable =
  process.platform === "win32" && existsSync("C:\\Program Files\\Git\\bin\\bash.exe")
    ? "C:\\Program Files\\Git\\bin\\bash.exe"
    : "bash";

const VALID_SHA_CURRENT = "1111111111111111111111111111111111111111";
const VALID_SHA_PREVIOUS = "0000000000000000000000000000000000000000";
const VALID_SHA_CANDIDATE = "2222222222222222222222222222222222222222";

interface TestContext {
  tempDir: string;
  deployEnvPath: string;
  stateDir: string;
  logDir: string;
  backupDir: string;
  fakeBinDir: string;
  commandsLog: string;
  projectDir: string;
}

function toPosixPath(inputPath: string): string {
  return inputPath.replace(/\\/g, "/");
}

function createFakeCommands(context: TestContext) {
  const { fakeBinDir, commandsLog } = context;
  const posixLog = toPosixPath(commandsLog);

  // Fake date
  const dateScript = `#!/bin/sh
if [ "\${1:-}" = "-u" ]; then
  if [ "\${2:-}" = "+%Y%m%dT%H%M%SZ" ]; then
    echo "20260904T023000Z"
    exit 0
  fi
  if [ "\${2:-}" = "+%Y-%m-%dT%H:%M:%SZ" ]; then
    echo "2026-09-04T02:30:00Z"
    exit 0
  fi
fi
/usr/bin/date "$@"
`;
  writeFileSync(path.join(fakeBinDir, "date"), dateScript, { mode: 0o755 });

  // Fake sha256sum
  const sha256Script = `#!/bin/sh
echo "SHA256: $@" >> "${posixLog}"
echo "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef  $1"
`;
  writeFileSync(path.join(fakeBinDir, "sha256sum"), sha256Script, { mode: 0o755 });

  // Fake chmod
  const chmodScript = `#!/bin/sh
if [ "\${SIMULATE_CHMOD_FAIL:-0}" = "1" ]; then
  echo "chmod: changing permissions of file: Permission denied" >&2
  exit 1
fi
/usr/bin/chmod "$@"
`;
  writeFileSync(path.join(fakeBinDir, "chmod"), chmodScript, { mode: 0o755 });

  // Fake docker
  const dockerScript = `#!/bin/sh
echo "DOCKER [RELEASE=\${LASOVIET_RELEASE_SHA:-}]: $@" >> "${posixLog}"

if [ "$1" = "pull" ]; then
  if [ "\${SIMULATE_MARKER_PULL_NOT_FOUND:-0}" = "1" ]; then
    echo "Error response from daemon: manifest unknown" >&2
    exit 1
  fi
  if [ "\${SIMULATE_MARKER_PULL_FAIL:-0}" = "1" ]; then
    echo "network timeout communicating with registry" >&2
    exit 1
  fi
  if [ "\${SIMULATE_IMAGE_PULL_FAIL:-0}" = "1" ]; then
    echo "failed to pull application image" >&2
    exit 1
  fi
  exit 0
fi

if [ "$1" = "inspect" ]; then
  if [ "\${SIMULATE_MARKER_MALFORMED:-0}" = "1" ]; then
    echo "INVALID_REVISION_SHA"
    exit 0
  fi
  if [ -n "\${SIMULATE_MARKER_SHA:-}" ]; then
    echo "\${SIMULATE_MARKER_SHA}"
    exit 0
  fi
  echo "${VALID_SHA_CANDIDATE}"
  exit 0
fi

if [ "$1" = "compose" ]; then
  shift
  while [ $# -gt 0 ]; do
    case "$1" in
      --env-file|-f)
        shift 2
        ;;
      pull)
        if [ "\${SIMULATE_IMAGE_PULL_FAIL:-0}" = "1" ]; then
          echo "failed image pull" >&2
          exit 1
        fi
        exit 0
        ;;
      run)
        if [ "\${SIMULATE_MIGRATE_FAIL:-0}" = "1" ]; then
          echo "CRITICAL_SECRET_DATABASE_URL=postgres://user:SUPER_SECRET_PASSWORD_123@db migration failed" >&2
          exit 1
        fi
        exit 0
        ;;
      up)
        shift
        # Check if api+worker replacement
        if [ "$*" = "-d --no-build api worker" ] || [ "$*" = "--no-build -d api worker" ]; then
          if [ "\${SIMULATE_APP_UP_FAIL:-0}" = "1" ]; then
            echo "failed to start api worker containers" >&2
            exit 1
          fi
        fi
        exit 0
        ;;
      exec)
        shift
        while [ "\${1#-}" != "$1" ]; do
          shift
        done
        service="$1"
        shift
        # Check if preflight checks
        if [ "\${SIMULATE_PREFLIGHT_FAIL:-0}" = "1" ]; then
          exit 1
        fi
        # If postgres dump streaming
        if [ "$service" = "postgres" ] && ( [ "$1" = "sh" ] || [ "$1" = "bash" ] ); then
          if [ "\${SIMULATE_BACKUP_FAIL:-0}" = "1" ]; then
            echo "pg_dump failed" >&2
            exit 1
          fi
          printf 'PGDMP\\x01\\x02fake-custom-dump-content'
          exit 0
        fi
        # Redis ping check
        if [ "$service" = "redis" ]; then
          if [ "\${SIMULATE_REDIS_FAIL:-0}" = "1" ]; then
            exit 1
          fi
          echo "PONG"
          exit 0
        fi
        # Worker probe
        if [ "$service" = "worker" ]; then
          if [ "\${SIMULATE_WORKER_FAIL:-0}" = "1" ]; then
            echo "worker probe failed" >&2
            exit 1
          fi
          exit 0
        fi
        # Readiness health fail (only for post-replacement health checks)
        if [ "\${SIMULATE_HEALTH_FAIL:-0}" = "1" ]; then
          # Post-replacement health checks test worker node CLI
          if [ "$service" = "worker" ] && [ "$1" = "node" ]; then
            echo "sensitive error payload PAYLOAD_BODY_PRIVATE for $service" >&2
            exit 1
          fi
        fi
        exit 0
        ;;
      *)
        shift
        ;;
    esac
  done
  exit 0
fi

exit 0
`;
  writeFileSync(path.join(fakeBinDir, "docker"), dockerScript, { mode: 0o755 });

  // Fake curl
  const curlScript = `#!/bin/sh
echo "CURL: $@" >> "${posixLog}"
# Check timeout arguments
echo "$@" | grep -q -- "--connect-timeout 5" || { echo "ERROR: missing connect-timeout 5" >&2; exit 2; }
echo "$@" | grep -q -- "--max-time 10" || { echo "ERROR: missing max-time 10" >&2; exit 2; }

if [ "\${SIMULATE_CURL_FAIL:-0}" = "1" ]; then
  echo "curl: (7) Failed to connect with SECRET_KEY_LEAK=leak123" >&2
  exit 1
fi
echo '{"status":"ok"}'
exit 0
`;
  writeFileSync(path.join(fakeBinDir, "curl"), curlScript, { mode: 0o755 });

  // Fake flock
  const flockScript = `#!/bin/sh
echo "FLOCK: $@" >> "${posixLog}"
if [ "\${SIMULATE_LOCK_BUSY:-0}" = "1" ]; then
  exit 1
fi
exit 0
`;
  writeFileSync(path.join(fakeBinDir, "flock"), flockScript, { mode: 0o755 });

  // Fake df
  const dfScript = `#!/bin/sh
if [ "\${SIMULATE_DF_UNPARSEABLE:-0}" = "1" ]; then
  echo "GARBAGE HEADER"
  echo "UNPARSEABLE ROW"
  exit 0
fi
if [ "\${SIMULATE_DISK_FULL:-0}" = "1" ]; then
  echo "Filesystem 1024-blocks Used Available Capacity Mounted on"
  echo "/dev/root 10000000 9900000 100000 99% /"
else
  echo "Filesystem 1024-blocks Used Available Capacity Mounted on"
  echo "/dev/root 10000000 1000000 9000000 10% /"
fi
exit 0
`;
  writeFileSync(path.join(fakeBinDir, "df"), dfScript, { mode: 0o755 });

  // Fake sleep
  const sleepScript = `#!/bin/sh
exit 0
`;
  writeFileSync(path.join(fakeBinDir, "sleep"), sleepScript, { mode: 0o755 });
}

function setupContext(): TestContext {
  const tempDir = path.join(os.tmpdir(), `cd-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const stateDir = path.join(tempDir, "data", "state");
  const logDir = path.join(tempDir, "data", "logs");
  const backupDir = path.join(tempDir, "data with spaces", "backups");
  const fakeBinDir = path.join(tempDir, "bin");
  const projectDir = path.join(tempDir, "project");
  const commandsLog = path.join(tempDir, "commands.log");
  const deployEnvPath = path.join(tempDir, "deploy.env");

  mkdirSync(stateDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });
  mkdirSync(backupDir, { recursive: true });
  mkdirSync(fakeBinDir, { recursive: true });
  mkdirSync(projectDir, { recursive: true });

  writeFileSync(commandsLog, "", { mode: 0o600 });

  writeFileSync(path.join(projectDir, "docker-compose.yml"), "services: {}\n");
  writeFileSync(path.join(projectDir, "docker-compose.production.yml"), "services: {}\n");
  writeFileSync(path.join(projectDir, "docker-compose.registry.yml"), "services: {}\n");
  writeFileSync(path.join(projectDir, ".lasoviet-mvp.env"), "FOO=bar\n");

  const deployEnvContent = [
    `PROJECT_DIR="${toPosixPath(projectDir)}"`,
    `DEPLOY_ENV_FILE="${toPosixPath(path.join(projectDir, ".lasoviet-mvp.env"))}"`,
    `DATA_DIR="${toPosixPath(path.join(tempDir, "data"))}"`,
    `STATE_DIR="${toPosixPath(stateDir)}"`,
    `LOG_DIR="${toPosixPath(logDir)}"`,
    `BACKUP_DIR="${toPosixPath(backupDir)}"`,
    "LOOPBACK_READY_URL=http://127.0.0.1:63423/health/ready",
    "PUBLIC_READY_URL=https://lasoviet.vn/health/ready",
    "MIN_FREE_KB=2097152",
    "DEPLOY_TEST_TIMEOUT=5",
    "DEPLOY_TEST_INTERVAL=1",
  ].join("\n") + "\n";

  writeFileSync(deployEnvPath, deployEnvContent, { mode: 0o600 });

  const context: TestContext = {
    tempDir,
    deployEnvPath,
    stateDir,
    logDir,
    backupDir,
    fakeBinDir,
    commandsLog,
    projectDir,
  };

  createFakeCommands(context);
  return context;
}

function teardownContext(context: TestContext) {
  if (existsSync(context.tempDir)) {
    rmSync(context.tempDir, { recursive: true, force: true });
  }
}

function writeState(
  context: TestContext,
  state: Partial<{
    CURRENT_RELEASE_SHA: string;
    PREVIOUS_RELEASE_SHA: string;
    LAST_ATTEMPTED_RELEASE_SHA: string;
    LAST_SUCCESSFUL_DEPLOYMENT_AT: string;
    LAST_FAILURE_CODE: string;
    LAST_FAILURE_AT: string;
  }>,
) {
  const lines = [
    `CURRENT_RELEASE_SHA="${state.CURRENT_RELEASE_SHA || ""}"`,
    `PREVIOUS_RELEASE_SHA="${state.PREVIOUS_RELEASE_SHA || ""}"`,
    `LAST_ATTEMPTED_RELEASE_SHA="${state.LAST_ATTEMPTED_RELEASE_SHA || ""}"`,
    `LAST_SUCCESSFUL_DEPLOYMENT_AT="${state.LAST_SUCCESSFUL_DEPLOYMENT_AT || ""}"`,
    `LAST_FAILURE_CODE="${state.LAST_FAILURE_CODE || ""}"`,
    `LAST_FAILURE_AT="${state.LAST_FAILURE_AT || ""}"`,
  ];
  const stateFile = path.join(context.stateDir, "release-state.env");
  writeFileSync(stateFile, lines.join("\n") + "\n", { mode: 0o600 });
}

function readState(context: TestContext): Record<string, string> {
  const stateFile = path.join(context.stateDir, "release-state.env");
  if (!existsSync(stateFile)) return {};
  const content = readFileSync(stateFile, "utf8");
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (match) {
      result[match[1]] = match[2];
    }
  }
  return result;
}

function runScript(
  context: TestContext,
  scriptName: string,
  args: string[] = [],
  customEnv: Record<string, string> = {},
): { status: number; stdout: string; stderr: string } {
  const scriptPath = toPosixPath(path.join(projectRoot, "scripts", "deployment", scriptName));
  const env = {
    ...process.env,
    PATH: `${toPosixPath(context.fakeBinDir)}${path.delimiter}${process.env.PATH}`,
    LASOVIET_DEPLOY_CONFIG: toPosixPath(context.deployEnvPath),
    LASOVIET_TEST_BIN: toPosixPath(context.fakeBinDir),
    ...customEnv,
  };

  try {
    const stdout = execFileSync(bashExecutable, [scriptPath, ...args], {
      env,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error: unknown) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: e.status ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
    };
  }
}

describe("deployment shell contracts", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupContext();
  });

  afterEach(() => {
    teardownContext(ctx);
  });

  it("accepts only a forty-character lowercase release SHA", () => {
    const invalidShas = [
      "short",
      "12345",
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "111111111111111111111111111111111111111G",
      "../../../etc/passwd",
    ];

    for (const invalid of invalidShas) {
      const resDeploy = runScript(ctx, "deploy-release.sh", [invalid]);
      expect(resDeploy.status).not.toBe(0);

      const resRollback = runScript(ctx, "rollback-release.sh", [invalid]);
      expect(resRollback.status).not.toBe(0);

      const resBackup = runScript(ctx, "backup-postgres.sh", ["pre-deploy", invalid]);
      expect(resBackup.status).not.toBe(0);
    }
  });

  it("serializes poll execution with non-blocking flock covering entire execution", () => {
    // 1. When flock is busy, poll-release exits 0 quietly
    const res = runScript(ctx, "poll-release.sh", [], {
      SIMULATE_LOCK_BUSY: "1",
    });

    expect(res.status).toBe(0);
    const commands = readFileSync(ctx.commandsLog, "utf8");
    expect(commands).toContain("FLOCK: -n 9");
    expect(commands).not.toContain("DOCKER: pull ghcr.io/harris1111/lasoviet-release:production");
  });

  it("does not deploy for a missing, malformed, or unchanged marker", () => {
    const resMissing = runScript(ctx, "poll-release.sh", [], {
      SIMULATE_MARKER_PULL_NOT_FOUND: "1",
    });
    expect(resMissing.status).toBe(0);
    expect(readFileSync(ctx.commandsLog, "utf8")).not.toContain("deploy-release.sh");

    const resMalformed = runScript(ctx, "poll-release.sh", [], {
      SIMULATE_MARKER_MALFORMED: "1",
    });
    expect(resMalformed.status).not.toBe(0);

    writeState(ctx, { CURRENT_RELEASE_SHA: VALID_SHA_CURRENT });
    const resUnchanged = runScript(ctx, "poll-release.sh", [], {
      SIMULATE_MARKER_SHA: VALID_SHA_CURRENT,
    });
    expect(resUnchanged.status).toBe(0);
    const commands = readFileSync(ctx.commandsLog, "utf8");
    expect(commands).not.toContain("deploy-release.sh");
  });

  it("executes deployment in strict contract order and exports one SHA for all release operations", () => {
    writeState(ctx, {
      CURRENT_RELEASE_SHA: VALID_SHA_CURRENT,
      PREVIOUS_RELEASE_SHA: VALID_SHA_PREVIOUS,
    });

    const res = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE]); console.log("DEPLOY RES:", res.status, "STDOUT:", res.stdout, "STDERR:", res.stderr);
    expect(res.status).toBe(0);

    const commands = readFileSync(ctx.commandsLog, "utf8");
    // Verify exact ordering of operations:
    // 1. Preflight service health (postgres, redis, api, web, worker running)
    const idxPreflight = commands.indexOf("exec -T postgres");
    // 2. Pre-deploy backup
    const idxBackup = commands.indexOf("SHA256:");
    // 3. Pull images
    const idxPull = commands.indexOf("pull migrate api worker web");
    // 4. Migration run
    const idxMigrate = commands.indexOf("run --rm migrate");
    // 5. Replace api+worker
    const idxAppUp = commands.indexOf("up -d --no-build api worker");
    // 6. Replace web
    const idxWebUp = commands.indexOf("up -d --no-build web");
    // 7. Post-replacement readiness checks
    const idxHealth = commands.indexOf("worker node dist/health/worker-health-cli.js");

    expect(idxPreflight).toBeGreaterThanOrEqual(0);
    expect(idxBackup).toBeGreaterThan(idxPreflight);
    expect(idxPull).toBeGreaterThan(idxBackup);
    expect(idxMigrate).toBeGreaterThan(idxPull);
    expect(idxAppUp).toBeGreaterThan(idxMigrate);
    expect(idxWebUp).toBeGreaterThan(idxAppUp);
    expect(idxHealth).toBeGreaterThan(idxWebUp);

    // Verify all Compose calls export candidate release SHA
    expect(commands).toContain(`DOCKER [RELEASE=${VALID_SHA_CANDIDATE}]: compose`);

    const state = readState(ctx);
    expect(state.CURRENT_RELEASE_SHA).toBe(VALID_SHA_CANDIDATE);
    expect(state.PREVIOUS_RELEASE_SHA).toBe(VALID_SHA_CURRENT);
    expect(state.LAST_ATTEMPTED_RELEASE_SHA).toBe(VALID_SHA_CANDIDATE);
    expect(state.LAST_SUCCESSFUL_DEPLOYMENT_AT).toBe("2026-09-04T02:30:00Z");
    expect(state.LAST_FAILURE_CODE).toBe("");
  });

  it("fails deploy during preflight when df output is unparseable or disk full", () => {
    writeState(ctx, { CURRENT_RELEASE_SHA: VALID_SHA_CURRENT });

    // Unparseable df
    const resUnparseable = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE], {
      SIMULATE_DF_UNPARSEABLE: "1",
    });
    expect(resUnparseable.status).not.toBe(0);
    let state = readState(ctx);
    expect(state.CURRENT_RELEASE_SHA).toBe(VALID_SHA_CURRENT);
    expect(state.LAST_FAILURE_CODE).toBe("DISK_SPACE_INVALID");

    // Full disk
    const resFull = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE], {
      SIMULATE_DISK_FULL: "1",
    });
    expect(resFull.status).not.toBe(0);
    state = readState(ctx);
    expect(state.LAST_FAILURE_CODE).toBe("DISK_SPACE_INSUFFICIENT");
  });

  it("fails before migration when the pre-deploy backup fails", () => {
    writeState(ctx, { CURRENT_RELEASE_SHA: VALID_SHA_CURRENT });

    const res = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE], {
      SIMULATE_BACKUP_FAIL: "1",
    });

    expect(res.status).not.toBe(0);
    const commands = readFileSync(ctx.commandsLog, "utf8");
    expect(commands).not.toContain("migrate");
    expect(commands).not.toContain("pull migrate api worker web");

    const state = readState(ctx);
    expect(state.CURRENT_RELEASE_SHA).toBe(VALID_SHA_CURRENT);
    expect(state.LAST_ATTEMPTED_RELEASE_SHA).toBe(VALID_SHA_CANDIDATE);
    expect(state.LAST_FAILURE_CODE).toBe("BACKUP_FAILED");
  });

  it("does not promote state when migration or readiness fails", () => {
    writeState(ctx, { CURRENT_RELEASE_SHA: VALID_SHA_CURRENT });

    const resMigrate = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE], {
      SIMULATE_MIGRATE_FAIL: "1",
    });
    expect(resMigrate.status).not.toBe(0);
    let state = readState(ctx);
    expect(state.CURRENT_RELEASE_SHA).toBe(VALID_SHA_CURRENT);
    expect(state.LAST_FAILURE_CODE).toBe("MIGRATION_FAILED");

    writeState(ctx, { CURRENT_RELEASE_SHA: "" });
    const resHealth = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE], {
      SIMULATE_HEALTH_FAIL: "1",
    });
    expect(resHealth.status).not.toBe(0);
    state = readState(ctx);
    expect(state.CURRENT_RELEASE_SHA).toBe("");
    expect(state.LAST_FAILURE_CODE).toBe("HEALTH_CHECK_FAILED");
  });

  it("triggers prior-SHA rollback on failed api/worker replacement or post-replacement health", { timeout: 15000 }, () => {
    writeState(ctx, {
      CURRENT_RELEASE_SHA: VALID_SHA_CURRENT,
      PREVIOUS_RELEASE_SHA: VALID_SHA_PREVIOUS,
    });

    // Case 1: Partial api/worker up failure
    const resAppUp = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE], {
      SIMULATE_APP_UP_FAIL: "1",
    });
    expect(resAppUp.status).not.toBe(0);
    let commands = readFileSync(ctx.commandsLog, "utf8");
    // Rollback invoked with previous current SHA
    expect(commands).toContain(`DOCKER [RELEASE=${VALID_SHA_CURRENT}]: compose`);
    let state = readState(ctx);
    expect(state.CURRENT_RELEASE_SHA).toBe(VALID_SHA_CURRENT);
    expect(state.LAST_ATTEMPTED_RELEASE_SHA).toBe(VALID_SHA_CANDIDATE);
    // Preserves original failure code
    expect(state.LAST_FAILURE_CODE).toBe("APP_UP_FAILED");

    // Case 2: Post-replacement health failure
    const resHealth = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE], {
      SIMULATE_HEALTH_FAIL: "1",
    });
    expect(resHealth.status).not.toBe(0);
    state = readState(ctx);
    expect(state.CURRENT_RELEASE_SHA).toBe(VALID_SHA_CURRENT);
    expect(state.LAST_ATTEMPTED_RELEASE_SHA).toBe(VALID_SHA_CANDIDATE);
    expect(state.LAST_FAILURE_CODE).toBe("HEALTH_CHECK_FAILED");
  });

  it("swaps rollback state exactly and never invokes database downgrade or restore", () => {
    writeState(ctx, {
      CURRENT_RELEASE_SHA: VALID_SHA_CURRENT,
      PREVIOUS_RELEASE_SHA: VALID_SHA_PREVIOUS,
      LAST_ATTEMPTED_RELEASE_SHA: VALID_SHA_CANDIDATE,
    });

    // Rollback to PREVIOUS: target equals previous -> CURRENT=target, PREVIOUS=old current
    const res = runScript(ctx, "rollback-release.sh", [VALID_SHA_PREVIOUS]);
    expect(res.status).toBe(0);

    const commands = readFileSync(ctx.commandsLog, "utf8");
    expect(commands).not.toContain("migrate");
    expect(commands).not.toContain("pg_restore");
    expect(commands).not.toContain("backup-postgres.sh");

    const state = readState(ctx);
    expect(state.CURRENT_RELEASE_SHA).toBe(VALID_SHA_PREVIOUS);
    expect(state.PREVIOUS_RELEASE_SHA).toBe(VALID_SHA_CURRENT);
    expect(state.LAST_ATTEMPTED_RELEASE_SHA).toBe(VALID_SHA_CANDIDATE);
    expect(state.LAST_SUCCESSFUL_DEPLOYMENT_AT).toBe("2026-09-04T02:30:00Z");
    expect(state.LAST_FAILURE_CODE).toBe("");
  });

  it("retains seven daily and ten pre-deploy archives only and ignores lookalikes/orphans", () => {
    // Create 9 daily dump pairs
    for (let i = 1; i <= 8; i++) {
      const day = i.toString().padStart(2, "0");
      const name = `daily-202609${day}T023000Z.dump`;
      writeFileSync(path.join(ctx.backupDir, name), "dummy-dump", { mode: 0o600 });
      writeFileSync(path.join(ctx.backupDir, `${name}.sha256`), "dummy-sha", { mode: 0o600 });
    }

    // Create 12 pre-deploy pairs
    for (let i = 1; i <= 12; i++) {
      const day = i.toString().padStart(2, "0");
      const name = `pre-deploy-${VALID_SHA_CURRENT}-202609${day}T023000Z.dump`;
      writeFileSync(path.join(ctx.backupDir, name), "dummy-dump", { mode: 0o600 });
      writeFileSync(path.join(ctx.backupDir, `${name}.sha256`), "dummy-sha", { mode: 0o600 });
    }

    // Create orphan dump and orphan sha256 (must be ignored and preserved, not counted)
    writeFileSync(path.join(ctx.backupDir, "daily-20260999-orphan.dump"), "orphan-dump", { mode: 0o600 });
    writeFileSync(path.join(ctx.backupDir, "daily-20260988T023000Z.dump.sha256"), "orphan-sha", { mode: 0o600 });

    // Create lookalike files
    writeFileSync(path.join(ctx.backupDir, "daily-lookalike-20260901T023000Z.dump"), "lookalike", { mode: 0o600 });
    writeFileSync(path.join(ctx.backupDir, "daily-lookalike-20260901T023000Z.dump.sha256"), "lookalike", { mode: 0o600 });

    const res = runScript(ctx, "backup-postgres.sh", ["daily"]); 
    expect(res.status).toBe(0);

    const files = readdirSync(ctx.backupDir); 
    // Strict valid daily dump pairs: 7 (newest created + 6 retained from 9)
    const dailyDumps = files.filter((f) => /^daily-[0-9]{8}T[0-9]{6}Z\.dump$/.test(f));
    const predeployDumps = files.filter((f) => new RegExp(`^pre-deploy-${VALID_SHA_CURRENT}-[0-9]{8}T[0-9]{6}Z\\.dump$`).test(f));

    expect(dailyDumps.length).toBe(7);
    expect(predeployDumps.length).toBe(10);

    // Lookalike and orphans preserved
    expect(files).toContain("daily-20260999-orphan.dump");
    expect(files).toContain("daily-20260988T023000Z.dump.sha256");
    expect(files).toContain("daily-lookalike-20260901T023000Z.dump");
  });

  it("preserves unknown and failed backup files and fails if chmod fails", () => {
    const preserveFiles = [
      "custom-manual-backup.dump",
      "pre-deploy-failed.dump.failed",
      "daily-20260901T023000Z.dump.failed",
      "operator-notes.txt",
    ];

    for (const f of preserveFiles) {
      writeFileSync(path.join(ctx.backupDir, f), "precious-content", { mode: 0o600 });
    }

    const res = runScript(ctx, "backup-postgres.sh", ["daily"]); 
    expect(res.status).toBe(0);

    const filesAfter = readdirSync(ctx.backupDir);
    for (const f of preserveFiles) {
      expect(filesAfter).toContain(f);
    }

    // Chmod failure fails backup and does not leave false success
    const resChmodFail = runScript(ctx, "backup-postgres.sh", ["daily"], {
      SIMULATE_CHMOD_FAIL: "1",
    });
    expect(resChmodFail.status).not.toBe(0);
  });

  it("redacts environment values and job payloads from failures and enforces bounded status codes", () => {
    writeState(ctx, { CURRENT_RELEASE_SHA: VALID_SHA_CURRENT });

    const res = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE], {
      SIMULATE_MIGRATE_FAIL: "1",
    });
    expect(res.status).not.toBe(0);

    const logFile = path.join(ctx.logDir, "deploy.log");
    if (existsSync(logFile)) {
      const logContent = readFileSync(logFile, "utf8");
      expect(logContent).not.toContain("SUPER_SECRET_PASSWORD_123");
      expect(logContent).not.toContain("CRITICAL_SECRET_DATABASE_URL");
      for (const line of logContent.trim().split("\n")) {
        if (!line) continue;
        expect(line).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z [A-Z][A-Z0-9_]{0,63}$/);
      }
    }

    expect(res.stdout).not.toContain("SUPER_SECRET_PASSWORD_123");
    expect(res.stderr).not.toContain("SUPER_SECRET_PASSWORD_123");
  });
});