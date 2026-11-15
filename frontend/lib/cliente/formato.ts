// Formatos y textos que comparten las pantallas del cliente.
import type { EstadoDiagnostico, Falla, LineaOrden } from "@/lib/cliente/tipos";

export const MODELO = "Corvette Z06 2025";
export const MINUTOS_QR = 10; // vigencia del QR (expiration = 600 s en pey)

// ---------- Dinero (centavos) ----------
const formatoDinero = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
export const dinero = (centavos: number) => formatoDinero.format(centavos / 100);

// ---------- Folios ----------
export const folioDiagnostico = (folio: number) => `DG-${String(folio).padStart(5, "0")}`;
export const folioOrden = (id: number) => `OR-${String(id).padStart(7, "0")}`; // numRef de pey = id_orden

// ---------- Placas ----------
// Formato de placa mexicana: separa letras y números con guiones (ABC123D → ABC-123-D).
export function formatoPlaca(placa: string) {
  const limpia = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return limpia.match(/[A-Z]+|[0-9]+/g)?.join("-") ?? limpia;
}

// ---------- Ubicación de la pieza ----------
const EJE: Record<string, string> = { DELANTERO: "Delantero", TRASERO: "Trasero" };
const LADO: Record<string, string> = { IZQUIERDO: "Izquierdo", DERECHO: "Derecho", CENTRAL: "Central" };
export const ubicacion = (p: Pick<Falla | LineaOrden, "eje" | "lado">) => `${EJE[p.eje] ?? p.eje} · ${LADO[p.lado] ?? p.lado}`;

// ---------- Seguimiento en vivo ----------
// "esperando" = el auto no tiene diagnóstico enviado; los demás son diagnostico.estado
export type EtapaCliente = "esperando" | EstadoDiagnostico;

export const PASOS: { clave: EtapaCliente; titulo: string; texto: string }[] = [
  { clave: "esperando", titulo: "En revisión", texto: "El mecánico revisa la suspensión" },
  { clave: "enviado", titulo: "Diagnóstico enviado", texto: "Elige tus piezas y paga" },
  { clave: "pagado", titulo: "Pagado", texto: "Tu reparación está en turno" },
  { clave: "en_reparacion", titulo: "En reparación", texto: "El mecánico cambia las piezas" },
  { clave: "listo", titulo: "Listo", texto: "Pasa por tu auto" },
  { clave: "entregado", titulo: "Entregado", texto: "Servicio terminado" },
];

// Verde tenue para Pagado y Listo, gris para En reparación y Entregado (CLAUDE.md §11)
export const ESTILO_ETAPA: Record<EtapaCliente, { etiqueta: string; clase: string }> = {
  esperando: { etiqueta: "Esperando diagnóstico", clase: "border-borde bg-fondo text-suave" },
  enviado: { etiqueta: "Diagnóstico listo", clase: "border-tinta bg-tarjeta text-tinta" },
  pagado: { etiqueta: "Pagado", clase: "border-[#BFE3CB] bg-[#E7F5EC] text-[#166534]" },
  en_reparacion: { etiqueta: "En reparación", clase: "border-borde bg-fondo text-[#3A4250]" },
  listo: { etiqueta: "Listo", clase: "border-[#BFE3CB] bg-[#E7F5EC] text-[#166534]" },
  entregado: { etiqueta: "Entregado", clase: "border-borde bg-fondo text-[#3A4250]" },
};

// El cliente compra mientras el diagnóstico esté enviado o pagado (compras parciales, CLAUDE.md §4)
export const puedeComprar = (etapa: EtapaCliente) => etapa === "enviado" || etapa === "pagado";

// ---------- Fechas ----------
const fmtFecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });
const fmtFechaHora = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Mexico_City",
});
export const fecha = (iso: string) => fmtFecha.format(new Date(iso));
export const fechaHora = (iso: string) => fmtFechaHora.format(new Date(iso));

// Cuenta regresiva mm:ss hasta `iso` (null mientras no haya reloj en el navegador)
export function restante(iso: string, ahora: number | null) {
  if (ahora === null) return "--:--";
  const s = Math.max(0, Math.floor((new Date(iso).getTime() - ahora) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
