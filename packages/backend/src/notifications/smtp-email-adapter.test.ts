import { describe, expect, it } from "vitest";

import {
  createSmtpEmailAdapter,
  type SmtpEmailSettings,
} from "./smtp-email-adapter.js";

const smtp: SmtpEmailSettings = {
  host: "smtp.synthetic.test",
  port: 587,
  username: "synthetic-user",
  password: "synthetic-password",
  from: "La So Viet <noreply@synthetic.test>",
  tlsRequired: true,
};

describe("SMTP email adapter", () => {
  it("requires STARTTLS on port 587 and sends one message per call", async () => {
    const attempts: unknown[] = [];
    const adapter = createSmtpEmailAdapter(smtp, {
      createTransport(options) {
        attempts.push(options);
        return {
          async sendMail(message) {
            attempts.push(message);
            return { messageId: "synthetic-message-id" };
          },
          async verify() {},
        };
      },
    });

    const result = await adapter.send(
      {
        to: "user@synthetic.test",
        subject: "Verify",
        text: "Verify your account.",
        html: "<p>Verify your account.</p>",
      },
      "auth-email:verification:synthetic",
    );

    expect(result).toEqual({
      ok: true,
      providerMessageId: "synthetic-message-id",
    });
    expect(attempts).toHaveLength(2);
  });

  it("classifies a transient SMTP failure without retrying inside the adapter", async () => {
    let sendAttempts = 0;
    const adapter = createSmtpEmailAdapter(smtp, {
      createTransport() {
        return {
          async sendMail() {
            sendAttempts += 1;
            throw Object.assign(new Error("synthetic transient"), {
              code: "ETIMEDOUT",
            });
          },
          async verify() {},
        };
      },
    });

    await expect(
      adapter.send(
        {
          to: "user@synthetic.test",
          subject: "Reset",
          text: "Reset your password.",
          html: "<p>Reset your password.</p>",
        },
        "auth-email:reset:synthetic",
      ),
    ).resolves.toMatchObject({ ok: false, code: "SMTP_RETRYABLE" });
    expect(sendAttempts).toBe(1);
  });
});
