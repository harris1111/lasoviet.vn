import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  collectCustomerFacingFiles,
  PROHIBITED_CATEGORIES,
  scanContentForProhibitedPatterns,
  scanCustomerFacingFiles,
  validateClaimRegistry,
} from "../scripts/public-claim-check.mjs";

const sampleValidRegistry = {
  $schema: "https://lasoviet.net/schemas/claims-registry.v1.json",
  schemaVersion: 1,
  claims: [
    {
      id: "privacy-birth-data-processing",
      topic: "privacy",
      approvalState: "approved",
      publishable: true,
      wording: {
        vi: "Dữ liệu ngày giờ sinh được thu thập theo sự đồng ý của người dùng.",
        en: "Birth data is collected with user consent.",
      },
      authorities: ["FD-020", "FD-081"],
      placements: [
        {
          routeId: "trust.privacy",
          sourcePath: "content/public/vi/pages/privacy.mdx",
          state: "active",
          sourceExcerpts: ["Thông tin sinh và dữ liệu cá nhân"],
        },
        {
          routeId: "future.route",
          sourcePath: "content/public/vi/pages/future.mdx",
          state: "planned",
        },
      ],
    },
  ],
};

describe("validateClaimRegistry", () => {
  const validRouteIds = new Set(["trust.privacy", "brand.about"]);

  it("validates a well-formed registry successfully", () => {
    const result = validateClaimRegistry(sampleValidRegistry, validRouteIds);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("validates the canonical config/claims.json file on disk", () => {
    const canonical = JSON.parse(
      readFileSync(resolve("config/claims.json"), "utf8"),
    );
    const routes = [
      "trust.privacy",
      "private.chart",
      "methodology.ai-evidence",
      "wizard.tu-vi",
      "private.account.privacy",
      "private.checkout",
      "support.faq",
      "trust.terms",
      "commercial.tu-vi",
      "private.chart.topic",
      "trust.sources",
      "brand.about",
      "methodology.root",
    ];
    const result = validateClaimRegistry(canonical, new Set(routes));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects invalid schemaVersion", () => {
    const invalid = { ...sampleValidRegistry, schemaVersion: 2 };
    const result = validateClaimRegistry(invalid, validRouteIds);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("Invalid schemaVersion"))).toBe(true);
  });

  it("rejects non-array or empty claims", () => {
    expect(validateClaimRegistry({ schemaVersion: 1, claims: [] }).valid).toBe(false);
    expect(validateClaimRegistry({ schemaVersion: 1, claims: null }).valid).toBe(false);
  });

  it("rejects duplicate claim IDs", () => {
    const invalid = {
      schemaVersion: 1,
      claims: [
        sampleValidRegistry.claims[0],
        { ...sampleValidRegistry.claims[0] },
      ],
    };
    const result = validateClaimRegistry(invalid, validRouteIds);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("Duplicate claim id"))).toBe(true);
  });

  it("rejects disallowed topics", () => {
    const invalid = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          topic: "unsupported_topic",
        },
      ],
    };
    const result = validateClaimRegistry(invalid, validRouteIds);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("invalid topic"))).toBe(true);
  });

  it("rejects disallowed approvalState", () => {
    const invalid = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          approvalState: "auto_approved",
        },
      ],
    };
    const result = validateClaimRegistry(invalid, validRouteIds);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("invalid approvalState"))).toBe(true);
  });

  it("enforces publishable boolean and consistency with approvalState", () => {
    const nonBoolean = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          publishable: "true",
        },
      ],
    };
    expect(validateClaimRegistry(nonBoolean, validRouteIds).valid).toBe(false);

    const approvedFalse = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          approvalState: "approved",
          publishable: false,
        },
      ],
    };
    const resApproved = validateClaimRegistry(approvedFalse, validRouteIds);
    expect(resApproved.valid).toBe(false);
    expect(resApproved.errors.some((e: string) => e.includes("must have publishable set to true"))).toBe(true);

    const draftTrue = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          approvalState: "draft_privacy",
          publishable: true,
        },
      ],
    };
    const resDraft = validateClaimRegistry(draftTrue, validRouteIds);
    expect(resDraft.valid).toBe(false);
    expect(resDraft.errors.some((e: string) => e.includes("must have publishable set to false"))).toBe(true);
  });

  it("rejects an active placement for a non-approved claim", () => {
    const invalid = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          approvalState: "draft_finance",
          publishable: false,
        },
      ],
    };
    const result = validateClaimRegistry(invalid, validRouteIds);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e: string) =>
        e.includes("cannot be active while") && e.includes("draft_finance"),
      ),
    ).toBe(true);
  });

  it("requires non-empty sourceExcerpts for active placements", () => {
    for (const sourceExcerpts of [undefined, [], [""]]) {
      const placement = {
        ...sampleValidRegistry.claims[0].placements[0],
        sourceExcerpts,
      };
      if (sourceExcerpts === undefined) delete placement.sourceExcerpts;
      const invalid = {
        schemaVersion: 1,
        claims: [
          {
            ...sampleValidRegistry.claims[0],
            placements: [placement],
          },
        ],
      };
      const result = validateClaimRegistry(invalid, validRouteIds);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e: string) =>
          e.includes("must have a non-empty sourceExcerpts array"),
        ),
      ).toBe(true);
    }
  });

  it("rejects stale source excerpts", () => {
    const invalid = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          placements: [
            {
              ...sampleValidRegistry.claims[0].placements[0],
              sourceExcerpts: ["This excerpt is not in the source file."],
            },
          ],
        },
      ],
    };
    const result = validateClaimRegistry(invalid, validRouteIds);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e: string) => e.includes("is stale or absent")),
    ).toBe(true);
  });

  it("matches source excerpts after CRLF/LF and NFC normalization", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "lsv-evidence-test-"));
    try {
      const sourceDir = join(tempDir, "content", "public", "vi", "pages");
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(
        join(sourceDir, "privacy.mdx"),
        "Dòng một\r\nDòng hai\r\n",
        "utf8",
      );
      const registry = {
        schemaVersion: 1,
        claims: [
          {
            ...sampleValidRegistry.claims[0],
            placements: [
              {
                routeId: "trust.privacy",
                sourcePath: "content/public/vi/pages/privacy.mdx",
                state: "active",
                sourceExcerpts: ["Dòng một\nDòng hai"],
              },
            ],
          },
        ],
      };
      const result = validateClaimRegistry(registry, validRouteIds, tempDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects unknown or missing required fields on claim", () => {
    const missingField = {
      schemaVersion: 1,
      claims: [
        {
          id: "claim-1",
          topic: "privacy",
          approvalState: "approved",
          publishable: true,
          wording: { vi: "A", en: "B" },
          placements: [
            {
              routeId: "trust.privacy",
              sourcePath: "content/public/vi/pages/privacy.mdx",
              state: "active",
            },
          ],
        },
      ],
    };
    const resMissing = validateClaimRegistry(missingField, validRouteIds);
    expect(resMissing.valid).toBe(false);
    expect(resMissing.errors.some((e: string) => e.includes("missing required field"))).toBe(true);

    const unknownField = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          inventedField: "unexpected",
        },
      ],
    };
    const resUnknown = validateClaimRegistry(unknownField, validRouteIds);
    expect(resUnknown.valid).toBe(false);
    expect(resUnknown.errors.some((e: string) => e.includes("unknown field"))).toBe(true);
  });

  it("rejects unknown fields on placement", () => {
    const unknownPlacementField = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          placements: [
            {
              routeId: "trust.privacy",
              sourcePath: "content/public/vi/pages/privacy.mdx",
              state: "active",
              extraKey: "bad",
            },
          ],
        },
      ],
    };
    const res = validateClaimRegistry(unknownPlacementField, validRouteIds);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e: string) => e.includes("unknown field"))).toBe(true);
  });

  it("rejects missing bilingual wording", () => {
    const missingVi = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          wording: { vi: "", en: "Some text" },
        },
      ],
    };
    expect(validateClaimRegistry(missingVi, validRouteIds).valid).toBe(false);

    const missingEn = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          wording: { vi: "Nội dung", en: "" },
        },
      ],
    };
    expect(validateClaimRegistry(missingEn, validRouteIds).valid).toBe(false);
  });

  it("rejects empty authorities", () => {
    const invalid = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          authorities: [],
        },
      ],
    };
    expect(validateClaimRegistry(invalid, validRouteIds).valid).toBe(false);
  });

  it("rejects active placement with unknown routeId", () => {
    const invalid = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          placements: [
            {
              routeId: "nonexistent.route",
              sourcePath: "content/public/vi/pages/privacy.mdx",
              state: "active",
            },
          ],
        },
      ],
    };
    const result = validateClaimRegistry(invalid, validRouteIds);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("does not exist in route registry"))).toBe(true);
  });

  it("rejects active placement with non-existent source file on disk", () => {
    const invalid = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          placements: [
            {
              routeId: "trust.privacy",
              sourcePath: "content/public/vi/pages/does-not-exist.mdx",
              state: "active",
            },
          ],
        },
      ],
    };
    const result = validateClaimRegistry(invalid, validRouteIds);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("does not exist on disk"))).toBe(true);
  });

  it("rejects path traversal, absolute sourcePath, and sibling-prefix escapes", () => {
    const traversing = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          placements: [
            {
              routeId: "trust.privacy",
              sourcePath: "../outside/privacy.mdx",
              state: "planned",
            },
          ],
        },
      ],
    };
    expect(validateClaimRegistry(traversing, validRouteIds).valid).toBe(false);

    const absolute = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          placements: [
            {
              routeId: "trust.privacy",
              sourcePath: "/etc/passwd",
              state: "planned",
            },
          ],
        },
      ],
    };
    expect(validateClaimRegistry(absolute, validRouteIds).valid).toBe(false);

    const siblingEscape = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          placements: [
            {
              routeId: "trust.privacy",
              sourcePath: "../lasoviet-ticket-13-20260914-sibling/secret.mdx",
              state: "planned",
            },
          ],
        },
      ],
    };
    const resSibling = validateClaimRegistry(siblingEscape, validRouteIds);
    expect(resSibling.valid).toBe(false);
    expect(resSibling.errors.some((e: string) => e.includes("escapes repository root"))).toBe(true);
  });

  it("rejects active placement with symlink escaping repository root", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "lsv-symlink-test-"));
    try {
      const repoRoot = join(tempDir, "repo");
      const outsideDir = join(tempDir, "outside");
      mkdirSync(repoRoot, { recursive: true });
      mkdirSync(outsideDir, { recursive: true });

      const outsideFile = join(outsideDir, "outside-secret.mdx");
      writeFileSync(outsideFile, "secret content", "utf8");

      const symlinkPath = join(repoRoot, "escaped.mdx");
      symlinkSync(outsideFile, symlinkPath);

      const registryWithSymlink = {
        schemaVersion: 1,
        claims: [
          {
            id: "symlink-test-claim",
            topic: "privacy",
            approvalState: "approved",
            publishable: true,
            wording: { vi: "Bảo mật", en: "Privacy" },
            authorities: ["FD-020"],
            placements: [
              {
                routeId: "trust.privacy",
                sourcePath: "escaped.mdx",
                state: "active",
              },
            ],
          },
        ],
      };

      const result = validateClaimRegistry(
        registryWithSymlink,
        validRouteIds,
        repoRoot,
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e: string) =>
          e.includes("escapes repository root via symlink"),
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("allows planned placement to reference future route and non-existent relative path", () => {
    const plannedOnly = {
      schemaVersion: 1,
      claims: [
        {
          ...sampleValidRegistry.claims[0],
          placements: [
            {
              routeId: "future.uncreated.route",
              sourcePath: "content/public/vi/pages/future-page.mdx",
              state: "planned",
            },
          ],
        },
      ],
    };
    const result = validateClaimRegistry(plannedOnly, validRouteIds);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("scanContentForProhibitedPatterns - Category 1: False Human/Expert/Team Review", () => {
  it("rejects false team/human review statements", () => {
    const sample1 = "nội dung diễn giải được đội ngũ Lá Số Việt xem xét trước khi công bố.";
    const violations1 = scanContentForProhibitedPatterns("sources.mdx", sample1);
    expect(violations1.some((v: any) => v.category === PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW)).toBe(true);

    const sample2 = "<p>Nội dung đã được xem xét.</p>";
    const violations2 = scanContentForProhibitedPatterns("page.tsx", sample2);
    expect(violations2.some((v: any) => v.category === PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW)).toBe(true);

    const sample3 = "Reviewed content.";
    const violations3 = scanContentForProhibitedPatterns("page.tsx", sample3);
    expect(violations3.some((v: any) => v.category === PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW)).toBe(true);

    const sample4 = "Lá số này được chuyên gia tử vi xem xét cẩn thận.";
    const violations4 = scanContentForProhibitedPatterns("sample.tsx", sample4);
    expect(violations4.some((v: any) => v.category === PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW)).toBe(true);

    const sample5 = "Every chart is verified by a human reviewer before delivery.";
    const violations5 = scanContentForProhibitedPatterns("sample.ts", sample5);
    expect(violations5.some((v: any) => v.category === PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW)).toBe(true);
  });

  it("rejects reviewed by experts and đã được chuyên gia xem xét/kiểm duyệt", () => {
    const sampleExpertsEn = "This interpretation was reviewed by experts.";
    const resExpertsEn = scanContentForProhibitedPatterns("doc.tsx", sampleExpertsEn);
    expect(resExpertsEn.some((v: any) => v.category === PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW)).toBe(true);

    const sampleXemXetVi = "Nội dung này đã được chuyên gia xem xét.";
    const resXemXetVi = scanContentForProhibitedPatterns("doc.tsx", sampleXemXetVi);
    expect(resXemXetVi.some((v: any) => v.category === PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW)).toBe(true);

    const sampleKiemDuyetVi = "Báo cáo đã được chuyên gia kiểm duyệt kỹ lưỡng.";
    const resKiemDuyetVi = scanContentForProhibitedPatterns("doc.tsx", sampleKiemDuyetVi);
    expect(resKiemDuyetVi.some((v: any) => v.category === PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW)).toBe(true);

    const sampleDoiNguVi = "Mỗi nội dung đều do đội ngũ biên tập kiểm duyệt.";
    const resDoiNguVi = scanContentForProhibitedPatterns("doc.tsx", sampleDoiNguVi);
    expect(resDoiNguVi.some((v: any) => v.category === PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW)).toBe(true);
  });

  it("rejects false human review on the same line as approved byline (no line suppression)", () => {
    const bypassAttempt = "Lá Số Việt biên tập; reviewed by our team.";
    const violations = scanContentForProhibitedPatterns("footer.tsx", bypassAttempt);
    expect(violations.some((v: any) => v.category === PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW)).toBe(true);
  });

  it("allows exact approved attribution FD-071 alone", () => {
    const vi = "<p>Lá Số Việt biên tập</p>";
    expect(scanContentForProhibitedPatterns("page.tsx", vi)).toEqual([]);

    const en = "<p>Edited by La So Viet</p>";
    expect(scanContentForProhibitedPatterns("page.tsx", en)).toEqual([]);
  });

  it("allows legitimate disclaimers mentioning chuyên gia", () => {
    const disclaimer1 = "Không thay thế tư vấn y tế, pháp lý hoặc tài chính từ chuyên gia.";
    expect(scanContentForProhibitedPatterns("about.mdx", disclaimer1)).toEqual([]);

    const disclaimer2 = "Không thay thế chẩn đoán hoặc điều trị từ chuyên gia sức khoẻ tâm thần.";
    expect(scanContentForProhibitedPatterns("dream.tsx", disclaimer2)).toEqual([]);

    const disclaimer3 = "Nếu giấc mơ gây lo lắng kéo dài, hãy trao đổi với người bạn tin cậy hoặc chuyên gia sức khoẻ tâm thần phù hợp.";
    expect(scanContentForProhibitedPatterns("dream.tsx", disclaimer3)).toEqual([]);

    const disclaimer4 = "Không dùng danh xưng chuyên gia khi chưa có căn cứ.";
    expect(scanContentForProhibitedPatterns("about.mdx", disclaimer4)).toEqual([]);

    const pendingReview1 = "Công thức đang chờ chuyên gia rà soát.";
    expect(scanContentForProhibitedPatterns("fengshui.tsx", pendingReview1)).toEqual([]);

    const pendingReview2 = "cung mệnh và cách xếp loại hướng cụ thể chưa được kiểm chứng bởi chuyên gia phong thuỷ";
    expect(scanContentForProhibitedPatterns("fengshui.tsx", pendingReview2)).toEqual([]);
  });

  it("allows internal reviewer metadata and bibliography references", () => {
    const metadataYaml = '"reviewer": "content-team"';
    expect(scanContentForProhibitedPatterns("route.yml", metadataYaml)).toEqual([]);

    const metadataFrontmatter = '"reviewerIds": ["trust-reviewer"]';
    expect(scanContentForProhibitedPatterns("doc.mdx", metadataFrontmatter)).toEqual([]);

    const biblioVi = "<p>Nguồn tham chiếu đã xem xét:</p>";
    expect(scanContentForProhibitedPatterns("knowledge.tsx", biblioVi)).toEqual([]);

    const biblioEn = "<p>Reviewed references:</p>";
    expect(scanContentForProhibitedPatterns("knowledge.tsx", biblioEn)).toEqual([]);
  });
});

describe("scanContentForProhibitedPatterns - Category 2: Absolute Accuracy or Scientific Proof", () => {
  it("rejects absolute accuracy or scientific proof claims", () => {
    const samples = [
      "Độ chính xác 100% cho mọi lá số.",
      "100% accurate results guaranteed.",
      "Phương pháp này đã được khoa học chứng minh hiệu quả.",
      "Khoa học đã chứng minh Tử Vi là chuẩn xác.",
      "Scientifically proven methodology.",
      "Cam kết chính xác tuyệt đối.",
      "Kết quả hoàn toàn chính xác.",
    ];

    for (const sample of samples) {
      const violations = scanContentForProhibitedPatterns("test.tsx", sample);
      expect(
        violations.some(
          (v: any) => v.category === PROHIBITED_CATEGORIES.ABSOLUTE_ACCURACY_OR_SCIENCE,
        ),
      ).toBe(true);
    }
  });

  it("rejects ordinary scientific-proof variants", () => {
    const ordinaryVariants = [
      "Proven by science beyond any doubt.",
      "There is scientific proof for this reading.",
      "Proven scientifically across multiple trials.",
      "Phương pháp được chứng minh bằng khoa học thực nghiệm.",
      "Có cơ sở khoa học chứng minh tính xác thực.",
      "Hoàn toàn chuẩn xác từng chi tiết.",
      "Chuẩn xác tuyệt đối cho cuộc đời bạn.",
    ];

    for (const sample of ordinaryVariants) {
      const violations = scanContentForProhibitedPatterns("test.tsx", sample);
      expect(
        violations.some(
          (v: any) => v.category === PROHIBITED_CATEGORIES.ABSOLUTE_ACCURACY_OR_SCIENCE,
        ),
      ).toBe(true);
    }
  });

  it("allows non-absolute accuracy discussions and science disclaimers", () => {
    const allowed = [
      "Tử Vi có chính xác không?",
      "Thần Số Học là một công cụ tự chiêm nghiệm dựa trên công thức toán học, không phải phép đo tính cách hay năng lực khoa học.",
      "Dữ liệu thời gian được giữ theo độ chính xác đã khai báo.",
      "Một lần lập lá số cần ngày sinh, thời gian, múi giờ và mức độ chính xác phù hợp.",
      "Giải thích ba khái niệm nền tảng để đọc cấu trúc lá số mà không biến thuật ngữ thành lời khẳng định tuyệt đối.",
      "Nội dung chỉ mang tính tham khảo và tự chiêm nghiệm; không cam kết tính khoa học thực nghiệm, không hứa hẹn độ chính xác tuyệt đối.",
    ];

    for (const line of allowed) {
      expect(scanContentForProhibitedPatterns("article.mdx", line)).toEqual([]);
    }
  });
});

describe("scanContentForProhibitedPatterns - Category 3: Absolute No-Third-Party Sharing", () => {
  it("rejects absolute no-third-party claims that conflict with approved processors", () => {
    const samples = [
      "Chúng tôi tuyệt đối không bao giờ chia sẻ dữ liệu với bên thứ ba.",
      "Cam kết không bao giờ chia sẻ thông tin cho bất kỳ bên thứ ba nào.",
      "We never share your personal information with third parties.",
      "We never share data with any third party under any circumstance.",
    ];

    for (const sample of samples) {
      const violations = scanContentForProhibitedPatterns("privacy.mdx", sample);
      expect(
        violations.some(
          (v: any) => v.category === PROHIBITED_CATEGORIES.ABSOLUTE_NO_THIRD_PARTY,
        ),
      ).toBe(true);
    }
  });

  it("rejects ordinary absolute no-third-party sharing variants", () => {
    const ordinaryVariants = [
      "Chúng tôi không chia sẻ thông tin cá nhân với bên thứ ba.",
      "Hệ thống không chia sẻ dữ liệu cho bên thứ ba.",
      "Không tiết lộ thông tin cho bên thứ ba.",
      "We do not share your information with third parties.",
      "No personal data is shared with third parties.",
      "Third parties never receive any customer data.",
    ];

    for (const sample of ordinaryVariants) {
      const violations = scanContentForProhibitedPatterns("privacy.mdx", sample);
      expect(
        violations.some(
          (v: any) => v.category === PROHIBITED_CATEGORIES.ABSOLUTE_NO_THIRD_PARTY,
        ),
      ).toBe(true);
    }
  });

  it("allows approved specific third-party boundaries", () => {
    const allowed = [
      "Third parties never receive exact birth date, time, or place.",
      "Các công cụ phân tích bên thứ ba không bao giờ nhận họ tên, ngày giờ sinh chính xác, câu hỏi tự do hoặc mã lá số của người dùng.",
      "Hệ thống không chia sẻ dữ liệu sinh với bên thứ ba cho mục đích quảng cáo.",
    ];

    for (const line of allowed) {
      expect(scanContentForProhibitedPatterns("privacy.mdx", line)).toEqual([]);
    }
  });
});

describe("scanContentForProhibitedPatterns - Category 4: Definite Health/Fertility/Lottery Predictions", () => {
  it("rejects fatalistic and guaranteed fortune claims", () => {
    const samples = [
      "Bạn chắc chắn sẽ trúng số độc đắc vào năm sau.",
      "Chắc chắn sinh con trai nếu sinh vào giờ này.",
      "Lá số chỉ ra chắc chắn chết vì tai nạn giao thông.",
      "Hai tuổi này lấy nhau khắc chết.",
      "Cam kết chữa khỏi bệnh hiểm nghèo nhờ phong thủy.",
      "Guaranteed jackpot winning dates.",
    ];

    for (const sample of samples) {
      const violations = scanContentForProhibitedPatterns("report.tsx", sample);
      expect(
        violations.some(
          (v: any) => v.category === PROHIBITED_CATEGORIES.DEFINITE_PREDICTIONS,
        ),
      ).toBe(true);
    }
  });

  it("rejects bounded assertive predictions for health, fertility, and lottery", () => {
    const assertiveSamples = [
      "Bạn sẽ mắc bệnh hiểm nghèo.",
      "Bạn sẽ mang thai trong năm nay.",
      "Bạn sẽ sinh con trai đầu lòng.",
      "Bạn sẽ trúng lớn vào tháng sau.",
      "Bạn sẽ trúng số độc đắc.",
      "You will get sick next month.",
      "You will fall ill soon.",
      "You will become pregnant this year.",
      "You will give birth to a boy.",
      "You will win the lottery soon.",
      "You will win big tomorrow.",
    ];

    for (const sample of assertiveSamples) {
      const violations = scanContentForProhibitedPatterns("prediction.tsx", sample);
      expect(
        violations.some(
          (v: any) => v.category === PROHIBITED_CATEGORIES.DEFINITE_PREDICTIONS,
        ),
      ).toBe(true);
    }
  });

  it("allows non-fatalistic disclaimers and explicit negations", () => {
    const allowed = [
      "Nội dung này không dự báo chắc chắn, không chẩn đoán và không thay thế tư vấn chuyên môn.",
      "Không hứa chắc về những gì chưa xảy ra.",
      "Hệ thống không khẳng định bạn sẽ mắc bệnh hay sinh con trai.",
      "This system does not predict or guarantee health outcomes.",
    ];

    for (const line of allowed) {
      expect(scanContentForProhibitedPatterns("sources.mdx", line)).toEqual([]);
    }
  });
});

describe("scanContentForProhibitedPatterns - Category 5: Crossed-out Price Markup and Styles", () => {
  it("rejects crossed-out price markups and line-through styles", () => {
    const samples = [
      '<span className="line-through text-muted">199.000đ</span>',
      '<div style={{ textDecoration: "line-through" }}>990 Lá</div>',
      "<p style='text-decoration: line-through'>79.000 VND</p>",
      "<del>199.000đ</del><span>99.000đ</span>",
      "<s>599.000 VND</s> 249.000 VND",
      "<strike>1.000 Lá</strike>",
      "Giá gốc: 200.000đ chỉ còn 99.000đ hôm nay!",
      "Giá cũ: 100k giá mới 50k",
      "Original price $99 now only $49",
    ];

    for (const sample of samples) {
      const violations = scanContentForProhibitedPatterns("checkout.tsx", sample);
      expect(
        violations.some(
          (v: any) => v.category === PROHIBITED_CATEGORIES.CROSSED_OUT_PRICE,
        ),
      ).toBe(true);
    }
  });

  it("detects line-through style inside CSS content", () => {
    const cssSample = ".old-price { text-decoration: line-through; }";
    const violations = scanContentForProhibitedPatterns("styles.css", cssSample);
    expect(
      violations.some(
        (v: any) => v.category === PROHIBITED_CATEGORIES.CROSSED_OUT_PRICE,
      ),
    ).toBe(true);
  });

  it("allows normal text decoration styles", () => {
    const allowed = [
      '<a style="text-decoration: underline" href="/link">Xem chi tiết</a>',
      '<span className="text-decoration-none">Tiêu đề</span>',
      ".nav-link { text-decoration: none; }",
    ];

    for (const line of allowed) {
      expect(scanContentForProhibitedPatterns("page.tsx", line)).toEqual([]);
    }
  });
});

describe("scanContentForProhibitedPatterns - Category 6: Fake Marketing Countdown and Scarcity", () => {
  it("rejects false scarcity and fake marketing countdowns", () => {
    const samples = [
      "Chỉ còn 3 suất đăng ký duy nhất!",
      "Chỉ còn duy nhất 5 tài khoản hôm nay.",
      "Ưu đãi đặc biệt duy nhất hôm nay!",
      "Ưu đãi kết thúc sau: 14:59",
      "Nhanh tay kẻo lỡ cơ hội đổi vận!",
      "Only 2 spots left at this price!",
      "Hurry before it's gone!",
      "Special offer ends in: 00:15:00",
    ];

    for (const sample of samples) {
      const violations = scanContentForProhibitedPatterns("offer.tsx", sample);
      expect(
        violations.some(
          (v: any) => v.category === PROHIBITED_CATEGORIES.FAKE_SCARCITY_COUNTDOWN,
        ),
      ).toBe(true);
    }
  });

  it("rejects fake scarcity on the same line as real timer variables (no line suppression)", () => {
    const bypassAttempt = "const remainingTime = x; Only 2 spots left.";
    const violations = scanContentForProhibitedPatterns("checkout.tsx", bypassAttempt);
    expect(
      violations.some(
        (v: any) => v.category === PROHIBITED_CATEGORIES.FAKE_SCARCITY_COUNTDOWN,
      ),
    ).toBe(true);
  });

  it("allows real VietQR server expiry countdown and legitimate upgrade credit window", () => {
    const allowed = [
      'const remainingTime = formatCheckoutRemainingTime(instructions.expiresAt);',
      '<time dateTime={instructions.expiresAt}>{remainingTime}</time>',
      'const expiresAtLabel = labels.expiresAtLabel ?? (isVi ? "Còn hiệu lực đến" : "Valid until");',
      'const expiredTitle = labels.expiredTitle ?? (isVi ? "Đơn hàng đã hết hạn thanh toán" : "Order expired");',
      'expect(html).toContain("Đơn hàng đã hết hạn thanh toán");',
      'Ưu đãi nâng cấp áp dụng đến: {formatDate(upgradeDeadline)}',
      'labels.upgradeCreditDeadline ?? (isVi ? "Hạn mức ưu đãi" : "Credit deadline");',
      'vi: "Nâng cấp — chỉ còn 60.000 ₫"',
    ];

    for (const line of allowed) {
      expect(scanContentForProhibitedPatterns("vietqr-checkout.tsx", line)).toEqual([]);
    }
  });
});

describe("scanContentForProhibitedPatterns - Unapproved Invoice Line Wording", () => {
  it("rejects the unapproved Vietnamese and English invoice line wording", () => {
    const registry = JSON.parse(
      readFileSync(resolve("config/claims.json"), "utf8"),
    );
    const invoiceDraft = registry.claims.find(
      (claim: any) => claim.id === "la-invoice-wording-draft",
    );
    const samples = [
      "Hoá đơn được xuất ngay khi giao dịch nạp Lá được xác nhận, ghi rõ là tín dụng dịch vụ Lá.",
      "An invoice is issued the moment a top-up is confirmed, line-itemed as a La service credit.",
      invoiceDraft.wording.vi,
      invoiceDraft.wording.en,
      "Hóa đơn\nđược xuất ngay khi giao dịch nạp Lá được xác nhận,\nghi rõ là dịch vụ nạp điểm Lá.",
      "An invoice is issued when a top - up is confirmed and line - itemed as La service credits.",
    ];

    for (const sample of samples) {
      const violations = scanContentForProhibitedPatterns("terms.mdx", sample);
      expect(
        violations.some(
          (v: any) =>
            v.category === PROHIBITED_CATEGORIES.UNAPPROVED_INVOICE_LINE_WORDING,
        ),
      ).toBe(true);
    }
  });

  it("allows generic approved descriptions of La as a service credit", () => {
    const allowed = [
      "Lá là một loại tín dụng dịch vụ dùng để mở nội dung.",
      "La is a non-transferable service credit spent to unlock content.",
    ];

    for (const sample of allowed) {
      expect(scanContentForProhibitedPatterns("terms.mdx", sample)).toEqual([]);
    }
  });

  it("keeps canonical Terms free of the unapproved invoice line wording", () => {
    for (const filePath of [
      "content/public/vi/pages/terms.mdx",
      "content/public/en/pages/terms.mdx",
    ]) {
      const content = readFileSync(resolve(filePath), "utf8");
      const violations = scanContentForProhibitedPatterns(filePath, content);
      expect(
        violations.some(
          (v: any) =>
            v.category === PROHIBITED_CATEGORIES.UNAPPROVED_INVOICE_LINE_WORDING,
        ),
      ).toBe(false);
    }
  });
});

describe("scanContentForProhibitedPatterns - Split Text across JSX/newlines", () => {
  it("detects human review phrase split across JSX and newlines", () => {
    const splitJsx = "<p>\n  Reviewed by\n  our team\n</p>";
    const violations = scanContentForProhibitedPatterns("page.tsx", splitJsx);
    expect(
      violations.some(
        (v: any) => v.category === PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW,
      ),
    ).toBe(true);
    expect(violations[0].line).toBe(2);
  });

  it("detects fake scarcity phrase split across JSX and newlines", () => {
    const splitJsx = "<span>\n  Only 2\n  spots left\n</span>";
    const violations = scanContentForProhibitedPatterns("checkout.tsx", splitJsx);
    expect(
      violations.some(
        (v: any) => v.category === PROHIBITED_CATEGORIES.FAKE_SCARCITY_COUNTDOWN,
      ),
    ).toBe(true);
    expect(violations[0].line).toBe(2);
  });

  it("detects scientific proof phrase split across JSX and newlines", () => {
    const splitJsx = "<p>\n  Scientifically\n  proven\n</p>";
    const violations = scanContentForProhibitedPatterns("method.tsx", splitJsx);
    expect(
      violations.some(
        (v: any) => v.category === PROHIBITED_CATEGORIES.ABSOLUTE_ACCURACY_OR_SCIENCE,
      ),
    ).toBe(true);
    expect(violations[0].line).toBe(2);
  });
});

describe("File Collection & Clean Repository Scan", () => {
  it("includes .css files under apps/web/src in customer-facing collection", () => {
    const files = collectCustomerFacingFiles(resolve("."));
    const cssFiles = files.filter((f: string) => f.endsWith(".css"));
    expect(cssFiles.length).toBeGreaterThan(0);
    expect(cssFiles.some((f: string) => f.includes("vietqr-checkout.css"))).toBe(true);
  });

  it("passes clean repository scan with 0 violations", () => {
    const violations = scanCustomerFacingFiles(resolve("."));
    expect(violations).toEqual([]);
  });

  it("fails closed when reading a customer-facing file fails", () => {
    const mockFailingReadFile = (filePath: string) => {
      throw new Error(`Permission denied: ${filePath}`);
    };
    expect(() =>
      scanCustomerFacingFiles(resolve("."), mockFailingReadFile as any),
    ).toThrowError(/PUBLIC_CLAIM_SCAN_FAILED/);
  });

  it("fails closed when reading a customer-facing directory fails", () => {
    const mockFailingReaddir = (dirPath: string) => {
      throw new Error(`Permission denied: ${dirPath}`);
    };
    expect(() =>
      collectCustomerFacingFiles(resolve("."), { readdirSync: mockFailingReaddir as any }),
    ).toThrowError(/PUBLIC_CLAIM_SCAN_FAILED/);
    expect(() =>
      scanCustomerFacingFiles(resolve("."), { readdirSync: mockFailingReaddir as any }),
    ).toThrowError(/PUBLIC_CLAIM_SCAN_FAILED/);
  });

  it("fails closed when statSync on a customer-facing path fails", () => {
    const mockFailingStat = (filePath: string) => {
      throw new Error(`EACCES: ${filePath}`);
    };
    expect(() =>
      collectCustomerFacingFiles(resolve("."), { statSync: mockFailingStat as any }),
    ).toThrowError(/PUBLIC_CLAIM_SCAN_FAILED/);
    expect(() =>
      scanCustomerFacingFiles(resolve("."), { statSync: mockFailingStat as any }),
    ).toThrowError(/PUBLIC_CLAIM_SCAN_FAILED/);
  });

  it("fails closed when required customer-facing roots are missing", () => {
    const missingRootDir = resolve("non-existent-customer-facing-root-dir");
    expect(() => collectCustomerFacingFiles(missingRootDir)).toThrowError(/PUBLIC_CLAIM_SCAN_FAILED/);
    expect(() => scanCustomerFacingFiles(missingRootDir)).toThrowError(/PUBLIC_CLAIM_SCAN_FAILED/);
  });

  it("fails closed on an external directory symlink before scanning outside content", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "lsv-scan-dir-symlink-"));
    try {
      const repoRoot = join(tempDir, "repo");
      const outsideDir = join(tempDir, "outside");
      mkdirSync(join(repoRoot, "content", "public"), { recursive: true });
      mkdirSync(join(repoRoot, "apps", "web", "messages"), { recursive: true });
      mkdirSync(join(repoRoot, "apps", "web", "src"), { recursive: true });
      mkdirSync(outsideDir, { recursive: true });
      writeFileSync(join(outsideDir, "outside.mdx"), "Reviewed content.", "utf8");
      symlinkSync(outsideDir, join(repoRoot, "content", "public", "escaped"));

      let reads = 0;
      expect(() =>
        scanCustomerFacingFiles(repoRoot, () => {
          reads++;
          return "";
        }),
      ).toThrowError(/PUBLIC_CLAIM_SCAN_FAILED.*escapes canonical repository root/);
      expect(reads).toBe(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails closed on an external file symlink before reading outside content", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "lsv-scan-file-symlink-"));
    try {
      const repoRoot = join(tempDir, "repo");
      const outsideDir = join(tempDir, "outside");
      mkdirSync(join(repoRoot, "content", "public"), { recursive: true });
      mkdirSync(join(repoRoot, "apps", "web", "messages"), { recursive: true });
      mkdirSync(join(repoRoot, "apps", "web", "src"), { recursive: true });
      mkdirSync(outsideDir, { recursive: true });
      const outsideFile = join(outsideDir, "outside.mdx");
      writeFileSync(outsideFile, "Reviewed content.", "utf8");
      symlinkSync(outsideFile, join(repoRoot, "content", "public", "escaped.mdx"));

      let reads = 0;
      expect(() =>
        scanCustomerFacingFiles(repoRoot, () => {
          reads++;
          return "";
        }),
      ).toThrowError(/PUBLIC_CLAIM_SCAN_FAILED.*escapes canonical repository root/);
      expect(reads).toBe(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("CRLF and LF Normalization", () => {
  it("processes CRLF and LF text identically", () => {
    const violationTextLF = "Tiêu đề\nNội dung đã được xem xét.\nChân trang\n";
    const violationTextCRLF = "Tiêu đề\r\nNội dung đã được xem xét.\r\nChân trang\r\n";

    const resLF = scanContentForProhibitedPatterns("file.txt", violationTextLF);
    const resCRLF = scanContentForProhibitedPatterns("file.txt", violationTextCRLF);

    expect(resLF.length).toBe(1);
    expect(resCRLF.length).toBe(1);
    expect(resLF[0].line).toBe(2);
    expect(resCRLF[0].line).toBe(2);
    expect(resLF[0].category).toBe(resCRLF[0].category);
  });
});
