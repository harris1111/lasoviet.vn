import { execFileSync } from "node:child_process";
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

  const dockerScript = `#!/bin/sh
echo "DOCKER: $@" >> "${posixLog}"

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
        exit 0
        ;;
      exec)
        shift
        while [ "\${1#-}" != "$1" ]; do
          shift
        done
        service="$1"
        shift
        if [ "$service" = "postgres" ] && ( [ "$1" = "sh" ] || [ "$1" = "bash" ] ); then
          if [ "\${SIMULATE_BACKUP_FAIL:-0}" = "1" ]; then
            echo "pg_dump failed" >&2
            exit 1
          fi
          printf 'PGDMP\x01\x02fake-custom-dump-content'
          exit 0
        fi
        if [ "\${SIMULATE_HEALTH_FAIL:-0}" = "1" ]; then
          echo "sensitive error payload PAYLOAD_BODY_PRIVATE for $service" >&2
          exit 1
        fi
        if [ "$service" = "worker" ] && [ "\${SIMULATE_WORKER_FAIL:-0}" = "1" ]; then
          echo "worker probe failed" >&2
          exit 1
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

  const curlScript = `#!/bin/sh
echo "CURL: $@" >> "${posixLog}"
if [ "\${SIMULATE_CURL_FAIL:-0}" = "1" ]; then
  echo "curl: (7) Failed to connect with SECRET_KEY_LEAK=leak123" >&2
  exit 1
fi
echo '{"status":"ok"}'
exit 0
`;
  writeFileSync(path.join(fakeBinDir, "curl"), curlScript, { mode: 0o755 });

  const flockScript = `#!/bin/sh
echo "FLOCK: $@" >> "${posixLog}"
if [ "\${SIMULATE_LOCK_BUSY:-0}" = "1" ]; then
  exit 1
fi
if [ "$1" = "-n" ]; then
  shift
  case "$1" in
    [0-9]*)
      exit 0
      ;;
    *)
      shift
      exec "$@"
      ;;
  esac
fi
exec "$@"
`;
  writeFileSync(path.join(fakeBinDir, "flock"), flockScript, { mode: 0o755 });

  const dfScript = `#!/bin/sh
if [ "\${SIMULATE_DISK_FULL:-0}" = "1" ]; then
  echo "Filesystem 1K-blocks Used Available Use% Mounted on"
  echo "/dev/root 10000000 9900000 100000 99% /"
else
  echo "Filesystem 1K-blocks Used Available Use% Mounted on"
  echo "/dev/root 10000000 1000000 9000000 10% /"
fi
exit 0
`;
  writeFileSync(path.join(fakeBinDir, "df"), dfScript, { mode: 0o755 });

  const sleepScript = `#!/bin/sh
