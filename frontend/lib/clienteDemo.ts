// Datos de ejemplo y utilidades para las pantallas del cliente (Mis autos, diagnóstico, carrito y pagos).
// Reutiliza los autos y diagnósticos de la demo del taller para que ambos lados cuenten la misma historia.
// TODO (conexión con la BD): reemplazar por las consultas de docs/base-de-datos.md, sección 7 "Cliente":
//   autos → carro, diagnóstico → v_diagnostico_cliente, pagos → orden / v_ticket, pagar → crear_orden.
import { AUTOS_DEMO, type AutoTaller, type EtapaTaller } from "@/lib/autosTaller";
import { CATALOGO, PRECIO_DEMO, type PiezaCatalogo } from "@/lib/catalogo";
import { DIAGNOSTICOS_DEMO, type Marca } from "@/lib/diagnosticosDemo";

export type { Marca };

// Autos del cliente de la demo: uno sin diagnóstico, uno por pagar, uno pagado y uno listo.
const IDS_AUTOS_CLIENTE = ["v3", "v4", "v6", "v1"];
export const AUTOS_CLIENTE: AutoTaller[] = IDS_AUTOS_CLIENTE.map((id) => AUTOS_DEMO.find((a) => a.id === id)!);

export const CLIENTE_DEMO = { nombre: "Miguel Ángel Méndez", iniciales: "MM" };
export const MECANICO_DEMO = "Rafael";
export const MODELO = "Corvette Z06 2025";

export const MARCAS: Marca[] = ["OEM", "GM"];
export const MINUTOS_QR = 10; // vigencia del QR de pey (expiration = 600 s)

// ---------- Dinero (todo en centavos; el servidor calcula lo que se cobra) ----------
export const centavos = (pesos: number) => Math.round(pesos * 100);
export const precioCentavos = (marca: Marca) => centavos(PRECIO_DEMO[marca]);
const formato = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
export const dinero = (c: number) => formato.format(c / 100);

// ---------- Placas ----------
// Da formato de placa mexicana: separa letras y números con guiones (ABC123D → ABC-123-D).
export function formatoPlaca(placa: string) {
  const limpia = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return limpia.match(/[A-Z]+|[0-9]+/g)?.join("-") ?? limpia;
}

// ---------- Ubicación de la pieza ----------
export const EJE: Record<string, string> = { DELANTERO: "Delantero", TRASERO: "Trasero" };
export const LADO: Record<string, string> = { IZQUIERDO: "Izquierdo", DERECHO: "Derecho", CENTRAL: "Central" };
export const pieza = (id: string) => CATALOGO.find((p) => p.id === id) as PiezaCatalogo;
export const ubicacion = (p: PiezaCatalogo) => `${EJE[p.eje]} · ${LADO[p.lado]}`;

// ---------- Seguimiento en vivo (estado del diagnóstico desde "enviado") ----------
export type EtapaCliente = "esperando" | "enviado" | "pagado" | "en_reparacion" | "listo" | "entregado";

export const ETAPA_DESDE_TALLER: Record<EtapaTaller, EtapaCliente> = {
  por_diagnosticar: "esperando",
  esperando_pago: "enviado",
  pagado: "pagado",
  en_reparacion: "en_reparacion",
  listo: "listo",
  entregado: "entregado",
};

// Pasos de la línea de tiempo (el primero es la espera del diagnóstico)
export const PASOS: { clave: EtapaCliente; titulo: string; texto: string }[] = [
  { clave: "esperando", titulo: "En revisión", texto: "El mecánico revisa la suspensión" },
  { clave: "enviado", titulo: "Diagnóstico enviado", texto: "Elige tus piezas y paga" },
  { clave: "pagado", titulo: "Pagado", texto: "Tu reparación está en turno" },
  { clave: "en_reparacion", titulo: "En reparación", texto: "El mecánico cambia las piezas" },
  { clave: "listo", titulo: "Listo", texto: "Pasa por tu auto" },
  { clave: "entregado", titulo: "Entregado", texto: "Servicio terminado" },
];

