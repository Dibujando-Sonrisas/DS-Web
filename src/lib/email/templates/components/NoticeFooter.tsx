import type { ReactNode } from "react";
import { Link } from "react-email";
import type { AvisoCorreo } from "@/lib/avisosCorreo";
import { styles } from "../styles";

export function NoticeFooter({
  notice,
  siteUrl,
  children,
}: {
  notice: AvisoCorreo;
  siteUrl: string;
  children?: ReactNode;
}) {
  return (
    <>
      Te llega este aviso porque estás en la lista de{" "}
      <Link
        href={`${siteUrl}/administracion/ajustes/correos#aviso-${notice}`}
        style={styles.link}
      >
        Ajustes → Correos
      </Link>{" "}
      del panel.
      {children && (
        <>
          <br />
          {children}
        </>
      )}
    </>
  );
}
