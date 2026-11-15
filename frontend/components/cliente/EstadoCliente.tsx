"use client";

// Estado compartido de las pantallas del cliente (vive en el layout de (cliente), así que se conserva al cambiar
// entre Mis autos, Carrito y Pagos). Lee y escribe solo a través de `fuenteCliente` (demo o Supabase).
//
// Carrito: todas las piezas disponibles de cada diagnóstico entran solas al carrito con la primera marca (OEM).
// El cliente cambia la marca u omite las que no quiere. El carrito y las omisiones se guardan solo en el navegador
// (localStorage):
// en la base solo existen las órdenes (crear_orden), así que el total real lo sigue calculando el servidor.
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fuenteCliente } from "@/lib/cliente/fuente";
import { puedeComprar, type EtapaCliente } from "@/lib/cliente/formato";
import type { AutoCliente, DatosCliente, Falla, Marca, OpcionMarca, OrdenCliente } from "@/lib/cliente/tipos";

export type EstadoFalla =
  | { tipo: "disponible" }
  | { tipo: "no_comprada" }
  | { tipo: "en_pago"; marca: Marca; idOrden: number } // en un QR vigente sin pagar
  | { tipo: "pagada"; marca: Marca; idOrden: number };

export type ItemCarrito = { auto: AutoCliente; folio: number; falla: Falla; opcion: OpcionMarca };

// Un pedido son todos los QR que se generaron para las mismas piezas (al vencer uno se genera otro).
export type EstadoPedido = "pendiente" | "vencido" | "rechazado" | "pagado" | "resuelto";
export type Pedido = {
  idPedido: number;
  folio: number;
  idCarro: number;
  placa: string;
  color: string;
  intentos: OrdenCliente[]; // del más nuevo al más viejo
  ultimo: OrdenCliente;
  pagada: OrdenCliente | null;
  estado: EstadoPedido;
};

type Valor = {
  cargando: boolean;
  error: string | null;
  usuario: DatosCliente["usuario"] | null;
  autos: AutoCliente[];
  ordenes: OrdenCliente[];
  pedidos: Pedido[];
  ahora: number | null;
  demo: boolean;
  etapaDe: (auto: AutoCliente) => EtapaCliente;
  estadoOrden: (orden: OrdenCliente) => OrdenCliente["estado"];
  estadoFalla: (auto: AutoCliente, falla: Falla) => EstadoFalla;
  carrito: ItemCarrito[];
  enCarrito: (falla: Falla) => boolean;
  opcionElegida: (falla: Falla) => OpcionMarca;
  elegirMarca: (falla: Falla, idMarca: number) => void;
  omitir: (falla: Falla) => void;
  incluir: (falla: Falla) => void;
  confirmarCarrito: () => Promise<{ ids: number[]; errores: string[] }>;
  generarNuevoQR: (idOrden: number) => Promise<number>;
  generarQR?: (idOrden: number) => Promise<void>;
  cambiarCierre: (auto: AutoCliente, cerrado: boolean) => Promise<void>;
  simularPago?: (idOrden: number) => Promise<void>;
  salir: () => void;
};

const Contexto = createContext<Valor | null>(null);

export function useCliente() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useCliente debe usarse dentro de <EstadoCliente>");
  return valor;
}

const fuente = fuenteCliente;
const CLAVE_CARRITO = `paddock:carrito:${fuenteCliente.nombre}`;

