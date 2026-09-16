import { ReportAssetFailureCodeSchema } from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";

import { createSupportCaseRepository, type SupportCaseInsert } from "./support-case.repository.js";

export function createSupportCaseService(
  repository = createSupportCaseRepository(),
) {
  return {
    async createTerminalCase(
      transaction: Database,
      input: SupportCaseInsert,
    ): Promise<string> {
      if (!input.reportId.trim() || !input.reportVersionId.trim() || !input.assetId.trim()) {
        throw new Error("SUPPORT_CASE_INVALID");
      }
      if (input.failureStage !== "pdf" && input.failureStage !== "garage") {
        throw new Error("SUPPORT_CASE_INVALID");
      }
      ReportAssetFailureCodeSchema.parse(input.errorCode);
      return repository.insert(transaction, input);
    },
  };
}
