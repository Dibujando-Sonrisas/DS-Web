import "server-only";

export type Correo = {
  to: string[];
  subject: string;
  /** versión en texto plano: para clientes sin HTML y para los filtros de spam */
  text: string;
  /** versión con la marca (layoutCorreo); lo escrito por visitantes va escapado */
  html?: string;
  /** a quién le llega la respuesta si el destinatario contesta el correo */
  replyTo?: string;
};

/**
 * Envía un correo con Resend: https://resend.com/docs/api-reference/emails/send-email
 * EMAIL_FROM debe ser de un dominio verificado en Resend; sin él se usa la
 * dirección de prueba, que solo entrega al dueño de la cuenta de Resend.
 */
export async function enviarCorreo({ to, subject, text, html, replyTo }: Correo): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Falta RESEND_API_KEY en las variables de entorno.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Dibujando Sonrisas <onboarding@resend.dev>",
      to,
      subject,
      text,
      html,
      reply_to: replyTo,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
  }
}
