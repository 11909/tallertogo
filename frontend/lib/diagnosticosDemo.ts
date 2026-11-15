// Diagnósticos de ejemplo para la demo, por auto (id de lib/autosTaller.ts).
// TODO: reemplazar por la consulta a Supabase (diagnósticos, fallas, órdenes y pagos).
import { precioReferencia } from "@/lib/catalogo";

export type Marca = "OEM" | "GM";

export type FallaEnviada = {
  piezaId: string; // ID del catálogo (lib/catalogo.ts)
  manoDeObra: number;
  marcaElegida?: Marca; // solo cuando el cliente ya pagó y compró esa pieza
};

export type DiagnosticoDemo = {
  descripcion: string;
  enviadoEn: string;
  fallas: FallaEnviada[];
  pago?: { pagadoEn: string; referencia: string }; // referencia CoDi (numRef)
  reparacionEn?: string;
  listoEn?: string;
  entregadoEn?: string;
};

export const DIAGNOSTICOS_DEMO: Record<string, DiagnosticoDemo> = {
  v3: {
    descripcion:
      "Ruido metálico en la parte trasera al frenar y la parte trasera se siente suelta en curvas. Se encontró la bieleta trasera derecha rota y los bujes de la barra estabilizadora trasera desgastados.",
    enviadoEn: "2026-11-14T22:58:00-06:00",
    fallas: [
      { piezaId: "SUS-TRA-10-DER", manoDeObra: precioReferencia("SUS-TRA-10-DER").manoDeObra },
      { piezaId: "SUS-TRA-09-DER", manoDeObra: precioReferencia("SUS-TRA-09-DER").manoDeObra },
      { piezaId: "SUS-TRA-09-IZQ", manoDeObra: precioReferencia("SUS-TRA-09-IZQ").manoDeObra },
    ],
  },
  v4: {
    descripcion:
      "El auto rebota al pasar topes y se inclina en curvas. Los dos coilovers delanteros tienen fuga de aceite y la base del amortiguador izquierdo está agrietada.",
    enviadoEn: "2026-11-14T22:30:00-06:00",
    fallas: [
      { piezaId: "SUS-DEL-05-IZQ", manoDeObra: precioReferencia("SUS-DEL-05-IZQ").manoDeObra, marcaElegida: "GM" },
      { piezaId: "SUS-DEL-05-DER", manoDeObra: precioReferencia("SUS-DEL-05-DER").manoDeObra, marcaElegida: "OEM" },
      { piezaId: "SUS-DEL-06-IZQ", manoDeObra: precioReferencia("SUS-DEL-06-IZQ").manoDeObra }, // el cliente no la compró
    ],
    pago: { pagadoEn: "2026-11-14T23:05:00-06:00", referencia: "0000041" },
  },
  v7: {
    descripcion: "Golpeteo en la parte trasera izquierda. El coilover trasero izquierdo perdió presión.",
    enviadoEn: "2026-11-14T22:45:00-06:00",
    fallas: [{ piezaId: "SUS-TRA-06-IZQ", manoDeObra: precioReferencia("SUS-TRA-06-IZQ").manoDeObra, marcaElegida: "OEM" }],
    pago: { pagadoEn: "2026-11-14T23:20:00-06:00", referencia: "0000038" },
  },
  v5: {
    descripcion: "La dirección vibra a alta velocidad. Las rótulas inferiores delanteras tienen juego excesivo.",
    enviadoEn: "2026-11-14T20:15:00-06:00",
    fallas: [
      { piezaId: "SUS-DEL-03-IZQ", manoDeObra: precioReferencia("SUS-DEL-03-IZQ").manoDeObra, marcaElegida: "OEM" },
      { piezaId: "SUS-DEL-03-DER", manoDeObra: precioReferencia("SUS-DEL-03-DER").manoDeObra, marcaElegida: "OEM" },
    ],
    pago: { pagadoEn: "2026-11-14T21:10:00-06:00", referencia: "0000040" },
    reparacionEn: "2026-11-14T21:30:00-06:00",
  },
  v6: {
    descripcion: "Ruido al girar a baja velocidad. La bieleta estabilizadora delantera derecha está floja.",
    enviadoEn: "2026-11-14T19:50:00-06:00",
    fallas: [{ piezaId: "SUS-DEL-09-DER", manoDeObra: precioReferencia("SUS-DEL-09-DER").manoDeObra, marcaElegida: "GM" }],
    pago: { pagadoEn: "2026-11-14T20:30:00-06:00", referencia: "0000039" },
    reparacionEn: "2026-11-14T20:45:00-06:00",
    listoEn: "2026-11-14T22:50:00-06:00",
  },
};

export const precioPieza = (piezaId: string, marca: Marca) => precioReferencia(piezaId)[marca];
