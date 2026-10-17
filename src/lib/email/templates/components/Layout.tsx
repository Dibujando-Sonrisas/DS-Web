import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import { colors, responsiveCss, styles, webFontsUrl } from "../styles";

type LayoutProps = {
  title: string;
  preview: string;
  footer: ReactNode;
  siteUrl: string;
  children: ReactNode;
};

export function Layout({
  title,
  preview,
  footer,
  siteUrl,
  children,
}: LayoutProps) {
  return (
    <Html lang="es">
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <link href={webFontsUrl} rel="stylesheet" />
        <style>{responsiveCss}</style>
      </Head>
      <Body style={styles.body}>
        <Preview useTitleTag={false}>{preview}</Preview>
        <Container style={styles.container}>
          <Section style={styles.header} data-skip-in-text>
            <Link href={siteUrl}>
              <Img
                src={`${siteUrl}/logo.png`}
                width="96"
                height="96"
                alt="Fundación Dibujando Sonrisas"
                style={styles.logo}
              />
            </Link>
          </Section>
          <Section tdClassName="card" style={styles.card}>
            <Heading as="h1" className="title" style={styles.title}>
              {title}
            </Heading>
            <BrandStripe />
            {children}
          </Section>
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              <strong style={styles.strong}>
                Fundación Dibujando Sonrisas
              </strong>
              <br />
              {footer}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function BrandStripe() {
  return (
    <table
      role="presentation"
      cellPadding="0"
      cellSpacing="0"
      border={0}
      style={styles.stripe}
      data-skip-in-text
    >
      <tbody>
        <tr>
          <td
            style={{
              ...styles.stripeSegment,
              width: 48,
              background: colors.teal,
            }}
          >
            &nbsp;
          </td>
          <td style={styles.stripeGap}>&nbsp;</td>
          <td
            style={{
              ...styles.stripeSegment,
              width: 30,
              background: colors.yellow,
            }}
          >
            &nbsp;
          </td>
          <td style={styles.stripeGap}>&nbsp;</td>
          <td
            style={{
              ...styles.stripeSegment,
              width: 16,
              background: colors.red,
            }}
          >
            &nbsp;
          </td>
        </tr>
      </tbody>
    </table>
  );
}
