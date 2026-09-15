import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";

export const ALLOWED_TOPICS = [
  "privacy",
  "payment",
  "la",
  "upgrade_refund",
  "ai_content",
];

export const ALLOWED_APPROVAL_STATES = [
  "approved",
  "draft_legal",
  "draft_finance",
  "draft_privacy",
];

export const ALLOWED_PLACEMENT_STATES = ["active", "planned"];

const REQUIRED_CLAIM_FIELDS = [
  "id",
  "topic",
  "approvalState",
  "publishable",
  "wording",
  "authorities",
  "placements",
];

const ALLOWED_CLAIM_KEYS = new Set(REQUIRED_CLAIM_FIELDS);
const ALLOWED_PLACEMENT_KEYS = new Set([
  "routeId",
  "sourcePath",
  "path",
  "state",
  "sourceExcerpts",
]);

function normalizeEvidenceText(value) {
  return value.replace(/\r\n?/g, "\n").normalize("NFC");
}

export function validateClaimRegistry(
  registry,
  validRouteIds = null,
  rootDir = process.cwd(),
) {
  const errors = [];

  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    return { valid: false, errors: ["Registry must be a JSON object"] };
  }

  if (registry.schemaVersion !== 1) {
    errors.push(
      `Invalid schemaVersion: expected 1, received ${registry.schemaVersion}`,
    );
  }

  if (!Array.isArray(registry.claims) || registry.claims.length === 0) {
    errors.push("Registry must contain a non-empty claims array");
    return { valid: false, errors };
  }

  const seenIds = new Set();
  const validRouteIdSet =
    validRouteIds instanceof Set
      ? validRouteIds
      : Array.isArray(validRouteIds)
        ? new Set(validRouteIds)
        : null;

  let realRootDir;
  try {
    realRootDir = existsSync(rootDir) ? realpathSync(resolve(rootDir)) : resolve(rootDir);
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to resolve repository root "${rootDir}": ${err.message}`],
    };
  }

  for (let i = 0; i < registry.claims.length; i++) {
    const claim = registry.claims[i];
    const claimRef = claim?.id ? `Claim "${claim.id}"` : `Claim at index ${i}`;

    if (!claim || typeof claim !== "object" || Array.isArray(claim)) {
      errors.push(`${claimRef} is not a valid object`);
      continue;
    }

    for (const field of REQUIRED_CLAIM_FIELDS) {
      if (claim[field] === undefined) {
        errors.push(`${claimRef} is missing required field "${field}"`);
      }
    }

    for (const key of Object.keys(claim)) {
      if (!ALLOWED_CLAIM_KEYS.has(key)) {
        errors.push(`${claimRef} has unknown field "${key}"`);
      }
    }

    if (!claim.id || typeof claim.id !== "string" || !/^[a-z0-9_.-]+$/i.test(claim.id)) {
      errors.push(`${claimRef} must have a valid stable string id`);
    } else if (seenIds.has(claim.id)) {
      errors.push(`Duplicate claim id: "${claim.id}"`);
    } else {
      seenIds.add(claim.id);
    }

    if (!ALLOWED_TOPICS.includes(claim.topic)) {
      errors.push(
        `${claimRef} has invalid topic "${claim.topic}". Allowed: ${ALLOWED_TOPICS.join(", ")}`,
      );
    }

    if (!ALLOWED_APPROVAL_STATES.includes(claim.approvalState)) {
      errors.push(
        `${claimRef} has invalid approvalState "${claim.approvalState}". Allowed: ${ALLOWED_APPROVAL_STATES.join(", ")}`,
      );
    }

    if (typeof claim.publishable !== "boolean") {
      errors.push(`${claimRef} publishable must be a boolean`);
    } else if (claim.approvalState === "approved" && claim.publishable !== true) {
      errors.push(
        `${claimRef} with approvalState "approved" must have publishable set to true`,
      );
    } else if (
      claim.approvalState &&
      claim.approvalState !== "approved" &&
      claim.publishable !== false
    ) {
      errors.push(
        `${claimRef} with draft approvalState "${claim.approvalState}" must have publishable set to false`,
      );
    }

    if (!claim.wording || typeof claim.wording !== "object" || Array.isArray(claim.wording)) {
      errors.push(`${claimRef} must have a wording object`);
    } else {
      const vi = typeof claim.wording.vi === "string" ? claim.wording.vi.trim() : "";
      const en = typeof claim.wording.en === "string" ? claim.wording.en.trim() : "";
      if (!vi) {
        errors.push(`${claimRef} lacks Vietnamese wording (wording.vi)`);
      }
      if (!en) {
        errors.push(`${claimRef} lacks English wording (wording.en)`);
      }
    }

    if (
      !Array.isArray(claim.authorities) ||
      claim.authorities.length === 0 ||
      claim.authorities.some((a) => typeof a !== "string" || !a.trim())
    ) {
      errors.push(`${claimRef} must have a non-empty authorities array`);
    }

    if (!Array.isArray(claim.placements) || claim.placements.length === 0) {
      errors.push(`${claimRef} must have a non-empty placements array`);
      continue;
    }

    for (let pIdx = 0; pIdx < claim.placements.length; pIdx++) {
      const placement = claim.placements[pIdx];
      const pRef = `${claimRef} placement ${pIdx}`;

      if (!placement || typeof placement !== "object" || Array.isArray(placement)) {
        errors.push(`${pRef} is not an object`);
        continue;
      }

      for (const key of Object.keys(placement)) {
        if (!ALLOWED_PLACEMENT_KEYS.has(key)) {
          errors.push(`${pRef} has unknown field "${key}"`);
        }
      }

      if (!ALLOWED_PLACEMENT_STATES.includes(placement.state)) {
        errors.push(
          `${pRef} has invalid state "${placement.state}". Allowed: ${ALLOWED_PLACEMENT_STATES.join(", ")}`,
        );
      }

      if (placement.state === "active" && claim.approvalState !== "approved") {
        errors.push(
          `${pRef} cannot be active while ${claimRef} has non-approved approvalState "${claim.approvalState}"`,
        );
      }

      if (
        !placement.routeId ||
        typeof placement.routeId !== "string" ||
        !placement.routeId.trim()
      ) {
        errors.push(`${pRef} lacks valid routeId`);
      }

      const sourcePath = placement.sourcePath ?? placement.path;
      if (!sourcePath || typeof sourcePath !== "string" || !sourcePath.trim()) {
        errors.push(`${pRef} lacks sourcePath`);
        continue;
      }

      const isAbsoluteTarget =
        isAbsolute(sourcePath) ||
        sourcePath.startsWith("/") ||
        sourcePath.startsWith("\\") ||
        /^[a-zA-Z]:/.test(sourcePath);

      if (isAbsoluteTarget) {
        errors.push(
          `${pRef} sourcePath contains path traversal or absolute root: "${sourcePath}"`,
        );
        continue;
      }

      const resolvedTarget = resolve(realRootDir, sourcePath);
      const relFromRoot = relative(realRootDir, resolvedTarget);

      if (
        isAbsolute(relFromRoot) ||
        relFromRoot === ".." ||
        relFromRoot.startsWith("../") ||
        relFromRoot.startsWith("..\\")
      ) {
        errors.push(
          `${pRef} sourcePath escapes repository root: "${sourcePath}"`,
        );
        continue;
      }

      if (placement.state === "active") {
        if (
          !Array.isArray(placement.sourceExcerpts) ||
          placement.sourceExcerpts.length === 0 ||
          placement.sourceExcerpts.some(
            (excerpt) => typeof excerpt !== "string" || !excerpt.trim(),
          )
        ) {
          errors.push(
            `${pRef} active placement must have a non-empty sourceExcerpts array of non-empty strings`,
          );
        }

        if (validRouteIdSet && !validRouteIdSet.has(placement.routeId)) {
          errors.push(
            `${pRef} active routeId "${placement.routeId}" does not exist in route registry`,
          );
        }

        if (!existsSync(resolvedTarget)) {
          errors.push(
            `${pRef} active sourcePath does not exist on disk: "${sourcePath}"`,
          );
          continue;
        }

        let realTarget;
        try {
          realTarget = realpathSync(resolvedTarget);
        } catch (err) {
          errors.push(
            `${pRef} active sourcePath realpath failed: "${sourcePath}" (${err.message})`,
          );
          continue;
        }

        const relFromRealRoot = relative(realRootDir, realTarget);
        if (
          isAbsolute(relFromRealRoot) ||
          relFromRealRoot === ".." ||
          relFromRealRoot.startsWith("../") ||
          relFromRealRoot.startsWith("..\\")
        ) {
          errors.push(
            `${pRef} active sourcePath escapes repository root via symlink: "${sourcePath}"`,
          );
          continue;
        }

        let normalizedSource;
        try {
          normalizedSource = normalizeEvidenceText(readFileSync(realTarget, "utf8"));
        } catch (err) {
          errors.push(
            `${pRef} active sourcePath could not be read for evidence validation: "${sourcePath}" (${err.message})`,
          );
          continue;
        }

        if (Array.isArray(placement.sourceExcerpts)) {
          for (let eIdx = 0; eIdx < placement.sourceExcerpts.length; eIdx++) {
            const excerpt = placement.sourceExcerpts[eIdx];
            if (typeof excerpt !== "string" || !excerpt.trim()) continue;
            const normalizedExcerpt = normalizeEvidenceText(excerpt);
            if (!normalizedSource.includes(normalizedExcerpt)) {
              errors.push(
                `${pRef} sourceExcerpts[${eIdx}] is stale or absent from "${sourcePath}"`,
              );
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const PROHIBITED_CATEGORIES = {
  FALSE_HUMAN_REVIEW: "false_human_review",
  ABSOLUTE_ACCURACY_OR_SCIENCE: "absolute_accuracy_or_science",
  ABSOLUTE_NO_THIRD_PARTY: "absolute_no_third_party",
  DEFINITE_PREDICTIONS: "definite_predictions",
  CROSSED_OUT_PRICE: "crossed_out_price",
  FAKE_SCARCITY_COUNTDOWN: "fake_scarcity_countdown",
  UNAPPROVED_INVOICE_LINE_WORDING: "unapproved_invoice_line_wording",
};

export const PROHIBITED_RULES = [
  {
    category: PROHIBITED_CATEGORIES.FALSE_HUMAN_REVIEW,
    description: "False human, expert, or team review claim",
    matches: [
      /(?:đội\s+ngũ|chúng\s+tôi|chuyên\s+gia)[\s\S]{0,80}?(?:xem\s+xét|kiểm\s+duyệt|kiểm\s+chứng|thẩm\s+định)\s+trước\s+khi\s+công\s+bố/iu,
      /nội\s+dung\s+(?:đã\s+)?được\s+xem\s+xét/iu,
      /reviewed\s+content/iu,
      /human\s+reviewer/iu,
      /(?<!(?:chưa|không)(?:\s+từng)?\s+)(?:được\s+đội\s+ngũ|đội\s+ngũ)[\s\S]{0,40}?xem\s+xét/iu,
      /chuyên\s+gia\s+tử\s+vi\s+(?:xem\s+xét|luận\s+giải|duyệt)/iu,
      /(?<!(?:chưa|không)(?:\s+từng)?\s+)(?:(?:đã\s+)?được|do|bởi)\s+(?:chuyên\s+gia|đội\s+ngũ)[\s\S]{0,40}?(?:xem\s+xét|kiểm\s+duyệt|thẩm\s+định|xác\s+nhận|rà\s+soát|duyệt)/iu,
      /(?<!(?:chưa|không)(?:\s+từng)?\s+)(?:được\s+đội\s+ngũ|đội\s+ngũ)[\s\S]{0,40}?(?:xem\s+xét|kiểm\s+duyệt|thẩm\s+định)/iu,
      /reviewed\s+by\s+(?:our\s+|the\s+)?(?:team|experts?)/iu,
      /expert\s+reviewed/iu,
    ],
  },
  {
    category: PROHIBITED_CATEGORIES.ABSOLUTE_ACCURACY_OR_SCIENCE,
    description: "Absolute accuracy or scientific proof claim",
    matches: [
      /chính\s+xác\s+100%|100%\s+chính\s+xác|100%\s+accurate|perfect\s+accuracy/iu,
      /(?<!không\s+cam\s+kết\s+tính\s+)(?:được\s+)?khoa\s+học\s+(?:đã\s+)?chứng\s+minh|chứng\s+minh\s+(?:bằng\s+)?khoa\s+học|cơ\s+sở\s+khoa\s+học\s+chứng\s+minh|scientifically\s+proven|proven\s+(?:by\s+science|scientifically)|scientific\s+proof/iu,
      /(?<!(?:không|chưa)[^\n.,;!?]{0,40}?)(?:(?:độ\s+)?chính\s+xác\s+tuyệt\s+đối|chuẩn\s+xác\s+tuyệt\s+đối|cam\s+kết\s+(?:chính|chuẩn)\s+xác|hoàn\s+toàn\s+(?:chính|chuẩn)\s+xác|absolute\s+accuracy|guaranteed\s+accuracy)/iu,
    ],
  },
  {
    category: PROHIBITED_CATEGORIES.ABSOLUTE_NO_THIRD_PARTY,
    description: "Absolute no-third-party sharing claim",
    matches: [
      /(?:tuyệt\s+đối\s+không|không\s+bao\s+giờ|cam\s+kết\s+không|hoàn\s+toàn\s+không)\s+chia\s+sẻ.*bên\s+thứ\s+ba/iu,
      /không\s+chia\s+sẻ\s+(?!dữ\s+liệu\s+(?:ngày\s+giờ\s+)?sinh).*(?:với|cho)\s+(?:bất\s+kỳ\s+)?bên\s+thứ\s+ba/iu,
      /không\s+(?:tiết\s+lộ|cung\s+cấp)\s+(?:thông\s+tin|dữ\s+liệu).*(?:cho|với)\s+(?:bất\s+kỳ\s+)?bên\s+thứ\s+ba/iu,
      /(?:never|do\s+not|will\s+not)\s+share\s+(?:your\s+)?(?:data|information|personal\s+data|personal\s+information)?.*(?:with\s+)?(?:any\s+)?third\s+part(?:y|ies)/iu,
      /no\s+(?:personal\s+)?(?:data|information)\s+is\s+shared\s+with\s+third\s+parties/iu,
      /(?:third\s+parties?|bên\s+thứ\s+ba)\s+(?:never|do\s+not|will\s+not|không\s+bao\s+giờ|không)\s+(?:receive|nhận)\s+(?!any\s+exact\s+birth|exact\s+birth|dữ\s+liệu\s+(?:ngày\s+giờ\s+)?sinh|họ\s+tên|ngày\s+giờ\s+sinh)(?:any\s+|bất\s+kỳ\s+)?(?:customer\s+|user\s+|personal\s+)?(?:data|information|thông\s+tin|dữ\s+liệu)/iu,
      /(?:we\s+)?never\s+disclose.*third\s+part(?:y|ies)/iu,
    ],
  },
  {
    category: PROHIBITED_CATEGORIES.DEFINITE_PREDICTIONS,
    description: "Definite health, fertility, fatality, or lottery prediction",
    matches: [
      /chắc\s+chắn\s+(?:sẽ\s+)?(?:trúng\s+số|phát\s+tài|sinh\s+con\s+(?:trai|gái)|khỏi\s+bệnh|gặp\s+tai\s+nạn|chết)/iu,
      /cam\s+kết\s+(?:trúng\s+số|khỏi\s+bệnh|chữa\s+khỏi)/iu,
      /khắc\s+chết/iu,
      /guaranteed\s+(?:jackpot|lottery|cure|healing)/iu,
      /(?<!(?:không|chưa|never|not|does\s+not)[^\n.,;!?]{0,50}?)(?:bạn|người\s+này|gia\s+chủ)\s+sẽ\s+(?:mắc\s+bệnh|mang\s+thai|sinh\s+con\s+(?:trai|gái)|trúng\s+(?:lớn|số)|phát\s+tài|khỏi\s+bệnh)/iu,
      /(?<!(?:never|not|does\s+not)[^\n.,;!?]{0,50}?)(?:you|the\s+client)\s+will\s+(?:get\s+sick|fall\s+ill|contract\s+a\s+disease|become\s+pregnant|get\s+pregnant|give\s+birth\s+to\s+a\s+(?:boy|girl)|win\s+(?:the\s+lottery|big)|recover\s+from\s+illness)/iu,
    ],
  },
  {
    category: PROHIBITED_CATEGORIES.CROSSED_OUT_PRICE,
    description: "Crossed-out price markup or false price anchor style",
    matches: [
      /className=["'][^"']*\bline-through\b[^"']*["']/iu,
      /text-decoration\s*:\s*line-through/iu,
      /textDecoration:\s*["']line-through["']/iu,
      /<del>[^<]*<\/del>|<s>[^<]*<\/s>|<strike>[^<]*<\/strike>/iu,
      /giá\s+gốc\s*:\s*\d+.*chỉ\s+còn/iu,
      /giá\s+cũ\s*:\s*\d+.*giá\s+mới/iu,
      /original\s+price.*now\s+only/iu,
    ],
  },
  {
    category: PROHIBITED_CATEGORIES.FAKE_SCARCITY_COUNTDOWN,
    description: "Fabricated marketing countdown or false scarcity",
    matches: [
      /chỉ\s+còn\s+\d+\s+suất/iu,
      /chỉ\s+còn\s+duy\s+nhất\s+\d+/iu,
      /duy\s+nhất\s+hôm\s+nay/iu,
      /ưu\s+đãi\s+kết\s+thúc\s+sau\s*:/iu,
      /nhanh\s+tay\s+kẻo\s+lỡ/iu,
      /only\s+\d+\s+spots\s+left/iu,
      /hurry\s+before\s+it(?:\x27|’)?s\s+gone/iu,
      /offer\s+ends\s+in\s*:/iu,
    ],
  },
  {
    category: PROHIBITED_CATEGORIES.UNAPPROVED_INVOICE_LINE_WORDING,
    description: "Unapproved invoice line wording for La service credits",
    matches: [
      /h(?:óa|oá)\s+đơn(?:\s+điện\s+tử)?\s+được\s+xuất\s+(?:ngay\s+)?khi\s+(?:giao\s+dịch\s+)?nạp(?:\s+gói)?\s+lá\s+(?:được\s+xác\s+nhận|thành\s+công)[\s\S]{0,120}?(?:tín\s+dụng\s+dịch\s+vụ\s+lá|dịch\s+vụ\s+nạp\s+điểm\s+lá)/iu,
      /(?:an\s+invoice\s+is|electronic\s+invoices?\s+are)\s+issued[\s\S]{0,80}?top\s*-?\s*up(?:\s+pack)?\s+(?:is\s+)?(?:confirmed|confirmation)[\s\S]{0,120}?(?:line\s*-?\s*itemed\s+as\s+|describing\s+)?(?:a\s+)?la\s+service\s+credits?/iu,
    ],
  },
];

export function scanContentForProhibitedPatterns(filePath, content) {
  const violations = [];
  if (typeof content !== "string" || !content) return violations;

  const normalizedText = content.replace(/\r\n/g, "\n").normalize("NFC");
  const lines = normalizedText.split("\n");

  const seenKeys = new Set();
  function addViolation(category, description, line, matchText) {
    const cleanMatch = matchText.replace(/\s+/g, " ").trim();
    const key = `${filePath}:${line}:${category}:${cleanMatch.toLowerCase()}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    violations.push({
      category,
      description,
      line,
      match: cleanMatch,
      file: filePath,
    });
  }

  // 1. Line-by-line scan
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    for (const rule of PROHIBITED_RULES) {
      for (const pattern of rule.matches) {
        const match = line.match(pattern);
        if (match) {
          addViolation(rule.category, rule.description, lineIndex + 1, match[0]);
          break;
        }
      }
    }
  }

  // 2. Whole-document scan (for split phrases across JSX/newlines)
  const tagMaskedText = normalizedText.replace(/<[^>]+>/g, (tag) =>
    tag.replace(/[^\n]/g, " "),
  );

  for (const rule of PROHIBITED_RULES) {
    for (const pattern of rule.matches) {
      const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
      const globalRegex = new RegExp(pattern.source, flags);

      let m;
      while ((m = globalRegex.exec(tagMaskedText)) !== null) {
        if (m[0].length === 0) {
          globalRegex.lastIndex++;
          continue;
        }
        const matchIndex = m.index;
        const lineNumber = normalizedText.slice(0, matchIndex).split("\n").length;
        addViolation(rule.category, rule.description, lineNumber, m[0]);
      }
    }
  }

  return violations;
}

