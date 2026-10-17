import "server-only";
import type { ReactElement } from "react";
import { render, toPlainText } from "react-email";
import { errorInfo, getLogger } from "@/lib/logger";

const logger = getLogger("email");

const DEFAULT_FROM = "Dibujando Sonrisas <onboarding@resend.dev>";

const plainTextOptions = {
  selectors: [
    { selector: "h1", options: { uppercase: false } },
    {
      selector: 'a[href^="mailto:"]',
      format: "anchor",
      options: { ignoreHref: true },
    },
  ],
};

export type Email = {
  to: string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
};

export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
}: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");

  const html = await render(react);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to,
      subject,
      html,
      text: toPlainText(html, plainTextOptions),
      reply_to: replyTo,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    logger.error("Email delivery failed", {
      ...errorInfo((await response.text()).slice(0, 300)),
      status: response.status,
    });
    throw new Error("No se pudo enviar el correo.");
  }
  logger.info("Email sent", { recipients: to.length });
}
