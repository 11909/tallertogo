"use client";

// Estado compartido de las pantallas del cliente: carrito, órdenes (QR CoDi y tickets) y diagnósticos cerrados.
// Vive en el layout de (cliente), así que se conserva al cambiar entre Mis autos, Carrito y Pagos.
// TODO (conexión con la BD):
//   - carrito: se queda en el navegador; al confirmar se llama crear_orden(folio, líneas) por cada auto.
//   - órdenes: leer de `orden` / `v_ticket` y escuchar su cambio a 'pagado' con Supabase Realtime.
//   - "cerrar diagnóstico" todavía no existe en la base: definir dónde se guarda (ver CLAUDE.md §4).
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AUTOS_CLIENTE,
  CARRITO_DEMO,
  CLIENTE_DEMO,
  ETAPA_DESDE_TALLER,
  MINUTOS_QR,
  ORDENES_DEMO,
  type EtapaCliente,
  type LineaOrden,
  type Marca,
  type Orden,
} from "@/lib/clienteDemo";
import { DIAGNOSTICOS_DEMO } from "@/lib/diagnosticosDemo";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

type Carrito = Record<string, Record<string, Marca>>; // auto → pieza → marca
export type EstadoFalla =
  | { tipo: "disponible" }
  | { tipo: "en_pago"; ordenId: number; marca: Marca } // tiene un QR vigente sin pagar
  | { tipo: "pagada"; marca: Marca; ordenId: number };

type Valor = {
  usuario: { nombre: string; iniciales: string };
  ahora: number | null; // reloj para las cuentas regresivas (null hasta montar en el navegador)
  carrito: Carrito;
  piezasEnCarrito: number;
  ordenes: Orden[];
  cerrados: Record<string, boolean>;
  etapaDe: (autoId: string) => EtapaCliente;
  estadoOrden: (orden: Orden) => Orden["estado"];
  estadoFalla: (autoId: string, piezaId: string) => EstadoFalla;
  elegir: (autoId: string, piezaId: string, marca: Marca) => void;
  quitar: (autoId: string, piezaId: string) => void;
  confirmarCarrito: () => number[];
  generarNuevoQR: (ordenId: number) => number;
  simularPago: (ordenId: number) => void;
  alternarCierre: (autoId: string) => void;
  salir: () => void;
};

const Contexto = createContext<Valor | null>(null);

export function useCliente() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useCliente debe usarse dentro de <EstadoCliente>");
  return valor;
}

