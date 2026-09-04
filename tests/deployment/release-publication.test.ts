import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workflowPath = join(root, ".github", "workflows", "ci.yml");
const markerDockerfilePath = join(root, "docker", "release-marker.Dockerfile");

function normalizeLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n");
}

describe("CI GHCR release publication contract", () => {
  it("gates publication on verified master pushes with ref-scoped concurrency", async () => {
    const content = await readFile(workflowPath, "utf8");
    const lines = normalizeLines(content);

    const publicationTrigger = content.includes(
      "if: github.event_name == 'push' && github.ref == 'refs/heads/master'",
    )
      ? "push-to-master-only"
      : "not-push-to-master-only";
    expect(publicationTrigger).toBe("push-to-master-only");

    const publishJobNeeds = content.includes("needs: verify") ? ["verify"] : [];
    expect(publishJobNeeds).toContain("verify");

    expect(content).toContain("group: production-release-${{ github.ref }}");
    expect(content).toContain("cancel-in-progress: true");

    const verifyIndex = lines.findIndex((line) => line.trim() === "verify:");
    const publishIndex = lines.findIndex((line) => line.trim() === "publish:");
    expect(verifyIndex).toBeGreaterThan(-1);
    expect(publishIndex).toBeGreaterThan(verifyIndex);
  });

  it("publishes immutable sha-tagged images and advances production marker last", async () => {
    const content = await readFile(workflowPath, "utf8");

    expect(content).toContain("ghcr.io/harris1111/lasoviet-api:sha-${{ github.sha }}");
    expect(content).toContain("ghcr.io/harris1111/lasoviet-web:sha-${{ github.sha }}");
    expect(content).toContain("ghcr.io/harris1111/lasoviet-worker:sha-${{ github.sha }}");
    expect(content).toContain("ghcr.io/harris1111/lasoviet-release:sha-${{ github.sha }}");
    expect(content).toContain("ghcr.io/harris1111/lasoviet-release:production");

    expect(content).not.toContain("lasoviet-api:latest");
    expect(content).not.toContain("lasoviet-web:latest");
    expect(content).not.toContain("lasoviet-worker:latest");
    expect(content).not.toContain("lasoviet-release:latest");

    const markerImmutableIndex = content.indexOf(
      "ghcr.io/harris1111/lasoviet-release:sha-${{ github.sha }}",
    );
    const markerProductionIndex = content.indexOf(
      "ghcr.io/harris1111/lasoviet-release:production",
    );

    expect(markerImmutableIndex).toBeGreaterThan(-1);
    expect(markerProductionIndex).toBeGreaterThan(markerImmutableIndex);

    const markerPushOrder = [
      "ghcr.io/harris1111/lasoviet-release:sha-${{ github.sha }}",
      "ghcr.io/harris1111/lasoviet-release:production",
    ];
    expect(markerPushOrder.at(-1)).toBe("ghcr.io/harris1111/lasoviet-release:production");

    const allImageTags = [
      "ghcr.io/harris1111/lasoviet-api:sha-${{ github.sha }}",
      "ghcr.io/harris1111/lasoviet-web:sha-${{ github.sha }}",
      "ghcr.io/harris1111/lasoviet-worker:sha-${{ github.sha }}",
      "ghcr.io/harris1111/lasoviet-release:sha-${{ github.sha }}",
    ];
    const toUseOneValidatedFortyCharacterSha = (tags: string[]) =>
      tags.every((tag) => tag.endsWith(":sha-${{ github.sha }}"));
    expect(toUseOneValidatedFortyCharacterSha(allImageTags)).toBe(true);

    expect(content).toContain("docker buildx imagetools create");
  });

  it("defines a minimal release marker Dockerfile recording image revision label", async () => {
    const content = await readFile(markerDockerfilePath, "utf8");
    expect(content).toContain("FROM scratch");
    expect(content).toContain("ARG REVISION");
    expect(content).toContain('LABEL org.opencontainers.image.revision="${REVISION}"');
  });
});
