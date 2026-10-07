import "server-only";

/**
 * Marco de marca de los correos. Los clientes de correo no entienden variables
 * CSS, flexbox ni hojas de estilo externas: todo va en tablas con estilos en
 * línea, con los mismos colores y trazos de crayón del sitio (globals.css).
 */

/** URL pública del sitio para el logo y los enlaces (localhost no carga en el correo de quien lo recibe). */
export const SITIO = (process.env.SITE_URL || "https://production-dibujandosonrisas.netlify.app").replace(
  /\/+$/,
  ""
);

export const COLOR = {
  primario: "#087a76", // --primaryStrong: botones (contraste AA con blanco)
  teal: "#0a8c88", // --primaryColor
  amarillo: "#f7cb70", // --secondaryColor
  rojo: "#cd463a", // --tertiaryColor
  oscuro: "#1a2332", // --dark
  gris: "#596170", // --gray
  crema: "#f5f5f1", // --bg-light
  linea: "#e7e4da", // --line
  lineaFuerte: "#d6d2c4", // --line-strong
  suave: "#faf9f5", // --surface-muted
};

export const FUENTE = "'Inter','Segoe UI',Helvetica,Arial,sans-serif";
export const FUENTE_TITULO = "'Sriracha','Trebuchet MS',Arial,sans-serif";

/** Todo lo que escribe un visitante pasa por aquí antes de entrar al HTML. */
export function escapeHtml(texto: string): string {
  return texto.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

/** Botón hecho con tabla: se ve igual en Gmail, Apple Mail y Outlook. */
export function botonCorreo(href: string, texto: string, variante: "primario" | "secundario" = "primario") {
  const primario = variante === "primario";
  const fondo = primario ? COLOR.primario : "#ffffff";
  const borde = primario ? COLOR.primario : COLOR.lineaFuerte;
  const tinta = primario ? "#ffffff" : COLOR.oscuro;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 8px 8px 0;">
  <tr><td style="border-radius:6px;background:${fondo};border:1px solid ${borde};">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-family:${FUENTE};font-size:15px;font-weight:600;line-height:20px;color:${tinta};text-decoration:none;border-radius:6px;">${escapeHtml(texto)}</a>
  </td></tr>
</table>`;
}

type LayoutCorreo = {
  /** texto plano; se escapa aquí */
  titulo: string;
  /** línea gris de la vista previa en la bandeja; texto plano */
  preheader: string;
  /** HTML ya escapado */
  cuerpo: string;
  /** HTML ya escapado: por qué le llega este correo */
  pie: string;
};

export function layoutCorreo({ titulo, preheader, cuerpo, pie }: LayoutCorreo): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(titulo)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Sriracha&display=swap" rel="stylesheet">
<style>@media (max-width:480px){.tarjeta{padding:24px 20px !important}.titulo{font-size:24px !important}}</style>
</head>
<body style="margin:0;padding:0;background:${COLOR.crema};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLOR.crema};">${escapeHtml(preheader)}${"&nbsp;&zwnj;".repeat(60)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.crema};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
    <tr><td align="center" style="padding:0 0 20px;">
      <a href="${SITIO}" style="text-decoration:none;">
        <img src="${SITIO}/logo.png" width="128" height="128" alt="Fundación Dibujando Sonrisas" style="display:block;border:0;width:128px;height:128px;border-radius:16px;background:#ffffff;font-family:${FUENTE};font-size:14px;color:${COLOR.oscuro};">
      </a>
    </td></tr>
    <tr><td class="tarjeta" style="background:#ffffff;border:1px solid ${COLOR.linea};border-radius:16px;padding:32px 32px 28px;">
      <h1 class="titulo" style="margin:0;font-family:${FUENTE_TITULO};font-size:28px;font-weight:400;line-height:1.25;color:${COLOR.oscuro};">${escapeHtml(titulo)}</h1>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 24px;">
        <tr>
          <td width="48" height="6" style="width:48px;height:6px;background:${COLOR.teal};border-radius:99px;font-size:0;line-height:0;">&nbsp;</td>
          <td width="6" style="width:6px;font-size:0;line-height:0;">&nbsp;</td>
          <td width="30" height="6" style="width:30px;height:6px;background:${COLOR.amarillo};border-radius:99px;font-size:0;line-height:0;">&nbsp;</td>
          <td width="6" style="width:6px;font-size:0;line-height:0;">&nbsp;</td>
          <td width="16" height="6" style="width:16px;height:6px;background:${COLOR.rojo};border-radius:99px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>
      ${cuerpo}
    </td></tr>
    <tr><td align="center" style="padding:24px 16px 0;font-family:${FUENTE};font-size:13px;line-height:1.6;color:${COLOR.gris};">
      <strong style="color:${COLOR.oscuro};">Fundación Dibujando Sonrisas</strong><br>
      ${pie}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}
