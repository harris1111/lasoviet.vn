export { linkAnonymousActorToAccount } from "./identity/identity.module.js";
export type {
  AnonymousLinkErrorCode,
  AnonymousLinkResult,
} from "./identity/identity.module.js";

export {
  createAuthEmailDeliveryService,
  createDatabaseAuthEmailDeliveryStore,
} from "./notifications/auth-email.js";
export type {
  AuthEmailDeliveryOutcome,
  AuthEmailDeliveryRecord,
  AuthEmailDeliveryServiceOptions,
  AuthEmailDeliveryStore,
  NewAuthEmailDelivery,
  NotificationDeliveryStatus,
} from "./notifications/auth-email.js";
export type {
  EmailMessage,
  EmailProvider,
  EmailProviderResult,
} from "./notifications/email-provider.js";
export { createSmtpEmailAdapter } from "./notifications/smtp-email-adapter.js";
export type { SmtpEmailSettings } from "./notifications/smtp-email-adapter.js";

export {
  createDatabaseConsentRepository,
} from "./consent/consent.repository.js";
export type {
  ConsentRepository,
  RecordConsentInput,
} from "./consent/consent.repository.js";
export { createConsentService } from "./consent/consent.service.js";
export type {
  ConsentDocumentVersions,
  ConsentErrorCode,
  ConsentServiceOptions,
} from "./consent/consent.service.js";

export {
  createDatabaseDeletionRepository,
} from "./privacy/deletion.repository.js";
export type {
  DeletionRepository,
  DeletionRepositoryError,
  DeletionRequestInput,
} from "./privacy/deletion.repository.js";
export { createAccountDeletionService } from "./privacy/deletion.service.js";
export type { AccountDeletionServiceOptions } from "./privacy/deletion.service.js";

export {
  createDatabaseAnonymousRetentionRepository,
} from "./privacy/anonymous-retention.repository.js";
export {
  createAnonymousRetentionService,
} from "./privacy/anonymous-retention.service.js";
export type {
  AnonymousRetentionError,
  AnonymousRetentionRepository,
} from "./privacy/anonymous-retention.service.js";
