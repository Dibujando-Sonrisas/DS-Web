import { Text } from "react-email";
import { Layout } from "./components/Layout";
import {
  destination,
  firstName,
  type VolunteerRequest,
  VolunteerRequestDetails,
} from "./components/VolunteerRequestDetails";
import { styles } from "./styles";

const NEXT_STEP =
  "Un coordinador la revisará pronto. Cuando sea aprobada te enviaremos otro correo con las instrucciones para entrar a tu cuenta de voluntario.";

export default function ReceivedVolunteerRequestEmail({
  request,
  siteUrl,
}: {
  request: VolunteerRequest;
  siteUrl: string;
}) {
  return (
    <Layout
      title={`¡Gracias, ${firstName(request)}!`}
      preview={NEXT_STEP}
      siteUrl={siteUrl}
      footer={
        <>
          Te llega este correo porque te inscribiste como voluntario en nuestro
          sitio web.
          <br />
          Si no fuiste tú, puedes ignorarlo.
        </>
      }
    >
      <Text style={styles.paragraph}>
        Recibimos tu solicitud para unirte {destination(request)}.
      </Text>
      <Text style={styles.paragraph}>{NEXT_STEP}</Text>
      <VolunteerRequestDetails request={request} />
    </Layout>
  );
}
