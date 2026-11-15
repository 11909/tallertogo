// Etapas de un auto vistas desde el taller y datos de ejemplo para la demo.
// TODO: reemplazar AUTOS_DEMO por la consulta a Supabase (vehicles + diagnoses).

export type EtapaTaller =
  | "por_diagnosticar"
  | "esperando_pago"
  | "pagado"
  | "en_reparacion"
  | "listo"
  | "entregado";

export type AutoTaller = {
  id: string;
  placas: string;
  colorCodigo: string; // código de pintura GM (ver lib/colores.ts)
  folio: string | null; // se asigna al empezar el diagnóstico
  etapa: EtapaTaller;
  actualizacion: string;
  registradoEn: string; // hora de registro del auto: define el turno de diagnóstico
  pagadoEn: string | null; // hora del pago con CoDi (datePaid de pey): define el turno de reparación
};

export const ETAPAS_TALLER: Record<
  EtapaTaller,
  { etiqueta: string; estilo: "fuerte" | "verde" | "gris"; accion: string; siguiente?: EtapaTaller }
> = {
  por_diagnosticar: { etiqueta: "Por diagnosticar", estilo: "fuerte", accion: "Diagnosticar" },
  esperando_pago: { etiqueta: "Esperando pago", estilo: "gris", accion: "Ver diagnóstico" },
  pagado: { etiqueta: "Pagado", estilo: "verde", accion: "Iniciar reparación", siguiente: "en_reparacion" },
  en_reparacion: { etiqueta: "En reparación", estilo: "gris", accion: "Marcar como listo", siguiente: "listo" },
  listo: { etiqueta: "Listo", estilo: "verde", accion: "Marcar como entregado", siguiente: "entregado" },
  entregado: { etiqueta: "Entregado", estilo: "gris", accion: "Ver diagnóstico" },
};

export const AUTOS_DEMO: AutoTaller[] = [
  { id: "v1", placas: "ABC123D", colorCodigo: "GKZ", folio: null, etapa: "por_diagnosticar", actualizacion: "", registradoEn: "2026-11-14T21:40:00-06:00", pagadoEn: null },
  { id: "v2", placas: "XYZ987A", colorCodigo: "GBA", folio: null, etapa: "por_diagnosticar", actualizacion: "", registradoEn: "2026-11-14T21:55:00-06:00", pagadoEn: null },
  { id: "v3", placas: "MNO456B", colorCodigo: "G26", folio: "DG-00042", etapa: "esperando_pago", actualizacion: "Diagnóstico enviado hace 1 h", registradoEn: "2026-11-14T20:10:00-06:00", pagadoEn: null },
  { id: "v4", placas: "PQR321C", colorCodigo: "GMO", folio: "DG-00041", etapa: "pagado", actualizacion: "", registradoEn: "2026-11-14T19:30:00-06:00", pagadoEn: "2026-11-14T23:05:00-06:00" },
  { id: "v7", placas: "YZA111G", colorCodigo: "GPH", folio: "DG-00038", etapa: "pagado", actualizacion: "", registradoEn: "2026-11-14T19:00:00-06:00", pagadoEn: "2026-11-14T23:20:00-06:00" },
  { id: "v5", placas: "STU654E", colorCodigo: "G8G", folio: "DG-00040", etapa: "en_reparacion", actualizacion: "Desde hace 2 h", registradoEn: "2026-11-14T18:20:00-06:00", pagadoEn: "2026-11-14T21:10:00-06:00" },
  { id: "v6", placas: "VWX987F", colorCodigo: "GXA", folio: "DG-00039", etapa: "listo", actualizacion: "Terminado hace 15 min", registradoEn: "2026-11-14T17:45:00-06:00", pagadoEn: "2026-11-14T20:30:00-06:00" },
];

// Para buscar sin importar acentos ni mayúsculas
export const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Orden de la tabla: primero las etapas que requieren trabajo, y dentro de cada fila por turno
const ORDEN_ETAPAS: EtapaTaller[] = ["por_diagnosticar", "pagado", "en_reparacion", "listo", "esperando_pago", "entregado"];

export function ordenarPorTurno(autos: AutoTaller[]): AutoTaller[] {
  return [...autos].sort((a, b) => {
    const porEtapa = ORDEN_ETAPAS.indexOf(a.etapa) - ORDEN_ETAPAS.indexOf(b.etapa);
    if (porEtapa !== 0) return porEtapa;
    if (a.etapa === "por_diagnosticar") return a.registradoEn.localeCompare(b.registradoEn); // por llegada
    if (a.etapa === "pagado") return (a.pagadoEn ?? "").localeCompare(b.pagadoEn ?? ""); // por pago
    return 0;
  });
}

// Turno dentro de su fila (1 = el siguiente). Solo aplica a "por diagnosticar" y "pagado".
export function turnoDe(auto: AutoTaller, autos: AutoTaller[]): number | null {
  if (auto.etapa !== "por_diagnosticar" && auto.etapa !== "pagado") return null;
  return ordenarPorTurno(autos.filter((a) => a.etapa === auto.etapa)).findIndex((a) => a.id === auto.id) + 1;
}

export const hora = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Mexico_City" }).format(new Date(iso));