export function collectCustomerFacingFiles(
  rootDir = process.cwd(),
  deps = {},
) {
  const {
    readdirSync: _readdirSync = readdirSync,
    statSync: _statSync = statSync,
  } = deps;
  const resolvedRoot = resolve(rootDir);
  let realRoot;
  try {
    realRoot = realpathSync(resolvedRoot);
  } catch (err) {
    const scanErr = new Error(
      `PUBLIC_CLAIM_SCAN_FAILED: Failed to resolve repository root "${resolvedRoot}": ${err.message}`,
    );
    scanErr.name = "PUBLIC_CLAIM_SCAN_FAILED";
    scanErr.path = ".";
    throw scanErr;
  }
  const collected = [];

  function assertContainedRealPath(candidatePath) {
    const relPath =
      relative(resolvedRoot, candidatePath).replace(/\\/g, "/") || ".";
    let realCandidate;
    try {
      realCandidate = realpathSync(candidatePath);
    } catch (err) {
      const scanErr = new Error(
        `PUBLIC_CLAIM_SCAN_FAILED: Failed to resolve path "${relPath}": ${err.message}`,
      );
      scanErr.name = "PUBLIC_CLAIM_SCAN_FAILED";
      scanErr.path = relPath;
      throw scanErr;
    }

    const relFromRealRoot = relative(realRoot, realCandidate);
    if (
      isAbsolute(relFromRealRoot) ||
      relFromRealRoot === ".." ||
      relFromRealRoot.startsWith("../") ||
      relFromRealRoot.startsWith("..\\")
    ) {
      const scanErr = new Error(
        `PUBLIC_CLAIM_SCAN_FAILED: Path escapes canonical repository root via symlink: "${relPath}"`,
      );
      scanErr.name = "PUBLIC_CLAIM_SCAN_FAILED";
      scanErr.path = relPath;
      throw scanErr;
    }

    return realCandidate;
  }

  function walk(currentDir, allowedExts, shouldExclude) {
    assertContainedRealPath(currentDir);
    let entries;
    try {
      entries = _readdirSync(currentDir);
    } catch (err) {
      const relDir = relative(resolvedRoot, currentDir).replace(/\\/g, "/") || ".";
      const scanErr = new Error(
        `PUBLIC_CLAIM_SCAN_FAILED: Failed to read directory "${relDir}": ${err.message}`,
      );
      scanErr.name = "PUBLIC_CLAIM_SCAN_FAILED";
      scanErr.path = relDir;
      throw scanErr;
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      let stat;
      try {
        stat = _statSync(fullPath);
      } catch (err) {
        const relPath = relative(resolvedRoot, fullPath).replace(/\\/g, "/");
        const scanErr = new Error(
          `PUBLIC_CLAIM_SCAN_FAILED: Failed to stat path "${relPath}": ${err.message}`,
        );
        scanErr.name = "PUBLIC_CLAIM_SCAN_FAILED";
        scanErr.path = relPath;
        throw scanErr;
      }

      assertContainedRealPath(fullPath);

      if (stat.isDirectory()) {
        if (
          entry === "node_modules" ||
          entry === ".git" ||
          entry === "dist" ||
          entry === ".next" ||
          entry === "prototype" ||
          entry === "__tests__"
        ) {
          continue;
        }
        walk(fullPath, allowedExts, shouldExclude);
      } else if (allowedExts.includes(extname(entry))) {
        const relPath = relative(resolvedRoot, fullPath).replace(/\\/g, "/");
        if (!shouldExclude(relPath)) {
          collected.push(relPath);
        }
      }
    }
  }

  walk(
    join(resolvedRoot, "content", "public"),
    [".md", ".mdx", ".json"],
    () => false,
  );

  walk(
    join(resolvedRoot, "apps", "web", "messages"),
    [".json"],
    () => false,
  );

  walk(
    join(resolvedRoot, "apps", "web", "src"),
    [".ts", ".tsx", ".js", ".jsx", ".css"],
    (relPath) =>
      relPath.includes(".test.") ||
      relPath.includes(".spec."),
  );

  return collected;
}

