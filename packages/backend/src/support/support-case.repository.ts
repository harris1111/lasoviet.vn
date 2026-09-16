import { supportCases, type Database } from "@lasoviet/database";

export type SupportCaseInsert = {
  reportId: string;
  reportVersionId: string;
  assetId: string;
  failureStage: "pdf" | "garage";
  errorCode: string;
};

export function createSupportCaseRepository() {
  return {
    async insert(transaction: Database, input: SupportCaseInsert): Promise<string> {
      const [created] = await transaction.insert(supportCases).values(input).returning({ id: supportCases.id });
      if (!created) throw new Error("SUPPORT_CASE_INSERT_FAILED");
      return created.id;
    },
  };
}
