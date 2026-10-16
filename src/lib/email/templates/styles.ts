import type { CSSProperties } from "react";

export const colors = {
  primary: "#087a76",
  teal: "#0a8c88",
  yellow: "#f7cb70",
  red: "#cd463a",
  dark: "#1a2332",
  gray: "#596170",
  cream: "#f5f5f1",
  line: "#e7e4da",
  lineStrong: "#d6d2c4",
  muted: "#faf9f5",
  white: "#ffffff",
};

const font = "'Inter','Segoe UI',Helvetica,Arial,sans-serif";
const titleFont = "'Sriracha','Trebuchet MS',Arial,sans-serif";

export const webFontsUrl =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Sriracha&display=swap";

export const responsiveCss =
  "@media (max-width:480px){.card{padding:24px 20px !important}.title{font-size:24px !important}}";

export const styles = {
  body: {
    margin: 0,
    padding: "32px 16px",
    backgroundColor: colors.cream,
    fontFamily: font,
    WebkitTextSizeAdjust: "100%",
  },
  container: { maxWidth: "600px" },
  header: { padding: "0 0 20px", textAlign: "center" },
  logo: {
    margin: "0 auto",
    borderRadius: "16px",
    backgroundColor: colors.white,
  },
  card: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.line}`,
    borderRadius: "16px",
    padding: "32px 32px 28px",
  },
  title: {
    margin: 0,
    fontFamily: titleFont,
    fontSize: "28px",
    fontWeight: 400,
    lineHeight: 1.25,
    color: colors.dark,
  },
  stripe: { margin: "14px 0 24px" },
  stripeSegment: {
    height: "6px",
    borderRadius: "99px",
    fontSize: 0,
    lineHeight: 0,
  },
  stripeGap: { width: "6px", fontSize: 0, lineHeight: 0 },
  paragraph: {
    margin: "0 0 20px",
    fontSize: "16px",
    lineHeight: 1.6,
    color: colors.gray,
  },
  note: {
    margin: "20px 0 0",
    fontSize: "14px",
    lineHeight: 1.6,
    color: colors.gray,
  },
  strong: { color: colors.dark },
  small: { fontSize: "14px" },
  link: {
    color: colors.primary,
    fontWeight: 600,
    textDecoration: "none",
  },
  details: { margin: "0 0 24px", borderTop: `1px solid ${colors.line}` },
  detailLabel: {
    width: "96px",
    padding: "11px 16px 11px 0",
    borderBottom: `1px solid ${colors.line}`,
    verticalAlign: "top",
    fontSize: "13px",
    fontWeight: 600,
    lineHeight: 1.5,
    color: colors.gray,
  },
  detailValue: {
    padding: "11px 0",
    borderBottom: `1px solid ${colors.line}`,
    fontSize: "15px",
    lineHeight: 1.5,
    color: colors.dark,
    wordBreak: "break-word",
  },
  sectionLabel: {
    margin: "28px 0 10px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: colors.gray,
  },
  messageBox: {
    padding: "18px 20px",
    backgroundColor: colors.muted,
    border: `1px solid ${colors.line}`,
    borderRadius: "12px",
  },
  messageText: {
    margin: 0,
    fontSize: "16px",
    lineHeight: 1.65,
    color: colors.dark,
    wordBreak: "break-word",
  },
  actions: { marginTop: "4px" },
  buttonWrapper: { display: "inline-block", margin: "0 8px 8px 0" },
  button: {
    padding: "12px 24px",
    borderRadius: "6px",
    border: `1px solid ${colors.primary}`,
    backgroundColor: colors.primary,
    fontSize: "15px",
    fontWeight: 600,
    lineHeight: "20px",
    color: colors.white,
  },
  buttonSecondary: {
    padding: "12px 24px",
    borderRadius: "6px",
    border: `1px solid ${colors.lineStrong}`,
    backgroundColor: colors.white,
    fontSize: "15px",
    fontWeight: 600,
    lineHeight: "20px",
    color: colors.dark,
  },
  footer: { padding: "24px 16px 0", textAlign: "center" },
  footerText: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.6,
    color: colors.gray,
  },
} satisfies Record<string, CSSProperties>;
