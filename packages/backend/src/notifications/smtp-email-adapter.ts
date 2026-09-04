import { isIP } from "node:net";

import nodemailer, {
  type SendMailOptions,
  type Transporter,
} from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";

import type {
  EmailMessage,
  EmailProvider,
  EmailProviderResult,
} from "./email-provider.js";

export type SmtpEmailSettings = {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  tlsRequired: boolean;
};

type SmtpTransport = Pick<Transporter, "sendMail">;
type SmtpTransportFactory = Pick<typeof nodemailer, "createTransport">;

function configFailure(): EmailProviderResult {
  return { ok: false, code: "SMTP_CONFIG_INVALID" };
}

function retryableFailure(): EmailProviderResult {
  return { ok: false, code: "SMTP_RETRYABLE" };
}

function isValidSettings(settings: SmtpEmailSettings): boolean {
  return (
    settings.port === 587 &&
    settings.tlsRequired &&
    settings.host.trim() !== "" &&
    isIP(settings.host) === 0 &&
    settings.username.trim() !== "" &&
    settings.password.trim() !== "" &&
    settings.from.trim() !== ""
  );
}

function classifyError(error: unknown): EmailProviderResult {
  const candidate = error as {
    code?: unknown;
    responseCode?: unknown;
  };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const responseCode =
    typeof candidate.responseCode === "number"
      ? candidate.responseCode
      : undefined;

  if (
    (responseCode !== undefined &&
      responseCode >= 400 &&
      responseCode < 500) ||
    ["ECONNECTION", "ECONNREFUSED", "ECONNRESET", "EDNS", "ESOCKET", "ETIMEDOUT"].includes(
      code,
    )
  ) {
    return retryableFailure();
  }
  return configFailure();
}

function transportOptions(
  settings: SmtpEmailSettings,
): SMTPTransport.Options {
  return {
    host: settings.host,
    port: 587,
    secure: false,
    requireTLS: true,
    ignoreTLS: false,
    opportunisticTLS: false,
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
    auth: {
      user: settings.username,
      pass: settings.password,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    dnsTimeout: 10_000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export function createSmtpEmailAdapter(
  settings: SmtpEmailSettings,
  factory: SmtpTransportFactory = nodemailer,
): EmailProvider {
  if (!isValidSettings(settings)) {
    return {
      async send() {
        return configFailure();
      },
    };
  }

  const transport = factory.createTransport(transportOptions(settings));
  return {
    async send(message: EmailMessage, _idempotencyKey: string) {
      const mail: SendMailOptions = {
        from: settings.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      };
      try {
        const result = await transport.sendMail(mail);
        return {
          ok: true,
          ...(result.messageId !== undefined
            ? { providerMessageId: result.messageId }
            : {}),
        };
      } catch (error) {
        return classifyError(error);
      }
    },
  };
}