exit 0
`;
  writeFileSync(path.join(fakeBinDir, "sleep"), sleepScript, { mode: 0o755 });
}

function setupContext(): TestContext {
  const tempDir = path.join(os.tmpdir(), `cd-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const stateDir = path.join(tempDir, "data", "state");
  const logDir = path.join(tempDir, "data", "logs");
  const backupDir = path.join(tempDir, "data", "backups");
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
    `PROJECT_DIR=${toPosixPath(projectDir)}`,
    `DEPLOY_ENV_FILE=${toPosixPath(path.join(projectDir, ".lasoviet-mvp.env"))}`,
    `DATA_DIR=${toPosixPath(path.join(tempDir, "data"))}`,
    `STATE_DIR=${toPosixPath(stateDir)}`,
    `LOG_DIR=${toPosixPath(logDir)}`,
    `BACKUP_DIR=${toPosixPath(backupDir)}`,
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

  it("serializes poll execution with non-blocking flock", () => {
    const res = runScript(ctx, "poll-release.sh", [], {
      SIMULATE_LOCK_BUSY: "1",
    });

    expect(res.status).toBe(0);
    const commands = readFileSync(ctx.commandsLog, "utf8");
    expect(commands).toContain("FLOCK:");
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

  it("uses one SHA for all immutable image references", () => {
    writeState(ctx, {
      CURRENT_RELEASE_SHA: VALID_SHA_CURRENT,
      PREVIOUS_RELEASE_SHA: VALID_SHA_PREVIOUS,
    });

    const res = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE]);
    expect(res.status).toBe(0);

    const commands = readFileSync(ctx.commandsLog, "utf8");
    expect(commands).toContain("DOCKER: compose");
    expect(commands).toContain("pull migrate api worker web");
    expect(commands).toContain("run --rm");
    expect(commands).toContain("up -d");

    const state = readState(ctx);
    expect(state.CURRENT_RELEASE_SHA).toBe(VALID_SHA_CANDIDATE);
    expect(state.PREVIOUS_RELEASE_SHA).toBe(VALID_SHA_CURRENT);
    expect(state.LAST_ATTEMPTED_RELEASE_SHA).toBe(VALID_SHA_CANDIDATE);
    expect(state.LAST_SUCCESSFUL_DEPLOYMENT_AT).toBeDefined();
  });

  it("fails before migration when the pre-deploy backup fails", () => {
    writeState(ctx, { CURRENT_RELEASE_SHA: VALID_SHA_CURRENT });

    const res = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE], {
      SIMULATE_BACKUP_FAIL: "1",
    });

    expect(res.status).not.toBe(0);
    const commands = readFileSync(ctx.commandsLog, "utf8");
    expect(commands).not.toContain("migrate");

    const state = readState(ctx);
    expect(state.CURRENT_RELEASE_SHA).toBe(VALID_SHA_CURRENT);
    expect(state.LAST_ATTEMPTED_RELEASE_SHA).toBe(VALID_SHA_CANDIDATE);
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
    expect(state.LAST_FAILURE_CODE).toBeDefined();
  });

  it("rolls back application images after post-replacement health failure", () => {
    writeState(ctx, {
      CURRENT_RELEASE_SHA: VALID_SHA_CURRENT,
      PREVIOUS_RELEASE_SHA: VALID_SHA_PREVIOUS,
    });

    const res = runScript(ctx, "deploy-release.sh", [VALID_SHA_CANDIDATE], {
      SIMULATE_HEALTH_FAIL: "1",
    });

    expect(res.status).not.toBe(0);

    const commands = readFileSync(ctx.commandsLog, "utf8");
    expect(commands).toContain("up -d");

    const state = readState(ctx);
    expect(state.CURRENT_RELEASE_SHA).toBe(VALID_SHA_CURRENT);
    expect(state.LAST_ATTEMPTED_RELEASE_SHA).toBe(VALID_SHA_CANDIDATE);
    expect(state.LAST_FAILURE_CODE).toBeDefined();
  });

  it("never invokes database downgrade or restore during rollback", () => {
    writeState(ctx, {
      CURRENT_RELEASE_SHA: VALID_SHA_CURRENT,
      PREVIOUS_RELEASE_SHA: VALID_SHA_PREVIOUS,
    });

    const res = runScript(ctx, "rollback-release.sh", [VALID_SHA_PREVIOUS]);
    expect(res.status).toBe(0);

    const commands = readFileSync(ctx.commandsLog, "utf8");
    expect(commands).not.toContain("migrate");
    expect(commands).not.toContain("pg_restore");
    expect(commands).not.toContain("backup-postgres.sh");
  });

  it("retains seven daily and ten pre-deploy archives only", () => {
    for (let i = 1; i <= 9; i++) {
      const day = i.toString().padStart(2, "0");
      const name = `daily-202609${day}T023000Z.dump`;
      writeFileSync(path.join(ctx.backupDir, name), "dummy-dump", { mode: 0o600 });
      writeFileSync(path.join(ctx.backupDir, `${name}.sha256`), "dummy-sha", { mode: 0o600 });
    }

    for (let i = 1; i <= 12; i++) {
      const day = i.toString().padStart(2, "0");
      const name = `pre-deploy-${VALID_SHA_CURRENT}-202609${day}T023000Z.dump`;
      writeFileSync(path.join(ctx.backupDir, name), "dummy-dump", { mode: 0o600 });
      writeFileSync(path.join(ctx.backupDir, `${name}.sha256`), "dummy-sha", { mode: 0o600 });
    }

    const res = runScript(ctx, "backup-postgres.sh", ["daily"]);
    expect(res.status).toBe(0);

    const files = readdirSync(ctx.backupDir);
    const dailyDumps = files.filter((f) => f.startsWith("daily-") && f.endsWith(".dump"));
    const predeployDumps = files.filter((f) => f.startsWith("pre-deploy-") && f.endsWith(".dump"));

    expect(dailyDumps.length).toBe(7);
    expect(predeployDumps.length).toBe(10);
  });

  it("preserves unknown and failed backup files", () => {
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
  });

  it("redacts environment values and job payloads from failures", () => {
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
        expect(line).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z [A-Z0-9_]+$/);
      }
    }

    expect(res.stdout).not.toContain("SUPER_SECRET_PASSWORD_123");
    expect(res.stderr).not.toContain("SUPER_SECRET_PASSWORD_123");
  });
});