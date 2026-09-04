import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workflowPath = join(root, ".github", "workflows", "ci.yml");
const markerDockerfilePath = join(root, "docker", "release-marker.Dockerfile");

type StepBlock = {
  name?: string;
  uses?: string;
  with?: Record<string, string>;
  run?: string;
  rawText: string;
};

type JobBlock = {
  name: string;
  rawText: string;
  ifCondition?: string;
  needs?: string[];
  permissions?: Record<string, string>;
  concurrency?: {
    group?: string;
    cancelInProgress?: boolean;
  };
  steps: StepBlock[];
};

function normalizeLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function parseWorkflowJobs(content: string): Map<string, JobBlock> {
  const lines = normalizeLines(content);
  const jobs = new Map<string, JobBlock>();

  let inJobs = false;
  let currentJobName: string | null = null;
  let currentJobLines: string[] = [];

  const flushCurrentJob = () => {
    if (currentJobName && currentJobLines.length > 0) {
      jobs.set(currentJobName, parseJobBlock(currentJobName, currentJobLines));
    }
  };

  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;

    const jobHeaderMatch = line.match(/^ {2}([a-zA-Z0-9_-]+):\s*$/);
    if (jobHeaderMatch) {
      flushCurrentJob();
      currentJobName = jobHeaderMatch[1]!;
      currentJobLines = [];
      continue;
    }

    if (currentJobName) {
      if (/^[^\s]/.test(line)) {
        flushCurrentJob();
        currentJobName = null;
        inJobs = false;
      } else {
        currentJobLines.push(line);
      }
    }
  }

  flushCurrentJob();
  return jobs;
}

function parseJobBlock(name: string, lines: string[]): JobBlock {
  const rawText = lines.join("\n");
  let ifCondition: string | undefined;
  let needs: string[] | undefined;
  let cancelInProgress: boolean | undefined;
  let concurrencyGroup: string | undefined;

  const steps: StepBlock[] = [];
  let inSteps = false;
  let currentStepLines: string[] = [];

  const flushStep = () => {
    if (currentStepLines.length > 0) {
      steps.push(parseStep(currentStepLines));
      currentStepLines = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inSteps) {
      const ifMatch = line.match(/^\s{4}if:\s*(.+)$/);
      if (ifMatch) ifCondition = ifMatch[1]!.trim();

      const needsMatch = line.match(/^\s{4}needs:\s*(.+)$/);
      if (needsMatch) {
        needs = [needsMatch[1]!.trim()];
      }

      const groupMatch = line.match(/^\s{6}group:\s*(.+)$/);
      if (groupMatch) concurrencyGroup = groupMatch[1]!.trim();

      const cancelMatch = line.match(/^\s{6}cancel-in-progress:\s*(true|false)$/);
      if (cancelMatch) cancelInProgress = cancelMatch[1] === "true";

      if (/^\s{4}steps:\s*$/.test(line)) {
        inSteps = true;
        continue;
      }
    } else {
      if (/^\s{6}-\s/.test(line)) {
        flushStep();
        currentStepLines.push(line);
      } else if (/^\s{6}\s/.test(line) || /^\s*$/.test(line)) {
        currentStepLines.push(line);
      }
    }
  }

  flushStep();

  return {
    name,
    rawText,
    ifCondition,
    needs,
    concurrency:
      concurrencyGroup !== undefined || cancelInProgress !== undefined
        ? { group: concurrencyGroup, cancelInProgress }
        : undefined,
    steps,
  };
}

function parseStep(lines: string[]): StepBlock {
  const rawText = lines.join("\n");
  let name: string | undefined;
  let uses: string | undefined;

  for (const line of lines) {
    const nameMatch = line.match(/^\s*-\s+name:\s*(.+)$/);
    if (nameMatch) name = nameMatch[1]!.trim();

    const usesMatch = line.match(/^\s*(?:-\s+)?uses:\s*(.+)$/);
    if (usesMatch && !uses) uses = usesMatch[1]!.trim();
  }

  return { name, uses, rawText };
}

