import { Link, Section, Text } from "react-email";
import { ActionButton } from "./components/ActionButton";
import { Layout } from "./components/Layout";
import {
  destination,
  firstName,
  type VolunteerRequest,
  VolunteerRequestDetails,
} from "./components/VolunteerRequestDetails";
import { styles } from "./styles";

export default function AcceptedVolunteerRequestEmail({
  request,
  accessUrl,
  hasAccount,
  recoveryUrl,
  siteUrl,
}: {
  request: VolunteerRequest;
  accessUrl: string;
  hasAccount: boolean;
  recoveryUrl: string;
  siteUrl: string;
}) {
  const intro = `Tu solicitud para unirte ${destination(request)} fue aceptada.`;

  return (
    <Layout
      title={`¡Te damos la bienvenida, ${firstName(request)}!`}
      preview={intro}
      siteUrl={siteUrl}
      footer="Te llega este correo porque te inscribiste como voluntario en nuestro sitio web."
    >
      <Text style={styles.paragraph}>{intro}</Text>
      <Text style={styles.paragraph}>
        {hasAccount
          ? "Ya tenías una cuenta con este correo: entra con tu contraseña de siempre."
          : "Creamos tu cuenta de voluntario con estos datos. Para entrar, crea tu contraseña:"}
      </Text>
      <VolunteerRequestDetails request={request} showEmail />
      <Section style={styles.actions}>
        <ActionButton href={accessUrl}>
          {hasAccount ? "Iniciar sesión" : "Crear mi contraseña"}
        </ActionButton>
      </Section>
      {!hasAccount && (
        <Text style={styles.note}>
          El enlace es personal y vence pronto. Si ya no funciona, pide uno
          nuevo en{" "}
          <Link href={recoveryUrl} style={styles.link}>
            Recuperar contraseña
          </Link>
          .
        </Text>
      )}
    </Layout>
  );
}
