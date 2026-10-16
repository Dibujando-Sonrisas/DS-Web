import type { Metadata } from "next";
import "../styles/modernizr.css";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Fundación Dibujando Sonrisas",
    default: "Fundación Dibujando Sonrisas",
  },
  description:
    "Fundación Dibujando Sonrisas — Brigadas médico-odontológicas en Honduras. Llevando salud, amor y esperanza a las comunidades más vulnerables.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Sriracha&family=Valley+Sans:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