export default function EstadoCliente({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState(CLIENTE_DEMO);
  const [ahora, setAhora] = useState<number | null>(null);
  const [carrito, setCarrito] = useState<Carrito>(CARRITO_DEMO);
  const [ordenes, setOrdenes] = useState<Orden[]>(ORDENES_DEMO);
  const [cerrados, setCerrados] = useState<Record<string, boolean>>({});

  // Reloj de un segundo para la vigencia de los QR
  useEffect(() => {
    const tic = () => setAhora(Date.now());
    const id = setInterval(tic, 1000);
    const primero = setTimeout(tic, 0);
    return () => {
      clearInterval(id);
      clearTimeout(primero);
    };
  }, []);

  // Nombre del cliente con sesión (si no hay conexión con Supabase, se queda el de la demo)
  // TODO: cuando las pantallas lean de la base, mandar a /login si no hay sesión, como en /inicio.
  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const supabase = crearClienteNavegador();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: perfil } = await supabase
          .from("perfil")
          .select("nombre, apellido_paterno")
          .eq("id_perfil", user.id)
          .maybeSingle();
        if (perfil && vigente) {
          setUsuario({
            nombre: `${perfil.nombre} ${perfil.apellido_paterno}`,
            iniciales: `${perfil.nombre[0] ?? ""}${perfil.apellido_paterno[0] ?? ""}`.toUpperCase(),
          });
        }
      } catch {
        // Sin conexión: se muestran los datos de la demo
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const estadoOrden = useCallback(
    (o: Orden): Orden["estado"] =>
      o.estado === "pendiente" && ahora !== null && ahora >= new Date(o.expiraEn).getTime() ? "expirado" : o.estado,
    [ahora]
  );

  const etapaDe = useCallback(
    (autoId: string): EtapaCliente => {
      const auto = AUTOS_CLIENTE.find((a) => a.id === autoId);
      if (!auto) return "esperando";
      const etapa = ETAPA_DESDE_TALLER[auto.etapa];
      // El primer pago confirmado pasa el diagnóstico de enviado a pagado
      if (etapa === "enviado" && ordenes.some((o) => o.autoId === autoId && o.estado === "pagado")) return "pagado";
      return etapa;
    },
    [ordenes]
  );

  const estadoFalla = useCallback(
    (autoId: string, piezaId: string): EstadoFalla => {
      for (const o of ordenes) {
        if (o.autoId !== autoId) continue;
        const linea = o.lineas.find((l) => l.piezaId === piezaId);
        if (!linea) continue;
        if (o.estado === "pagado") return { tipo: "pagada", marca: linea.marca, ordenId: o.id };
        if (estadoOrden(o) === "pendiente") return { tipo: "en_pago", marca: linea.marca, ordenId: o.id };
      }
      return { tipo: "disponible" };
    },
    [ordenes, estadoOrden]
  );

  const elegir = useCallback((autoId: string, piezaId: string, marca: Marca) => {
    setCarrito((c) => ({ ...c, [autoId]: { ...(c[autoId] ?? {}), [piezaId]: marca } }));
  }, []);

  const quitar = useCallback((autoId: string, piezaId: string) => {
    setCarrito((c) => {
      const delAuto = { ...(c[autoId] ?? {}) };
      delete delAuto[piezaId];
      const copia = { ...c, [autoId]: delAuto };
      if (Object.keys(delAuto).length === 0) delete copia[autoId];
      return copia;
    });
  }, []);

  // Crea una orden pendiente (un QR) y cancela el QR pendiente anterior del mismo auto, como crear_orden.
  const nuevaOrden = useCallback((lista: Orden[], autoId: string, lineas: LineaOrden[]) => {
    const id = Math.max(0, ...lista.map((o) => o.id)) + 1;
    const creada = new Date();
    const orden: Orden = {
      id,
      autoId,
      lineas,
      estado: "pendiente",
      creadaEn: creada.toISOString(),
      expiraEn: new Date(creada.getTime() + MINUTOS_QR * 60_000).toISOString(),
    };
    const resto = lista.map((o) =>
      o.autoId === autoId && o.estado === "pendiente" ? { ...o, estado: "expirado" as const } : o
    );
    return { lista: [orden, ...resto], id };
  }, []);

  const confirmarCarrito = useCallback(() => {
    const ids: number[] = [];
    let lista = ordenes;
    for (const [autoId, piezas] of Object.entries(carrito)) {
      const manoDeObra = (piezaId: string) =>
        Math.round((DIAGNOSTICOS_DEMO[autoId]?.fallas.find((f) => f.piezaId === piezaId)?.manoDeObra ?? 0) * 100);
      const lineas = Object.entries(piezas).map(([piezaId, marca]) => ({
        piezaId,
        marca,
        manoDeObra: manoDeObra(piezaId),
      }));
      if (lineas.length === 0) continue;
      const r = nuevaOrden(lista, autoId, lineas);
      lista = r.lista;
      ids.push(r.id);
    }
    setOrdenes(lista);
    setCarrito({});
    return ids;
  }, [carrito, ordenes, nuevaOrden]);

  const generarNuevoQR = useCallback(
    (ordenId: number) => {
      const anterior = ordenes.find((o) => o.id === ordenId);
      if (!anterior) return ordenId;
      // No se vuelven a cobrar piezas que ya se pagaron en otra orden
      const pagadas = new Set(
        ordenes.filter((o) => o.autoId === anterior.autoId && o.estado === "pagado").flatMap((o) => o.lineas.map((l) => l.piezaId))
      );
      const r = nuevaOrden(
        ordenes.map((o) => (o.id === ordenId ? { ...o, estado: "expirado" as const } : o)),
        anterior.autoId,
        anterior.lineas.filter((l) => !pagadas.has(l.piezaId))
      );
      setOrdenes(r.lista);
      return r.id;
    },
    [ordenes, nuevaOrden]
  );

  // Solo para la demo: en producción únicamente el webhook de pey marca una orden como pagada.
  const simularPago = useCallback((ordenId: number) => {
    const pagadaEn = new Date().toISOString();
    setOrdenes((lista) => lista.map((o) => (o.id === ordenId ? { ...o, estado: "pagado", pagadaEn } : o)));
  }, []);

  const alternarCierre = useCallback((autoId: string) => {
    setCerrados((c) => ({ ...c, [autoId]: !c[autoId] }));
  }, []);

  const salir = useCallback(async () => {
    try {
      await crearClienteNavegador().auth.signOut();
    } catch {
      // Sin conexión: igual se regresa al login
    } finally {
      router.push("/login");
    }
  }, [router]);

  const piezasEnCarrito = Object.values(carrito).reduce((s, piezas) => s + Object.keys(piezas).length, 0);

  const valor = useMemo<Valor>(
    () => ({
      usuario,
      ahora,
      carrito,
      piezasEnCarrito,
      ordenes,
      cerrados,
      etapaDe,
      estadoOrden,
      estadoFalla,
      elegir,
      quitar,
      confirmarCarrito,
      generarNuevoQR,
      simularPago,
      alternarCierre,
      salir: () => void salir(),
    }),
    [
      usuario,
      ahora,
      carrito,
      piezasEnCarrito,
      ordenes,
      cerrados,
      etapaDe,
      estadoOrden,
      estadoFalla,
      elegir,
      quitar,
      confirmarCarrito,
      generarNuevoQR,
      simularPago,
      alternarCierre,
      salir,
    ]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
