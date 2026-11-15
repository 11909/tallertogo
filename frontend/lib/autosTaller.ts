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
  { id: "v1", placas: "ABC123D", colorCodigo: "GKZ", folio: null, etapa: "por_diagnosticar", actualizacion: "Hace 10 min" },
  { id: "v2", placas: "XYZ987A", colorCodigo: "GBA", folio: null, etapa: "por_diagnosticar", actualizacion: "Hace 10 min" },
  { id: "v3", placas: "MNO456B", colorCodigo: "G26", folio: "DG-00042", etapa: "esperando_pago", actualizacion: "Diagnóstico enviado hace 1 h" },
  { id: "v4", placas: "PQR321C", colorCodigo: "GMO", folio: "DG-00041", etapa: "pagado", actualizacion: "Pagó con CoDi hace 25 min" },
  { id: "v5", placas: "STU654E", colorCodigo: "G8G", folio: "DG-00040", etapa: "en_reparacion", actualizacion: "Desde hace 2 h" },
  { id: "v6", placas: "VWX987F", colorCodigo: "GXA", folio: "DG-00039", etapa: "listo", actualizacion: "Terminado hace 15 min" },
];

// Para buscar sin importar acentos ni mayúsculas
export const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
