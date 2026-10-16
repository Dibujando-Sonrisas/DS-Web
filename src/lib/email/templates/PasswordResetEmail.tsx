import { Section, Text } from "react-email";
import { ActionButton } from "./components/ActionButton";
import { Layout } from "./components/Layout";
import { styles } from "./styles";

export default function PasswordResetEmail({
  email,
  resetUrl,
  siteUrl,
}: {
  email: string;
  resetUrl: string;
  siteUrl: string;
}) {
  const intro = `Recibimos una solicitud para crear o cambiar la contraseña de tu cuenta (${email}).`;

  return (
    <Layout
      title="Crea tu nueva contraseña"
      preview={intro}
      siteUrl={siteUrl}
      footer="Te llega este correo porque alguien pidió restablecer la contraseña de tu cuenta."
    >
      <Text style={styles.paragraph}>{intro}</Text>
      <Section style={styles.actions}>
        <ActionButton href={resetUrl}>Crear nueva contraseña</ActionButton>
      </Section>
      <Text style={styles.note}>
        Si no lo pediste, ignora este correo: tu contraseña no cambia. El enlace
        vence pronto.
      </Text>
    </Layout>
  );
}