// Pastilla de estado: verde tenue para Pagado y Listo, gris para En reparación y Entregado (CLAUDE.md §11)
export const ESTILO_ETAPA: Record<EtapaCliente, { etiqueta: string; clase: string }> = {
  esperando: { etiqueta: "Esperando diagnóstico", clase: "border-borde bg-fondo text-suave" },
  enviado: { etiqueta: "Diagnóstico listo", clase: "border-tinta bg-tarjeta text-tinta" },
  pagado: { etiqueta: "Pagado", clase: "border-[#BFE3CB] bg-[#E7F5EC] text-[#166534]" },
  en_reparacion: { etiqueta: "En reparación", clase: "border-borde bg-fondo text-[#3A4250]" },
  listo: { etiqueta: "Listo", clase: "border-[#BFE3CB] bg-[#E7F5EC] text-[#166534]" },
  entregado: { etiqueta: "Entregado", clase: "border-borde bg-fondo text-[#3A4250]" },
};

// El cliente puede comprar mientras el diagnóstico esté enviado o pagado (compras parciales, CLAUDE.md §4)
export const puedeComprar = (etapa: EtapaCliente) => etapa === "enviado" || etapa === "pagado";

// ---------- Fechas ----------
const fmtFecha = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});
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

// ---------- Órdenes (cada orden es de un solo diagnóstico; la pagada es el ticket) ----------
export type LineaOrden = { piezaId: string; marca: Marca; manoDeObra: number }; // manoDeObra en centavos
export type EstadoOrden = "pendiente" | "pagado" | "expirado";
export type Orden = {
  id: number; // id_orden: se manda a pey como numRef (máx. 7 dígitos)
  autoId: string;
  lineas: LineaOrden[];
  estado: EstadoOrden;
  creadaEn: string;
  expiraEn: string;
  pagadaEn?: string;
};

export const folioOrden = (id: number) => `OR-${String(id).padStart(7, "0")}`;
export const totalesOrden = (lineas: LineaOrden[]) => {
  const piezas = lineas.reduce((s, l) => s + precioCentavos(l.marca), 0);
  const manoDeObra = lineas.reduce((s, l) => s + l.manoDeObra, 0);
  return { piezas, manoDeObra, total: piezas + manoDeObra };
};

// Tickets de la demo: las fallas que ya se pagaron en DIAGNOSTICOS_DEMO
const ordenesPagadasDemo: Orden[] = AUTOS_CLIENTE.flatMap((auto) => {
  const d = DIAGNOSTICOS_DEMO[auto.id];
  if (!d?.pago) return [];
  return [
    {
      id: Number(d.pago.referencia),
      autoId: auto.id,
      lineas: d.fallas
        .filter((f) => f.marcaElegida)
        .map((f) => ({ piezaId: f.piezaId, marca: f.marcaElegida!, manoDeObra: centavos(f.manoDeObra) })),
      estado: "pagado" as const,
      creadaEn: d.pago.pagadoEn,
      expiraEn: d.pago.pagadoEn,
      pagadaEn: d.pago.pagadoEn,
    },
  ];
});

// Un QR que venció sin pagarse, para mostrar ese caso en Pagos
const ordenVencidaDemo: Orden = {
  id: 43,
  autoId: "v3",
  lineas: [{ piezaId: "SUS-TRA-09-IZQ", marca: "OEM", manoDeObra: 1 }],
  estado: "expirado",
  creadaEn: "2026-11-14T23:10:00-06:00",
  expiraEn: "2026-11-14T23:20:00-06:00",
};

export const ORDENES_DEMO: Orden[] = [ordenVencidaDemo, ...ordenesPagadasDemo];

// Lo que el cliente ya tenía en el carrito (por auto → pieza → marca)
export const CARRITO_DEMO: Record<string, Record<string, Marca>> = {
  v3: { "SUS-TRA-10-DER": "GM", "SUS-TRA-09-DER": "OEM" },
  v4: { "SUS-DEL-06-IZQ": "OEM" },
};
