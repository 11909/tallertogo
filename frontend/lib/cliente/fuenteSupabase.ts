// Fuente de datos SUPABASE para las pantallas del cliente.
// Necesita el SQL del paso 9 de docs/base-de-datos.md (cerrar diagnóstico, historial de QR y v_orden_cliente).
// Se activa con NEXT_PUBLIC_DATOS_CLIENTE=supabase en frontend/.env.local.
import type {
  AutoCliente,
  DatosCliente,
  Diagnostico,
  EstadoDiagnostico,
  EstadoFallaBase,
  EstadoOrden,
  Falla,
  FuenteCliente,
  LineaCompra,
  Marca,
  OrdenCliente,
} from "@/lib/cliente/tipos";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

// Filas tal como llegan de la base
type FilaDiagnostico = {
  folio: number;
  estado: EstadoDiagnostico | "borrador";
  descripcion: string | null;
  cerrado: boolean;
  fecha_creacion: string;
  fecha_envio: string | null;
  fecha_reparacion: string | null;
  fecha_listo: string | null;
  fecha_entrega: string | null;
};
type FilaCarro = { id_carro: number; placa: string; color: string; fecha_registro: string; diagnostico: FilaDiagnostico[] | null };
type FilaFalla = {
  folio: number;
  mecanico: string;
  id_falla: number;
  id_pieza: string;
  pieza: string;
  eje: string;
  lado: string;
  mano_obra_centavos: number;
  id_marca: number;
  marca: Marca;
  nombre_comercial: string;
  precio_centavos: number;
  estado_falla: EstadoFallaBase;
};
type FilaOrden = {
  id_orden: number;
  id_pedido: number;
  folio: number;
  id_carro: number;
  placa: string;
  color: string;
  estado: EstadoOrden;
  monto_centavos: number;
  qr_string: string | null;
  expira_en: string;
  fecha_creacion: string;
  fecha_pago: string | null;
  transaction_id: string | null;
  id_falla: number;
  id_pieza: string;
  pieza: string;
  eje: string;
  lado: string;
  id_marca: number;
  marca: Marca;
  precio_centavos: number;
  mano_obra_centavos: number;
};

function fallo(error: { message: string } | null, contexto: string) {
  if (!error) return;
  console.error(`[TallerToGo] ${contexto}:`, error);
  throw new Error(error.message);
}

async function pedirQR(idOrden: number) {
  const respuesta = await fetch("/api/pey/qr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idOrden }),
  });
  const datos: { error?: string } = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error ?? "No se pudo generar el QR.");
}

