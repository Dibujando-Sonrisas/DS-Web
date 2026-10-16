import type { ReactNode } from "react";
import { DetailRow, Details } from "./Details";

export type VolunteerRequest = {
  fullName: string;
  email: string;
  phone: string | null;
  areaOfInterest: string | null;
  brigade: { name: string; date: string; location: string } | null;
};

const dateFormat = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "long",
  timeZone: "UTC",
});

export const firstName = (request: VolunteerRequest) =>
  request.fullName.split(" ")[0];

export const destination = (request: VolunteerRequest) =>
  request.brigade
    ? `a la brigada ${request.brigade.name}`
    : "como voluntario de Dibujando Sonrisas";

export function VolunteerRequestDetails({
  request,
  showEmail = false,
  children,
}: {
  request: VolunteerRequest;
  showEmail?: boolean;
  children?: ReactNode;
}) {
  const { brigade } = request;
  return (
    <Details>
      <DetailRow label="Nombre">{request.fullName}</DetailRow>
      {showEmail && <DetailRow label="Correo">{request.email}</DetailRow>}
      <DetailRow label="Teléfono">{request.phone}</DetailRow>
      <DetailRow label="Área">{request.areaOfInterest}</DetailRow>
      <DetailRow label="Brigada">
        {brigade &&
          `${brigade.name} · ${dateFormat.format(new Date(brigade.date))} · ${brigade.location}`}
      </DetailRow>
      {children}
    </Details>
  );
}
