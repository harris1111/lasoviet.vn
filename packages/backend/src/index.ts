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

export {
  createDatabaseBirthProfileRepository,
} from "./birth-profile/birth-profile.repository.js";
export type {
  BirthProfileRecord,
  BirthProfileRepository,
  BirthProfileWriteInput,
} from "./birth-profile/birth-profile.repository.js";
export {
  createBirthProfileService,
  normalizeBirthProfile,
  resolveZiweiTimeIndex,
} from "./birth-profile/birth-profile.service.js";

export {
  createPhaseOneMaintenanceRunner,
} from "./maintenance/phase-one-maintenance.js";
export type {
  PhaseOneMaintenanceRunner,
} from "./maintenance/phase-one-maintenance.js";
export type {
  BirthProfileNormalizationError,
  BirthProfileServiceError,
  BirthProfileServiceOptions,
  TimePrecisionError,
} from "./birth-profile/birth-profile.service.js";

export {
  createDatabaseZiweiCalculationRepository,
} from "./ziwei/ziwei.repository.js";
export type {
  AuthorizedZiweiRevision,
  CreateZiweiCalculationInput,
  ZiweiCalculationRepository,
} from "./ziwei/ziwei.repository.js";
export {
  createZiweiCalculationService,
} from "./ziwei/ziwei.service.js";
export type {
  ZiweiCalculationError,
  ZiweiCalculationServiceOptions,
} from "./ziwei/ziwei.service.js";