describe("CI GHCR release publication contract", () => {
  it("structures publication into immutable publish and non-cancellable promote-production jobs", async () => {
    const content = await readFile(workflowPath, "utf8");
    const jobs = parseWorkflowJobs(content);

    const publishJob = jobs.get("publish");
    const promoteJob = jobs.get("promote-production");

    expect(publishJob).toBeDefined();
    expect(promoteJob).toBeDefined();

    expect(publishJob?.ifCondition).toBe(
      "github.event_name == 'push' && github.ref == 'refs/heads/master'",
    );
    expect(publishJob?.needs).toEqual(["verify"]);
    expect(publishJob?.rawText).toContain("packages: write");
    expect(publishJob?.concurrency).toEqual({
      group: "production-release-${{ github.ref }}",
      cancelInProgress: true,
    });

    expect(promoteJob?.ifCondition).toBe(
      "github.event_name == 'push' && github.ref == 'refs/heads/master'",
    );
    expect(promoteJob?.needs).toEqual(["publish"]);
    expect(promoteJob?.rawText).toContain("packages: write");
    expect(promoteJob?.concurrency).toBeUndefined();
    expect(promoteJob?.rawText).not.toContain("cancel-in-progress");
  });

  it("publishes immutable sha-tagged images in publish job and keeps production marker mutation strictly in promote-production", async () => {
    const content = await readFile(workflowPath, "utf8");
    const jobs = parseWorkflowJobs(content);

    const publishJob = jobs.get("publish");
    const promoteJob = jobs.get("promote-production");

    expect(publishJob).toBeDefined();
    expect(promoteJob).toBeDefined();

    // publish job assertions
    expect(publishJob?.rawText).toContain(
      "ghcr.io/harris1111/lasoviet-api:sha-${{ github.sha }}",
    );
    expect(publishJob?.rawText).toContain(
      "ghcr.io/harris1111/lasoviet-web:sha-${{ github.sha }}",
    );
    expect(publishJob?.rawText).toContain(
      "ghcr.io/harris1111/lasoviet-worker:sha-${{ github.sha }}",
    );
    expect(publishJob?.rawText).toContain(
      "ghcr.io/harris1111/lasoviet-release:sha-${{ github.sha }}",
    );
    expect(publishJob?.rawText).not.toContain(":production");
    expect(publishJob?.rawText).not.toContain(":latest");

    // All source lines referencing ghcr.io/harris1111 must match expected image formats
    const lines = normalizeLines(content);
    const imageLines = lines.filter((line) => line.includes("ghcr.io/harris1111/"));
    expect(imageLines.length).toBeGreaterThan(0);
    for (const line of imageLines) {
      const isImmutableSha = line.includes(":sha-${{ github.sha }}");
      const isProduction = line.includes(":production");
      expect(isImmutableSha || isProduction).toBe(true);
      if (isProduction) {
        expect(promoteJob?.rawText).toContain("ghcr.io/harris1111/lasoviet-release:production");
        expect(publishJob?.rawText).not.toContain(":production");
      }
    }

    // promote-production must have fresh login step and its final step must be the sole registry mutation
    const promoteSteps = promoteJob?.steps ?? [];
    expect(promoteSteps.length).toBeGreaterThanOrEqual(2);
    const loginStep = promoteSteps.find((s) =>
      s.uses?.startsWith("docker/login-action"),
    );
    expect(loginStep).toBeDefined();

    const finalStep = promoteSteps.at(-1);
    expect(finalStep?.rawText).toContain("docker buildx imagetools create");
    expect(finalStep?.rawText).toContain(
      "--tag ghcr.io/harris1111/lasoviet-release:production",
    );
    expect(finalStep?.rawText).toContain(
      "ghcr.io/harris1111/lasoviet-release:sha-${{ github.sha }}",
    );

    // No other step in promote-production contains buildx or docker push/create
    const nonFinalSteps = promoteSteps.slice(0, -1);
    for (const step of nonFinalSteps) {
      expect(step.rawText).not.toContain("imagetools create");
      expect(step.rawText).not.toContain("build-push-action");
    }
  });

  it("defines a minimal release marker Dockerfile recording image revision label", async () => {
    const content = await readFile(markerDockerfilePath, "utf8");
    expect(content).toContain("FROM scratch");
    expect(content).toContain("ARG REVISION");
    expect(content).toContain('LABEL org.opencontainers.image.revision="${REVISION}"');
  });
});
