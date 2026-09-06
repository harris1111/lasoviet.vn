import "server-only";

import {
  ReportViewV1Schema,
  type ReportViewV1,
  type Result,
} from "@lasoviet/contracts";

import {
  PrivateApiClientError,
  privateApiClient,
} from "../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../auth/resolve-current-actor";

export type ReportLoaderError =
  | "REPORT_AUTH_REQUIRED"
  | "REPORT_NOT_FOUND";

export type ReportLoader = {
  loadReport(
    reportId: string,
  ): Promise<Result<ReportViewV1, ReportLoaderError>>;
};

export function createReportLoader(dependencies: {
  resolveVerifiedAccountActor: typeof resolveVerifiedAccountActor;
  privateApiClient: typeof privateApiClient;
}): ReportLoader {
  return {
    async loadReport(
      reportId: string,
    ): Promise<Result<ReportViewV1, ReportLoaderError>> {
      let actor;
      try {
        actor = await dependencies.resolveVerifiedAccountActor();
      } catch (error) {
        if (error instanceof VerifiedAccountResolutionError) {
          return {
            ok: false,
            error: {
              code: "REPORT_AUTH_REQUIRED",
              messageKey: "reports.auth_required",
              retryable: false,
            },
          };
        }
        throw error;
      }

      const client = dependencies.privateApiClient(actor, actor.requestId);
      let response: unknown;
      try {
        response = await client.request<unknown>(
          `/reports/${encodeURIComponent(reportId)}`,
        );
      } catch (error) {
        if (
          error instanceof PrivateApiClientError &&
          error.code === "REPORT_NOT_FOUND"
        ) {
          return {
            ok: false,
            error: {
              code: "REPORT_NOT_FOUND",
              messageKey: "reports.report_not_found",
              retryable: false,
            },
          };
        }
        throw error;
      }

      if (
        typeof response !== "object" ||
        response === null ||
        !("ok" in response)
      ) {
        throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
      }

      const result = response as Result<unknown, string>;
      if (!result.ok) {
        if (result.error?.code === "REPORT_NOT_FOUND") {
          return {
            ok: false,
            error: {
              code: "REPORT_NOT_FOUND",
              messageKey: result.error.messageKey ?? "reports.report_not_found",
              retryable: false,
            },
          };
        }
        throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
      }

      const parsed = ReportViewV1Schema.safeParse(result.value);
      if (!parsed.success) {
        throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
      }

      return {
        ok: true,
        value: parsed.data,
      };
    },
  };
}

export const reportLoader: ReportLoader = createReportLoader({
  resolveVerifiedAccountActor,
  privateApiClient,
});
