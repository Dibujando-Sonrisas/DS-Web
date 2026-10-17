import { Section, Text } from "react-email";
import { ActionButton } from "./components/ActionButton";
import { DetailRow } from "./components/Details";
import { Layout } from "./components/Layout";
import { NoticeFooter } from "./components/NoticeFooter";
import {
  firstName,
  type VolunteerRequest,
  VolunteerRequestDetails,
} from "./components/VolunteerRequestDetails";
import { styles } from "./styles";

export type VolunteerRequestNotice = VolunteerRequest & {
  brigadeId: string | null;
  residence: string | null;
  profession: string | null;
  comments: string | null;
};

export const newVolunteerRequestTitle = (request: VolunteerRequest) =>
  request.brigade
    ? `Nueva inscripción a la brigada ${request.brigade.name}`
    : "Nueva solicitud de voluntariado";

export default function NewVolunteerRequestEmail({
  request,
  siteUrl,
}: {
  request: VolunteerRequestNotice;
  siteUrl: string;
}) {
  const intro = request.brigade
    ? `${request.fullName} se inscribió como voluntario a la brigada ${request.brigade.name}.`
    : `${request.fullName} quiere ser voluntario. Es una solicitud general, sin brigada.`;
  const reviewUrl = request.brigadeId
    ? `${siteUrl}/administracion/brigadas?brigada=${request.brigadeId}`
    : `${siteUrl}/administracion/voluntarios`;

  return (
    <Layout
      title={newVolunteerRequestTitle(request)}
      preview={intro}
      siteUrl={siteUrl}
      footer={
        <NoticeFooter notice="voluntario_inscripcion" siteUrl={siteUrl} />
      }
    >
      <Text style={styles.paragraph}>{intro}</Text>
      <VolunteerRequestDetails request={request} showEmail>
        <DetailRow label="Vive en">{request.residence}</DetailRow>
        <DetailRow label="Profesión">{request.profession}</DetailRow>
        <DetailRow label="Comentarios">{request.comments}</DetailRow>
      </VolunteerRequestDetails>
      <Section style={styles.actions}>
        <ActionButton href={reviewUrl}>Revisar la solicitud</ActionButton>
        <ActionButton href={`mailto:${request.email}`} variant="secondary">
          Escribir a {firstName(request)}
        </ActionButton>
      </Section>
    </Layout>
  );
}
