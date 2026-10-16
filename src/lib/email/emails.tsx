import "server-only";
import type { AvisoCorreo } from "@/lib/avisosCorreo";
import { getLogger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { type Email, sendEmail } from "./client";
import AcceptedVolunteerRequestEmail from "./templates/AcceptedVolunteerRequestEmail";
import type { VolunteerRequest } from "./templates/components/VolunteerRequestDetails";
import NewContactEmail, {
  type ContactMessage,
} from "./templates/NewContactEmail";
import NewUserEmail, { type NewUser } from "./templates/NewUserEmail";
import NewVolunteerRequestEmail, {
  newVolunteerRequestTitle,
  type VolunteerRequestNotice,
} from "./templates/NewVolunteerRequestEmail";
import PasswordResetEmail from "./templates/PasswordResetEmail";
import ReceivedVolunteerRequestEmail from "./templates/ReceivedVolunteerRequestEmail";

export type { VolunteerRequest };

const logger = getLogger("email");

export const SITE_URL = (
  process.env.SITE_URL || "https://production-dibujandosonrisas.netlify.app"
).replace(/\/+$/, "");

export function getMissingEmailConfig(): string[] {
  return ["RESEND_API_KEY", "SUPABASE_SECRET_KEY"].filter(
    (name) => !process.env[name]
  );
}

async function sendTeamNotice(
  notice: AvisoCorreo,
  email: Omit<Email, "to">
): Promise<void> {
  const { data: recipients, error } = await createSupabaseAdminClient().rpc(
    "correos_aviso",
    { p_aviso: notice }
  );
  if (error) throw new Error(error.message);
  if (!recipients.length) {
    logger.warning("Email notice skipped", { notice, reason: "no recipients" });
    return;
  }
  await sendEmail({ to: recipients, ...email });
}

export function sendNewContact(contact: ContactMessage) {
  return sendTeamNotice("contacto", {
    subject: `Nuevo mensaje de contacto: ${contact.subject}`,
    replyTo: contact.email,
    react: (
      <NewContactEmail
        contact={contact}
        receivedAt={new Date()}
        siteUrl={SITE_URL}
      />
    ),
  });
}

export function sendNewUser(user: NewUser) {
  return sendTeamNotice("usuario_nuevo", {
    subject: `Nuevo usuario: ${user.name}`,
    react: <NewUserEmail user={user} siteUrl={SITE_URL} />,
  });
}

export function sendNewVolunteerRequest(request: VolunteerRequestNotice) {
  return sendTeamNotice("voluntario_inscripcion", {
    subject: `${newVolunteerRequestTitle(request)}: ${request.fullName}`,
    replyTo: request.email,
    react: <NewVolunteerRequestEmail request={request} siteUrl={SITE_URL} />,
  });
}

export function sendReceivedVolunteerRequest(request: VolunteerRequest) {
  return sendEmail({
    to: [request.email],
    subject: request.brigade
      ? `Recibimos tu inscripción a la brigada ${request.brigade.name}`
      : "Recibimos tu solicitud de voluntariado",
    react: (
      <ReceivedVolunteerRequestEmail request={request} siteUrl={SITE_URL} />
    ),
  });
}

export function sendAcceptedVolunteerRequest(
  request: VolunteerRequest,
  {
    accessUrl,
    hasAccount,
    appUrl,
  }: { accessUrl: string; hasAccount: boolean; appUrl: string }
) {
  return sendEmail({
    to: [request.email],
    subject: "Tu solicitud de voluntariado fue aceptada",
    react: (
      <AcceptedVolunteerRequestEmail
        request={request}
        accessUrl={accessUrl}
        hasAccount={hasAccount}
        recoveryUrl={`${appUrl}/auth/recuperar-contrasena`}
        siteUrl={SITE_URL}
      />
    ),
  });
}

export function sendPasswordReset(email: string, resetUrl: string) {
  return sendEmail({
    to: [email],
    subject: "Crea tu nueva contraseña",
    react: (
      <PasswordResetEmail
        email={email}
        resetUrl={resetUrl}
        siteUrl={SITE_URL}
      />
    ),
  });
}
