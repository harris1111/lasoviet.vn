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