export function scanCustomerFacingFiles(
  rootDir = process.cwd(),
  readFileOrDeps = readFileSync,
  deps = {},
) {
  let readFileFn = readFileSync;
  let customDeps = {};

  if (typeof readFileOrDeps === "function") {
    readFileFn = readFileOrDeps;
    customDeps = deps && typeof deps === "object" ? deps : {};
  } else if (readFileOrDeps && typeof readFileOrDeps === "object") {
    customDeps = readFileOrDeps;
    readFileFn = customDeps.readFileSync || customDeps.readFile || readFileSync;
  }

  const resolvedRoot = resolve(rootDir);
  let realRoot;
  try {
    realRoot = realpathSync(resolvedRoot);
  } catch (err) {
    const scanErr = new Error(
      `PUBLIC_CLAIM_SCAN_FAILED: Failed to resolve repository root "${resolvedRoot}": ${err.message}`,
    );
    scanErr.name = "PUBLIC_CLAIM_SCAN_FAILED";
    scanErr.path = ".";
    throw scanErr;
  }
  const files = collectCustomerFacingFiles(resolvedRoot, customDeps);
  const allViolations = [];

  for (const relPath of files) {
    const fullPath = resolve(resolvedRoot, relPath);
    let realFile;
    try {
      realFile = realpathSync(fullPath);
    } catch (err) {
      const scanErr = new Error(
        `PUBLIC_CLAIM_SCAN_FAILED: Failed to resolve customer-facing file "${relPath}": ${err.message}`,
      );
      scanErr.name = "PUBLIC_CLAIM_SCAN_FAILED";
      scanErr.path = relPath;
      throw scanErr;
    }
    const relFromRealRoot = relative(realRoot, realFile);
    if (
      isAbsolute(relFromRealRoot) ||
      relFromRealRoot === ".." ||
      relFromRealRoot.startsWith("../") ||
      relFromRealRoot.startsWith("..\\")
    ) {
      const scanErr = new Error(
        `PUBLIC_CLAIM_SCAN_FAILED: Customer-facing file escapes canonical repository root via symlink: "${relPath}"`,
      );
      scanErr.name = "PUBLIC_CLAIM_SCAN_FAILED";
      scanErr.path = relPath;
      throw scanErr;
    }
    let content;
    try {
      content = readFileFn(fullPath, "utf8");
    } catch (err) {
      const scanErr = new Error(
        `PUBLIC_CLAIM_SCAN_FAILED: Failed to read customer-facing file "${relPath}": ${err.message}`,
      );
      scanErr.name = "PUBLIC_CLAIM_SCAN_FAILED";
      scanErr.path = relPath;
      throw scanErr;
    }
    const fileViolations = scanContentForProhibitedPatterns(relPath, content);
    allViolations.push(...fileViolations);
  }

  return allViolations;
}
