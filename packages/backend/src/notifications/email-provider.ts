export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailProviderResult =
  | { ok: true; providerMessageId?: string }
  | { ok: false; code: "SMTP_RETRYABLE" | "SMTP_CONFIG_INVALID" };

export interface EmailProvider {
  send(message: EmailMessage, idempotencyKey: string): Promise<EmailProviderResult>;
}
