import type { ReactNode } from "react";
import { Column, Row, Section } from "react-email";
import { styles } from "../styles";

export function Details({ children }: { children: ReactNode }) {
  return <Section style={styles.details}>{children}</Section>;
}

export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <Row data-text-format="dataTable">
      <Column style={styles.detailLabel}>{label}</Column>
      <Column style={styles.detailValue}>{children}</Column>
    </Row>
  );
}