export const fuenteSupabase: FuenteCliente = {
  nombre: "supabase",

  async cargar(): Promise<DatosCliente | "sin_sesion"> {
    const supabase = crearClienteNavegador();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "sin_sesion";

    const { data: perfil } = await supabase
      .from("perfil")
      .select("rol, nombre, apellido_paterno")
      .eq("id_perfil", user.id)
      .maybeSingle();
    if (!perfil || perfil.rol !== "cliente") return "sin_sesion";

    // Autos con sus diagnósticos (RLS ya oculta los borradores) y todas las órdenes del cliente
    const [carros, filasOrden] = await Promise.all([
      supabase
        .from("carro")
        .select(
          "id_carro, placa, color, fecha_registro, diagnostico ( folio, estado, descripcion, cerrado, fecha_creacion, fecha_envio, fecha_reparacion, fecha_listo, fecha_entrega )"
        )
        .eq("id_cliente", user.id)
        .order("id_carro"),
      supabase.from("v_orden_cliente").select("*").order("id_orden", { ascending: false }).order("id_falla"),
    ]);
    fallo(carros.error, "carro");
    fallo(filasOrden.error, "v_orden_cliente");

    // Último diagnóstico visible de cada auto
    const ultimos = new Map<number, FilaDiagnostico>();
    for (const c of (carros.data ?? []) as FilaCarro[]) {
      const visibles = (c.diagnostico ?? []).filter((d) => d.estado !== "borrador");
      visibles.sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion));
      if (visibles[0]) ultimos.set(c.id_carro, visibles[0]);
    }

    // Fallas × marca de esos diagnósticos
    const folios = [...ultimos.values()].map((d) => d.folio);
    const filasFalla: FilaFalla[] = [];
    if (folios.length > 0) {
      const r = await supabase
        .from("v_diagnostico_cliente")
        .select(
          "folio, mecanico, id_falla, id_pieza, pieza, eje, lado, mano_obra_centavos, id_marca, marca, nombre_comercial, precio_centavos, estado_falla"
        )
        .in("folio", folios)
        .order("id_falla")
        .order("id_marca");
      fallo(r.error, "v_diagnostico_cliente");
      filasFalla.push(...((r.data ?? []) as FilaFalla[]));
    }

    const autos: AutoCliente[] = ((carros.data ?? []) as FilaCarro[]).map((c) => {
      const d = ultimos.get(c.id_carro);
      let diagnostico: Diagnostico | null = null;
      if (d) {
        const filas = filasFalla.filter((f) => f.folio === d.folio);
        const fallas = new Map<number, Falla>();
        for (const f of filas) {
          const falla =
            fallas.get(f.id_falla) ??
            fallas
              .set(f.id_falla, {
                idFalla: f.id_falla,
                idPieza: f.id_pieza,
                pieza: f.pieza,
                eje: f.eje,
                lado: f.lado,
                manoObra: f.mano_obra_centavos,
                opciones: [],
                estado: f.estado_falla,
              })
              .get(f.id_falla)!;
          falla.opciones.push({ idMarca: f.id_marca, marca: f.marca, nombreComercial: f.nombre_comercial, precio: f.precio_centavos });
        }
        diagnostico = {
          folio: d.folio,
          estado: d.estado as EstadoDiagnostico,
          descripcion: d.descripcion ?? "",
          mecanico: filas[0]?.mecanico ?? "",
          cerrado: d.cerrado,
          fechaEnvio: d.fecha_envio,
          fechaReparacion: d.fecha_reparacion,
          fechaListo: d.fecha_listo,
          fechaEntrega: d.fecha_entrega,
          fallas: [...fallas.values()],
        };
      }
      return { idCarro: c.id_carro, placa: c.placa, color: c.color, fechaRegistro: c.fecha_registro, diagnostico };
    });

    // v_orden_cliente trae una fila por línea: se agrupan por orden
    const ordenes = new Map<number, OrdenCliente>();
    for (const f of (filasOrden.data ?? []) as FilaOrden[]) {
      const o =
        ordenes.get(f.id_orden) ??
        ordenes
          .set(f.id_orden, {
            idOrden: f.id_orden,
            idPedido: f.id_pedido,
            folio: f.folio,
            idCarro: f.id_carro,
            placa: f.placa,
            color: f.color,
            estado: f.estado,
            monto: f.monto_centavos,
            qrString: f.qr_string,
            expiraEn: f.expira_en,
            creadaEn: f.fecha_creacion,
            pagadaEn: f.fecha_pago,
            transactionId: f.transaction_id,
            lineas: [],
          })
          .get(f.id_orden)!;
      o.lineas.push({
        idFalla: f.id_falla,
        idPieza: f.id_pieza,
        pieza: f.pieza,
        eje: f.eje,
        lado: f.lado,
        idMarca: f.id_marca,
        marca: f.marca,
        precio: f.precio_centavos,
        manoObra: f.mano_obra_centavos,
      });
    }

    return {
      usuario: {
        nombre: `${perfil.nombre} ${perfil.apellido_paterno}`,
        iniciales: `${perfil.nombre[0] ?? ""}${perfil.apellido_paterno[0] ?? ""}`.toUpperCase(),
      },
      autos,
      ordenes: [...ordenes.values()],
    };
  },

  async crearOrden(folio: number, lineas: LineaCompra[]) {
    const { data, error } = await crearClienteNavegador().rpc("crear_orden", {
      p_folio: folio,
      p_lineas: lineas.map((l) => ({ id_falla: l.idFalla, id_marca: l.idMarca })),
    });
    fallo(error, "crear_orden");
    const idOrden = data as number;
    await pedirQR(idOrden);
    return idOrden;
  },

  async regenerarQR(idOrden: number) {
    const { data, error } = await crearClienteNavegador().rpc("regenerar_qr", { p_id_orden: idOrden });
    fallo(error, "regenerar_qr");
    const nuevoId = data as number;
    await pedirQR(nuevoId);
    return nuevoId;
  },

  async generarQR(idOrden: number) {
    await pedirQR(idOrden);
  },

  async cambiarCierre(folio: number, cerrado: boolean) {
    const { error } = await crearClienteNavegador().rpc("cambiar_cierre_diagnostico", { p_folio: folio, p_cerrado: cerrado });
    fallo(error, "cambiar_cierre_diagnostico");
  },

  // Seguimiento en vivo: recargar cuando el mecánico cambie un diagnóstico o pey confirme un pago
  escuchar(alCambiar: () => void) {
    const supabase = crearClienteNavegador();
    const canal = supabase
      .channel("cliente-en-vivo")
      .on("postgres_changes", { event: "*", schema: "public", table: "diagnostico" }, alCambiar)
      .on("postgres_changes", { event: "*", schema: "public", table: "orden" }, alCambiar)
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  },

  async salir() {
    await crearClienteNavegador().auth.signOut();
  },
};