export default function EstadoCliente({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosCliente | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState<number | null>(null);
  const [marcas, setMarcas] = useState<Record<number, number>>({}); // idFalla → idMarca elegida
  const [omitidas, setOmitidas] = useState<Record<number, true>>({}); // idFalla que el cliente quitó

  const recargar = useCallback(async () => {
    try {
      const r = await fuente.cargar();
      if (r === "sin_sesion") {
        router.replace("/login");
        return;
      }
      setDatos(r);
      setError(null);
    } catch (fallo) {
      console.error("[TallerToGo] cargar cliente:", fallo);
      setError("No se pudieron cargar tus datos. Revisa tu conexión y recarga la página.");
    }
  }, [router]);

  // Carga inicial y seguimiento en vivo (Realtime en Supabase)
  useEffect(() => {
    const primera = setTimeout(() => void recargar(), 0);
    const dejar = fuente.escuchar(() => void recargar());
    return () => {
      clearTimeout(primera);
      dejar();
    };
  }, [recargar]);

  // El carrito (marca elegida y piezas omitidas) se guarda en este navegador para que no se pierda al recargar
  const [carritoListo, setCarritoListo] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO) ?? "null");
        if (guardado?.marcas) setMarcas(guardado.marcas);
        if (guardado?.omitidas) setOmitidas(guardado.omitidas);
      } catch {
        // Sin acceso al almacenamiento: el carrito vive solo en memoria
      }
      setCarritoListo(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!carritoListo) return;
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify({ marcas, omitidas }));
    } catch {
      // Sin acceso al almacenamiento
    }
  }, [carritoListo, marcas, omitidas]);

  // Reloj de un segundo para la vigencia de los QR
  useEffect(() => {
    const tic = () => setAhora(Date.now());
    const primero = setTimeout(tic, 0);
    const id = setInterval(tic, 1000);
    return () => {
      clearTimeout(primero);
      clearInterval(id);
    };
  }, []);

  const ordenes = useMemo(() => datos?.ordenes ?? [], [datos]);
  const autos = useMemo(() => datos?.autos ?? [], [datos]);

  // Un QR pendiente cuya hora ya pasó se trata como vencido (la base hace lo mismo en v_orden_cliente)
  const estadoOrden = useCallback(
    (o: OrdenCliente): OrdenCliente["estado"] =>
      o.estado === "pendiente" && ahora !== null && ahora >= new Date(o.expiraEn).getTime() ? "expirado" : o.estado,
    [ahora]
  );

  const etapaDe = useCallback((auto: AutoCliente): EtapaCliente => auto.diagnostico?.estado ?? "esperando", []);

  const estadoFalla = useCallback(
    (auto: AutoCliente, falla: Falla): EstadoFalla => {
      for (const o of ordenes) {
        const linea = o.lineas.find((l) => l.idFalla === falla.idFalla);
        if (!linea) continue;
        if (o.estado === "pagado") return { tipo: "pagada", marca: linea.marca, idOrden: o.idOrden };
        if (estadoOrden(o) === "pendiente") return { tipo: "en_pago", marca: linea.marca, idOrden: o.idOrden };
      }
      return puedeComprar(etapaDe(auto)) ? { tipo: "disponible" } : { tipo: "no_comprada" };
    },
    [ordenes, estadoOrden, etapaDe]
  );

  const opcionElegida = useCallback(
    (falla: Falla) => falla.opciones.find((o) => o.idMarca === marcas[falla.idFalla]) ?? falla.opciones[0],
    [marcas]
  );

  // Carrito: piezas disponibles que el cliente no ha omitido
  const carrito = useMemo<ItemCarrito[]>(
    () =>
      autos.flatMap((auto) =>
        (auto.diagnostico?.fallas ?? [])
          .filter((f) => estadoFalla(auto, f).tipo === "disponible" && !omitidas[f.idFalla])
          .map((f) => ({ auto, folio: auto.diagnostico!.folio, falla: f, opcion: opcionElegida(f) }))
      ),
    [autos, estadoFalla, omitidas, opcionElegida]
  );
  const enCarrito = useCallback((f: Falla) => carrito.some((i) => i.falla.idFalla === f.idFalla), [carrito]);

  const elegirMarca = useCallback((f: Falla, idMarca: number) => {
    setMarcas((m) => ({ ...m, [f.idFalla]: idMarca }));
    setOmitidas((o) => {
      const copia = { ...o };
      delete copia[f.idFalla];
      return copia;
    });
  }, []);
  const omitir = useCallback((f: Falla) => setOmitidas((o) => ({ ...o, [f.idFalla]: true })), []);
  const incluir = useCallback((f: Falla) => {
    setOmitidas((o) => {
      const copia = { ...o };
      delete copia[f.idFalla];
      return copia;
    });
  }, []);

  // Un QR (orden) por auto, porque cada diagnóstico se paga con sus propias órdenes
  const confirmarCarrito = useCallback(async () => {
    const porFolio = new Map<number, ItemCarrito[]>();
    for (const i of carrito) porFolio.set(i.folio, [...(porFolio.get(i.folio) ?? []), i]);
    const ids: number[] = [];
    const errores: string[] = [];
    for (const [folio, items] of porFolio) {
      try {
        ids.push(await fuente.crearOrden(folio, items.map((i) => ({ idFalla: i.falla.idFalla, idMarca: i.opcion.idMarca }))));
      } catch (fallo) {
        errores.push(`${items[0].auto.placa}: ${fallo instanceof Error ? fallo.message : "no se pudo generar el QR"}`);
      }
    }
    await recargar();
    return { ids, errores };
  }, [carrito, recargar]);

  const generarNuevoQR = useCallback(
    async (idOrden: number) => {
      try {
        const id = await fuente.regenerarQR(idOrden);
        await recargar();
        return id;
      } catch (fallo) {
        await recargar();
        throw fallo;
      }
    },
    [recargar]
  );

  const generarQR = useCallback(
    async (idOrden: number) => {
      if (!fuente.generarQR) throw new Error("La generación de QR no está disponible en esta fuente de datos.");
      await fuente.generarQR(idOrden);
      await recargar();
    },
    [recargar]
  );

  // Cerrar: las piezas omitidas quedan sin comprar. Reabrir: vuelven al carrito.
  const cambiarCierre = useCallback(
    async (auto: AutoCliente, cerrado: boolean) => {
      if (!auto.diagnostico) return;
      await fuente.cambiarCierre(auto.diagnostico.folio, cerrado);
      if (!cerrado) {
        const ids = new Set(auto.diagnostico.fallas.map((f) => f.idFalla));
        setOmitidas((o) => Object.fromEntries(Object.entries(o).filter(([id]) => !ids.has(Number(id)))) as Record<number, true>);
      }
      await recargar();
    },
    [recargar]
  );

  const simularPago = useMemo(
    () =>
      fuente.simularPago
        ? async (idOrden: number) => {
            await fuente.simularPago!(idOrden);
            await recargar();
          }
        : undefined,
    [recargar]
  );

  const pedidos = useMemo<Pedido[]>(() => {
    const grupos = new Map<number, OrdenCliente[]>();
    for (const o of ordenes) grupos.set(o.idPedido, [...(grupos.get(o.idPedido) ?? []), o]);
    return [...grupos.entries()].map(([idPedido, lista]) => {
      const intentos = [...lista].sort((a, b) => b.idOrden - a.idOrden);
      const ultimo = intentos[0];
      const pagada = intentos.find((o) => o.estado === "pagado") ?? null;
      const efectivo = estadoOrden(ultimo);
      // Un pedido vencido cuyas piezas ya se pagaron o están en otro QR ya no necesita acción
      const resuelto =
        !pagada &&
        efectivo !== "pendiente" &&
        ultimo.lineas.every((l) =>
          ordenes.some(
            (o) => o.idPedido !== idPedido && (o.estado === "pagado" || estadoOrden(o) === "pendiente") && o.lineas.some((x) => x.idFalla === l.idFalla)
          )
        );
      const estado: EstadoPedido = pagada
        ? "pagado"
        : resuelto
          ? "resuelto"
          : efectivo === "pendiente"
            ? "pendiente"
            : efectivo === "rechazado"
              ? "rechazado"
              : "vencido";
      return { idPedido, folio: ultimo.folio, idCarro: ultimo.idCarro, placa: ultimo.placa, color: ultimo.color, intentos, ultimo, pagada, estado };
    });
  }, [ordenes, estadoOrden]);

  const salir = useCallback(() => {
    void (async () => {
      try {
        await fuente.salir();
      } finally {
        router.push("/login");
      }
    })();
  }, [router]);

  const valor = useMemo<Valor>(
    () => ({
      cargando: datos === null && error === null,
      error,
      usuario: datos?.usuario ?? null,
      autos,
      ordenes,
      pedidos,
      ahora,
      demo: fuente.nombre === "demo",
      etapaDe,
      estadoOrden,
      estadoFalla,
      carrito,
      enCarrito,
      opcionElegida,
      elegirMarca,
      omitir,
      incluir,
      confirmarCarrito,
      generarNuevoQR,
      generarQR: fuente.generarQR ? generarQR : undefined,
      cambiarCierre,
      simularPago,
      salir,
    }),
    [
      datos,
      error,
      autos,
      ordenes,
      pedidos,
      ahora,
      etapaDe,
      estadoOrden,
      estadoFalla,
      carrito,
      enCarrito,
      opcionElegida,
      elegirMarca,
      omitir,
      incluir,
      confirmarCarrito,
      generarNuevoQR,
      generarQR,
      cambiarCierre,
      simularPago,
      salir,
    ]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

// Para las pantallas: mientras carga o si falló la carga
export function EstadoCarga() {
  const { cargando, error } = useCliente();
  if (error)
    return (
      <p role="alert" className="rounded-xl border border-error/40 bg-error/5 px-5 py-4 text-[15px] text-error">
        {error}
      </p>
    );
  if (cargando) return <p className="py-10 text-center text-sm text-suave">Cargando…</p>;
  return null;
}
