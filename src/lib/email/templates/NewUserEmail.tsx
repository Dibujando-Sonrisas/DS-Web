import { Section, Text } from "react-email";
import { ActionButton } from "./components/ActionButton";
import { DetailRow, Details } from "./components/Details";
import { Layout } from "./components/Layout";
import { NoticeFooter } from "./components/NoticeFooter";
import { styles } from "./styles";

export type NewUser = { name: string; email: string; source: string };

export default function NewUserEmail({
  user,
  siteUrl,
}: {
  user: NewUser;
  siteUrl: string;
}) {
  return (
    <Layout
      title={`Nuevo usuario: ${user.name}`}
      preview={`${user.email} · ${user.source}`}
      siteUrl={siteUrl}
      footer={<NoticeFooter notice="usuario_nuevo" siteUrl={siteUrl} />}
    >
      <Text style={styles.paragraph}>
        Se creó una cuenta en el panel con el rol predeterminado. Revisa si
        necesita otro rol o acceso.
      </Text>
      <Details>
        <DetailRow label="Nombre">{user.name}</DetailRow>
        <DetailRow label="Correo">{user.email}</DetailRow>
        <DetailRow label="Origen">{user.source}</DetailRow>
      </Details>
      <Section style={styles.actions}>
        <ActionButton href={`${siteUrl}/administracion/usuarios`}>
          Revisar en Usuarios
        </ActionButton>
      </Section>
    </Layout>
  );
}
