import { Fragment } from "react";
import { Link, Section, Text } from "react-email";
import { ActionButton } from "./components/ActionButton";
import { DetailRow, Details } from "./components/Details";
import { Layout } from "./components/Layout";
import { NoticeFooter } from "./components/NoticeFooter";
import { styles } from "./styles";

export type ContactMessage = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
};

const receivedFormat = new Intl.DateTimeFormat("es-HN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Tegucigalpa",
});

export default function NewContactEmail({
  contact,
  receivedAt,
  siteUrl,
}: {
  contact: ContactMessage;
  receivedAt: Date;
  siteUrl: string;
}) {
  const replyUrl = `mailto:${contact.email}?subject=${encodeURIComponent(`Re: ${contact.subject}`)}`;

  return (
    <Layout
      title={`Nuevo mensaje de ${contact.firstName}`}
      preview={`${contact.subject} · ${contact.message.slice(0, 90)}`}
      siteUrl={siteUrl}
      footer={
        <NoticeFooter notice="contacto" siteUrl={siteUrl}>
          Si respondes este correo, la respuesta le llega directo a{" "}
          {contact.firstName}.
        </NoticeFooter>
      }
    >
      <Text style={styles.paragraph}>
        <strong style={styles.strong}>
          {contact.firstName} {contact.lastName}
        </strong>{" "}
        escribió desde el formulario de contacto del sitio web.
        <br />
        <span style={styles.small}>
          Recibido el {receivedFormat.format(receivedAt)}
        </span>
      </Text>
      <Details>
        <DetailRow label="Correo">
          <Link href={`mailto:${contact.email}`} style={styles.link}>
            {contact.email}
          </Link>
        </DetailRow>
        <DetailRow label="Teléfono">{contact.phone ?? "No indicado"}</DetailRow>
        <DetailRow label="Asunto">{contact.subject}</DetailRow>
      </Details>
      <Text style={styles.sectionLabel}>Mensaje</Text>
      <Section style={styles.messageBox}>
        <Text style={styles.messageText}>
          {contact.message.split(/\r?\n/).map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lines never reorder and may repeat
            <Fragment key={index}>
              {index > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </Text>
      </Section>
      <Section style={{ ...styles.actions, marginTop: "28px" }}>
        <ActionButton href={replyUrl}>
          Responder a {contact.firstName}
        </ActionButton>
        <ActionButton
          href={`${siteUrl}/administracion/contacto`}
          variant="secondary"
        >
          Ver en el panel
        </ActionButton>
      </Section>
    </Layout>
  );
}
