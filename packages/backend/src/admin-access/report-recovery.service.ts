import {
  AdminReportRecoveryCommandV1Schema,
  AdminReportRecoveryContextV1Schema,
  type AdminReportRecoveryCommandV1,
  type AdminReportRecoveryContextV1,
  type AdminReportRecoverySuccessV1,
  type Result,
} from "@lasoviet/contracts";

export type ReportRecoveryError =
  | "REPORT_RECOVERY_FORBIDDEN"
  | "REPORT_RECOVERY_CONFLICT"
  | "REPORT_NOT_FOUND"
  | "REPORT_VERSION_CONFLICT"
  | "REPORT_TIMING_LINEAGE_INVALID";

export type ReportRecoveryCommand = {
  context: AdminReportRecoveryContextV1;
  reportVersionId: string;
  expectedStateVersion: number;
};

export type ReportRecoveryRepository = {
  recoverTransientFailure(
    command: ReportRecoveryCommand,
  ): Promise<Result<AdminReportRecoverySuccessV1, ReportRecoveryError>>;
  recoverInvalidOutputFailure(
    command: ReportRecoveryCommand,
  ): Promise<Result<AdminReportRecoverySuccessV1, ReportRecoveryError>>;
  restartInvalidOutputWithCurrentVersion(
    command: ReportRecoveryCommand,
  ): Promise<Result<AdminReportRecoverySuccessV1, ReportRecoveryError>>;
};

function failure(code: ReportRecoveryError): Result<never, ReportRecoveryError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `admin.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

export function createReportRecoveryService(options: {
  repository: ReportRecoveryRepository;
}) {
  return {
    async recoverTransientFailure(
      contextInput: AdminReportRecoveryContextV1,
      commandInput: AdminReportRecoveryCommandV1,
    ): Promise<Result<AdminReportRecoverySuccessV1, ReportRecoveryError>> {
      const context = AdminReportRecoveryContextV1Schema.safeParse(contextInput);
      const command = AdminReportRecoveryCommandV1Schema.safeParse(commandInput);
      if (
        !context.success ||
        !command.success ||
        context.data.idempotencyKey !== command.data.idempotencyKey ||
        context.data.reasonCode !== command.data.reasonCode
      ) {
        return failure("REPORT_RECOVERY_CONFLICT");
      }

      return options.repository.recoverTransientFailure({
        context: context.data,
        reportVersionId: command.data.reportVersionId,
        expectedStateVersion: command.data.expectedStateVersion,
      });
    },

    async recoverInvalidOutputFailure(
      contextInput: AdminReportRecoveryContextV1,
      commandInput: AdminReportRecoveryCommandV1,
    ): Promise<Result<AdminReportRecoverySuccessV1, ReportRecoveryError>> {
      const context = AdminReportRecoveryContextV1Schema.safeParse(contextInput);
      const command = AdminReportRecoveryCommandV1Schema.safeParse(commandInput);
      if (
        !context.success ||
        !command.success ||
        context.data.idempotencyKey !== command.data.idempotencyKey ||
        context.data.reasonCode !== command.data.reasonCode
      ) {
        return failure("REPORT_RECOVERY_CONFLICT");
      }

      return options.repository.recoverInvalidOutputFailure({
        context: context.data,
        reportVersionId: command.data.reportVersionId,
        expectedStateVersion: command.data.expectedStateVersion,
      });
    },

    async restartInvalidOutputWithCurrentVersion(
      contextInput: AdminReportRecoveryContextV1,
      commandInput: AdminReportRecoveryCommandV1,
    ): Promise<Result<AdminReportRecoverySuccessV1, ReportRecoveryError>> {
      const context = AdminReportRecoveryContextV1Schema.safeParse(contextInput);
      const command = AdminReportRecoveryCommandV1Schema.safeParse(commandInput);
      if (
        !context.success ||
        !command.success ||
        context.data.idempotencyKey !== command.data.idempotencyKey ||
        context.data.reasonCode !== command.data.reasonCode
      ) {
        return failure("REPORT_RECOVERY_CONFLICT");
      }

      return options.repository.restartInvalidOutputWithCurrentVersion({
        context: context.data,
        reportVersionId: command.data.reportVersionId,
        expectedStateVersion: command.data.expectedStateVersion,
      });
    },
  };
}
