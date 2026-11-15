// Fuente de datos DEMO para las pantallas del cliente: guarda todo en memoria del navegador y se comporta
// como las funciones de la base (crear_orden, regenerar_qr, cambiar_cierre_diagnostico), para poder probar
// el flujo completo sin Supabase. Se usa mientras NEXT_PUBLIC_DATOS_CLIENTE no sea "supabase".
// Reutiliza los autos y diagnósticos de la demo del taller para que ambos lados cuenten la misma historia.
import { AUTOS_DEMO } from "@/lib/autosTaller";
import { CATALOGO, COBRO_PRUEBA_CENTAVOS, precioReferencia } from "@/lib/catalogo";
import type {
  AutoCliente,
  DatosCliente,
  Diagnostico,
  EstadoDiagnostico,
  FuenteCliente,
  LineaCompra,
  LineaOrden,
  Marca,
  OrdenCliente,
} from "@/lib/cliente/tipos";
import { MINUTOS_QR } from "@/lib/cliente/formato";

// Se sigue exportando aquí porque Mi perfil (app/(cliente)/perfil) lo importa de este archivo
export { MINUTOS_QR };
import { buscarColor } from "@/lib/colores";
import { DIAGNOSTICOS_DEMO } from "@/lib/diagnosticosDemo";

const USUARIO = { nombre: "Miguel Ángel Méndez", iniciales: "MM" };
const MECANICO = "Rafael";
const MARCAS: { idMarca: number; marca: Marca }[] = [
  { idMarca: 1, marca: "OEM" },
  { idMarca: 2, marca: "GM" },
];
const centavos = (pesos: number) => Math.round(pesos * 100);

const ESTADO_DESDE_TALLER: Record<string, EstadoDiagnostico | null> = {
  por_diagnosticar: null,
  esperando_pago: "enviado",
  pagado: "pagado",
  en_reparacion: "en_reparacion",
  listo: "listo",
  entregado: "entregado",
};

// ---------- Estado inicial (autos v3, v4, v6 y v1 de la demo del taller) ----------
function crearAutos(): AutoCliente[] {
  return ["v3", "v4", "v6", "v1"].map((id) => {
    const a = AUTOS_DEMO.find((x) => x.id === id)!;
    const d = DIAGNOSTICOS_DEMO[id];
    const estado = ESTADO_DESDE_TALLER[a.etapa];
    const folio = a.folio ? Number(a.folio.replace(/\D/g, "")) : 0;
    const diagnostico: Diagnostico | null =
      d && estado
        ? {
            folio,
            estado,
            descripcion: d.descripcion,
            mecanico: MECANICO,
            cerrado: false,
            fechaEnvio: d.enviadoEn,
            fechaReparacion: d.reparacionEn ?? null,
            fechaListo: d.listoEn ?? null,
            fechaEntrega: d.entregadoEn ?? null,
            fallas: d.fallas.map((f, i) => {
              const p = CATALOGO.find((c) => c.id === f.piezaId)!;
              return {
                idFalla: folio * 100 + i + 1,
                idPieza: p.id,
                pieza: p.nombre,
                eje: p.eje,
                lado: p.lado,
                manoObra: centavos(f.manoDeObra),
                opciones: MARCAS.map((m) => ({
                  ...m,
                  nombreComercial: `${p.nombre} ${m.marca}`,
                  precio: centavos(precioReferencia(p.id)[m.marca]),
                })),
                estado: "disponible" as const,
              };
            }),
          }
        : null;
    return {
      idCarro: Number(id.slice(1)),
      placa: a.placas,
      color: buscarColor(a.colorCodigo)?.nombre ?? "",
      fechaRegistro: a.registradoEn,
      diagnostico,
    };
  });
}

let autos = crearAutos();

function linea(folio: number, idPieza: string, marca: Marca): LineaOrden {
  const auto = autos.find((a) => a.diagnostico?.folio === folio)!;
  const f = auto.diagnostico!.fallas.find((x) => x.idPieza === idPieza)!;
  const o = f.opciones.find((x) => x.marca === marca)!;
  return { idFalla: f.idFalla, idPieza, pieza: f.pieza, eje: f.eje, lado: f.lado, idMarca: o.idMarca, marca, precio: o.precio, manoObra: f.manoObra };
}

function orden(
  idOrden: number,
  idPedido: number,
  folio: number,
  estado: OrdenCliente["estado"],
  creadaEn: string,
  lineas: LineaOrden[],
  pagadaEn: string | null = null
): OrdenCliente {
  const auto = autos.find((a) => a.diagnostico?.folio === folio)!;
  return {
    idOrden,
    idPedido,
    folio,
    idCarro: auto.idCarro,
    placa: auto.placa,
    color: auto.color,
    estado,
    monto: lineas.reduce((s, l) => s + l.precio + l.manoObra, 0),
    cobro: COBRO_PRUEBA_CENTAVOS,
    qrString: `DEMO-${idOrden}`,
    expiraEn: new Date(new Date(creadaEn).getTime() + MINUTOS_QR * 60_000).toISOString(),
    creadaEn,
    pagadaEn,
    transactionId: pagadaEn ? `TX-DEMO-${idOrden}` : null,
    lineas,
  };
}

// Historial de la demo: QR vencidos que se generaron de nuevo (mismo pedido) y los tickets pagados
let ordenes: OrdenCliente[] = [
  orden(44, 43, 42, "expirado", "2026-11-14T23:30:00-06:00", [linea(42, "SUS-TRA-09-IZQ", "OEM")]),
  orden(43, 43, 42, "expirado", "2026-11-14T23:10:00-06:00", [linea(42, "SUS-TRA-09-IZQ", "OEM")]),
  orden(41, 36, 41, "pagado", "2026-11-14T22:58:00-06:00", [linea(41, "SUS-DEL-05-IZQ", "GM"), linea(41, "SUS-DEL-05-DER", "OEM")], "2026-11-14T23:05:00-06:00"),
  orden(36, 36, 41, "expirado", "2026-11-14T22:35:00-06:00", [linea(41, "SUS-DEL-05-IZQ", "GM"), linea(41, "SUS-DEL-05-DER", "OEM")]),
  orden(39, 39, 39, "pagado", "2026-11-14T20:25:00-06:00", [linea(39, "SUS-DEL-09-DER", "GM")], "2026-11-14T20:30:00-06:00"),
];

// ---------- Reglas (las mismas que las funciones de la base) ----------
const vigente = (o: OrdenCliente) => o.estado === "pendiente" && new Date(o.expiraEn).getTime() > Date.now();
const ocupada = (idFalla: number) => ordenes.some((o) => (o.estado === "pagado" || vigente(o)) && o.lineas.some((l) => l.idFalla === idFalla));

function error(texto: string): never {
  throw new Error(texto);
}

function nuevaOrden(folio: number, lineas: LineaOrden[], idPedido?: number) {
  const id = Math.max(0, ...ordenes.map((o) => o.idOrden)) + 1;
  ordenes = [orden(id, idPedido ?? id, folio, "pendiente", new Date().toISOString(), lineas), ...ordenes];
  return id;
}

export const fuenteDemo: FuenteCliente = {
  nombre: "demo",

  async cargar(): Promise<DatosCliente> {
    // QR vencidos por tiempo → expirados (como liberar_vencidas en la base)
    ordenes = ordenes.map((o) => (o.estado === "pendiente" && !vigente(o) ? { ...o, estado: "expirado" } : o));
    const conEstado = autos.map((a) => {
      if (!a.diagnostico) return a;
      const d = a.diagnostico;
      const comprable = d.estado === "enviado" || d.estado === "pagado";
      const fallas = d.fallas.map((f) => {
        const enOrden = ordenes.find((o) => (o.estado === "pagado" || vigente(o)) && o.lineas.some((l) => l.idFalla === f.idFalla));
        const estado = enOrden ? (enOrden.estado === "pagado" ? "pagada" : "en_pago") : comprable ? "disponible" : "no_comprada";
        return { ...f, estado: estado as typeof f.estado };
      });
      return { ...a, diagnostico: { ...d, fallas } };
    });
    return structuredClone({ usuario: USUARIO, autos: conEstado, ordenes });
  },

  async crearOrden(folio: number, lineas: LineaCompra[]) {
    const auto = autos.find((a) => a.diagnostico?.folio === folio);
    const d = auto?.diagnostico;
    if (!d || (d.estado !== "enviado" && d.estado !== "pagado")) error("Diagnóstico no disponible para compra");
    if (lineas.length === 0 || lineas.some((l) => ocupada(l.idFalla))) error("Alguna pieza ya está pagada o en otro QR vigente");
    const detalle = lineas.map((l) => {
      const f = d.fallas.find((x) => x.idFalla === l.idFalla) ?? error("Pieza no válida");
      const o = f.opciones.find((x) => x.idMarca === l.idMarca) ?? error("Marca no válida");
      return linea(folio, f.idPieza, o.marca);
    });
    return nuevaOrden(folio, detalle);
  },

  async regenerarQR(idOrden: number) {
    const anterior = ordenes.find((o) => o.idOrden === idOrden) ?? error("Orden no encontrada");
    if (anterior.estado === "pagado") error("Esta orden ya está pagada");
    if (vigente(anterior)) error("El QR sigue vigente");
    const libres = anterior.lineas.filter((l) => !ocupada(l.idFalla));
    if (libres.length === 0) error("Las piezas de esta orden ya se pagaron o están en otro QR");
    ordenes = ordenes.map((o) => (o.idOrden === idOrden ? { ...o, estado: "expirado" } : o));
    return nuevaOrden(anterior.folio, libres, anterior.idPedido);
  },

  async cambiarCierre(folio: number, cerrado: boolean) {
    autos = autos.map((a) => (a.diagnostico?.folio === folio ? { ...a, diagnostico: { ...a.diagnostico, cerrado } } : a));
  },

  escuchar() {
    return () => {};
  },

  async salir() {},

  // Solo para la demo: en producción únicamente el webhook de pey marca una orden como pagada
  async simularPago(idOrden: number) {
    const o = ordenes.find((x) => x.idOrden === idOrden);
    if (!o || !vigente(o)) error("Este QR ya no se puede pagar");
    ordenes = ordenes.map((x) => (x.idOrden === idOrden ? { ...x, estado: "pagado", pagadaEn: new Date().toISOString(), transactionId: `TX-DEMO-${idOrden}` } : x));
    autos = autos.map((a) =>
      a.diagnostico?.folio === o.folio && a.diagnostico.estado === "enviado"
        ? { ...a, diagnostico: { ...a.diagnostico, estado: "pagado" } }
        : a
    );
  },
};
