"use client";

// Pantalla 3: Inicio del cliente con el registro de sus autos (diseñada para computadora)
// - Hasta 20 autos por cliente, cada uno con placas y uno de los 10 colores de fábrica del Corvette Z06 2025.
// - Si el cliente ya tiene autos, el formulario se abre solo cuando elige "Agregar otro auto".
// - Un auto se puede eliminar solo si el mecánico aún no empieza su diagnóstico (lo decide la base:
//   funciones carros_eliminables y eliminar_carro), así que tampoco tiene órdenes ni tickets.
// - Al eliminar sale un aviso abajo con "Deshacer" (como Gmail): el auto se borra de verdad hasta
//   que se acaba el tiempo, así el cliente puede arrepentirse.
// - Cada auto tiene su propio diagnóstico, recibo y seguimiento.
// Lee el usuario y sus autos de Supabase (tablas perfil, carro y diagnostico) y guarda los autos nuevos.
// La lista se actualiza en vivo cuando el mecánico cambia un diagnóstico (Supabase Realtime).
// El seguimiento en vivo de cada auto ahora se ve en su diagnóstico (/autos/[id]).
// Con al menos un auto registrado, "Terminar registro" lleva a Mis autos (/autos).
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Aviso, { mensajeDeFallo, type DatosAviso } from "@/components/Aviso";
import BarraSuperior from "@/components/BarraSuperior";
import BuscadorOpciones, { type Opcion } from "@/components/BuscadorOpciones";
import { Muestra, type AutoSeguimiento, type Etapa } from "@/components/SeguimientoEnVivo";
import { COLORES_Z06_2025, buscarColor } from "@/lib/colores";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

const SEGUNDOS_DESHACER = 6; // tiempo para arrepentirse antes de borrar el auto
const MAX_AUTOS = 20; // debe coincidir con el trigger carro_limite_autos de la base

// Modelos que atiende el taller (se buscan en el combo "Modelo de tu auto"). Por ahora solo uno;
// en la base el modelo es una constante (no hay columna). Para agregar otro, súmalo aquí y en la base.
const MODELOS = [{ id: "chevrolet-corvette-z06-2025", marca: "Chevrolet", modelo: "Corvette Z06", anio: 2025 }];
const OPCIONES_MODELO: Opcion[] = MODELOS.map((m) => ({
  id: m.id,
  etiqueta: `${m.marca} ${m.modelo} ${m.anio}`,
  detalle: "Suspensión",
}));

type Usuario = { id: string; nombre: string; iniciales: string };
// Auto ya guardado en la base (tabla carro). En la base el color se guarda con su nombre oficial.
type AutoRegistrado = {
  id: string;
  idCarro: number;
  placas: string;
  codigoColor: string;
  etapa: Etapa;
  eliminable: boolean;
};
// Auto que el cliente está capturando en el formulario (todavía no se guarda).
type AutoForm = { id: string; placas: string; color: string };
type ErroresAuto = { placas?: string; color?: string };

const TEXTO_ETAPA: Record<Etapa, string> = {
  registro: "Registro",
  diagnostico: "Diagnóstico",
  recibo: "Recibo pendiente",
};

const limpiarPlacas = (p: string) => p.toUpperCase().replace(/[^A-Z0-9]/g, "");
const codigoDeNombre = (nombre: string) => COLORES_Z06_2025.find((c) => c.nombre === nombre)?.codigo ?? "";

// Etapa del seguimiento según el último diagnóstico que el cliente puede ver (RLS oculta los borradores).
function etapaDeDiagnosticos(diagnosticos: { estado: string; fecha_creacion: string }[]): Etapa {
  if (diagnosticos.length === 0) return "diagnostico"; // registrado: espera la revisión del mecánico
  return "recibo"; // ya tiene un diagnóstico enviado (o posterior)
}

export default function InicioPage() {
  const router = useRouter();
  // Contador propio del componente para dar un id único a cada bloque de auto
  const siguienteId = useRef(1);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [registrados, setRegistrados] = useState<AutoRegistrado[]>([]);
  const [autos, setAutos] = useState<AutoForm[]>([{ id: "auto-0", placas: "", color: "" }]);
  const [errores, setErrores] = useState<Record<string, ErroresAuto>>({});
  const [aviso, setAviso] = useState<DatosAviso | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(false); // ya se leyeron los autos de la base
  const [agregando, setAgregando] = useState(false); // el cliente pidió agregar otro auto
  const [modeloId, setModeloId] = useState<string | null>(null); // modelo elegido en el buscador
  const [errorModelo, setErrorModelo] = useState<string>();
  // Eliminación con "Deshacer": el auto se oculta y se borra en la base cuando vence el tiempo.
  const [pendiente, setPendiente] = useState<{ auto: AutoRegistrado } | null>(null);
  const [restanteMs, setRestanteMs] = useState(0);
  const [mensajeBarra, setMensajeBarra] = useState<string | null>(null); // aviso corto en la barra de abajo
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendienteRef = useRef<AutoRegistrado | null>(null);
  const modeloElegido = MODELOS.find((m) => m.id === modeloId);

  const disponibles = MAX_AUTOS - registrados.length;
  // El formulario se muestra al cliente sin autos o cuando él decide agregar otro; nunca se le insiste.
  const mostrarFormulario = cargado && disponibles > 0 && (registrados.length === 0 || agregando);
  const formulario = mostrarFormulario ? autos.slice(0, disponibles) : [];

  const cargar = useCallback(async () => {
    try {
      const supabase = crearClienteNavegador();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: perfil } = await supabase
        .from("perfil")
        .select("rol, nombre, apellido_paterno")
        .eq("id_perfil", user.id)
        .maybeSingle();
      if (!perfil) {
        router.replace("/login");
        return;
      }
      if (perfil.rol === "mecanico") {
        router.replace("/taller");
        return;
      }
      setUsuario({
        id: user.id,
        nombre: `${perfil.nombre} ${perfil.apellido_paterno}`,
        iniciales: `${perfil.nombre[0] ?? ""}${perfil.apellido_paterno[0] ?? ""}`.toUpperCase(),
      });

      const [{ data: carros, error }, { data: eliminables, error: errorEliminables }] = await Promise.all([
        supabase
          .from("carro")
          .select("id_carro, placa, color, diagnostico ( estado, fecha_creacion )")
          .eq("id_cliente", user.id)
          .order("id_carro"),
        // Autos sin ningún diagnóstico (ni borrador, que el cliente no ve): los únicos que puede eliminar
        supabase.rpc("carros_eliminables"),
      ]);
      if (errorEliminables) {
        // Normalmente significa que falta correr en Supabase el SQL del paso 6 (docs/base-de-datos.md).
        console.error("[TallerToGo] carros_eliminables (¿falta el paso 6 del SQL?):", errorEliminables);
      }
      const idsEliminables = new Set<number>(eliminables ?? []);
      if (error) {
        console.error("[TallerToGo] carros:", error);
        setAviso({ tipo: "error", texto: "No se pudieron cargar tus autos. Recarga la página." });
        return;
      }
      setRegistrados(
        (carros ?? []).map((c) => ({
          id: `carro-${c.id_carro}`,
          idCarro: c.id_carro,
          placas: c.placa,
          codigoColor: codigoDeNombre(c.color),
          etapa: etapaDeDiagnosticos(c.diagnostico ?? []),
          eliminable: idsEliminables.has(c.id_carro),
        }))
      );
      setCargado(true);
    } catch (fallo) {
      setAviso({ tipo: "error", texto: mensajeDeFallo(fallo) });
    }
  }, [router]);

  useEffect(() => {
    // Seguimiento en vivo: se recarga cuando cambia algún diagnóstico visible para el cliente.
    const supabase = crearClienteNavegador();
    const canal = supabase
      .channel("seguimiento-cliente")
      .on("postgres_changes", { event: "*", schema: "public", table: "diagnostico" }, () => {
        void cargar();
      })
      // La carga inicial se hace cuando el canal responde (conectado o con error),
      // así los datos llegan aunque Realtime no esté disponible.
      .subscribe(() => {
        void cargar();
      });
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [cargar]);

  function cambiarCantidad(n: number) {
    const cantidad = Math.min(disponibles, Math.max(1, n));
    const nuevos =
      cantidad > formulario.length
        ? [
            ...formulario,
            ...Array.from({ length: cantidad - formulario.length }, () => ({
              id: `auto-${siguienteId.current++}`,
              placas: "",
              color: "",
            })),
          ]
        : formulario.slice(0, cantidad);
    setAutos(nuevos);
    setAviso(null);
  }

  function actualizar(id: string, campo: "placas" | "color", valor: string) {
    setAutos((prev) => prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
    setErrores((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: undefined } }));
    setAviso(null);
  }

  function validar() {
    const e: Record<string, ErroresAuto> = {};
    const vistas = new Set<string>(registrados.map((r) => limpiarPlacas(r.placas)));
    for (const a of formulario) {
      const placas = limpiarPlacas(a.placas);
      const err: ErroresAuto = {};
      if (!placas) err.placas = "Escribe las placas.";
      else if (placas.length < 5 || placas.length > 8) err.placas = "Revisa las placas.";
      else if (vistas.has(placas)) err.placas = "Estas placas ya están en otro auto.";
      vistas.add(placas);
      if (!a.color) err.color = "Elige el color.";
      if (err.placas || err.color) e[a.id] = err;
    }
    return e;
  }

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuario || formulario.length === 0) return;
    const e = validar();
    setErrores(e);
    setAviso(null);
    const faltaModelo = !modeloElegido;
    setErrorModelo(faltaModelo ? "Elige el modelo de tu auto." : undefined);
    if (Object.keys(e).length > 0 || faltaModelo) {
      setAviso({ tipo: "error", texto: "Revisa los datos marcados." });
      return;
    }

    setGuardando(true);
    try {
      const supabase = crearClienteNavegador();
      const cantidad = formulario.length;
      const { error } = await supabase.from("carro").insert(
        formulario.map((a) => ({
          id_cliente: usuario.id,
          placa: limpiarPlacas(a.placas),
          color: buscarColor(a.color)!.nombre,
        }))
      );

      if (error) {
        console.error("[TallerToGo] insert carro:", error);
        setAviso({
          tipo: "error",
          texto:
            error.code === "23505"
              ? "Alguna de estas placas ya está registrada."
              : error.code === "P0001" || error.message.includes("hasta")
                ? `Solo puedes registrar hasta ${MAX_AUTOS} autos.`
                : "No se pudieron registrar los autos. Intenta de nuevo.",
        });
        return;
      }

      setAutos([{ id: `auto-${siguienteId.current++}`, placas: "", color: "" }]);
      setAgregando(false);
      setModeloId(null);
      await cargar();
      setAviso({
        tipo: "exito",
        texto: cantidad === 1 ? "¡Listo! Registramos tu auto." : `¡Listo! Registramos tus ${cantidad} autos.`,
      });
    } catch (fallo) {
      setAviso({ tipo: "error", texto: mensajeDeFallo(fallo) });
    } finally {
      setGuardando(false);
    }
  }

  function abrirFormulario() {
    setAutos([{ id: `auto-${siguienteId.current++}`, placas: "", color: "" }]);
    setErrores({});
    setModeloId(null);
    setErrorModelo(undefined);
    setAviso(null);
    setAgregando(true);
  }

  function cancelarFormulario() {
    setErrores({});
    setAviso(null);
    setAgregando(false);
  }

  // Borra en la base. Si falla (por ejemplo, el mecánico empezó el diagnóstico mientras tanto), el auto vuelve.
  async function borrarEnLaBase(auto: AutoRegistrado) {
    try {
      const { error } = await crearClienteNavegador().rpc("eliminar_carro", { p_id_carro: auto.idCarro });
      if (error) {
        console.error("[TallerToGo] eliminar_carro:", error);
        setAviso({
          tipo: "error",
          texto:
            error.hint === "con_diagnostico"
              ? `No se pudo eliminar ${auto.placas}: el mecánico ya empezó su diagnóstico.`
              : `No se pudo eliminar ${auto.placas}. Intenta de nuevo.`,
        });
      } else {
        mostrarMensajeBarra(`Eliminamos el auto ${auto.placas}.`);
      }
    } catch (fallo) {
      setAviso({ tipo: "error", texto: mensajeDeFallo(fallo) });
    } finally {
      await cargar();
    }
  }

  function mostrarMensajeBarra(texto: string) {
    setMensajeBarra(texto);
    setTimeout(() => setMensajeBarra((actual) => (actual === texto ? null : actual)), 3000);
  }

  function pedirEliminar(auto: AutoRegistrado) {
    // Si ya había otro auto esperando, ese se elimina de una vez (como en Gmail)
    if (temporizador.current) clearTimeout(temporizador.current);
    if (pendienteRef.current) void borrarEnLaBase(pendienteRef.current);

    setAviso(null);
    setMensajeBarra(null);
    pendienteRef.current = auto;
    setPendiente({ auto });
    setRestanteMs(SEGUNDOS_DESHACER * 1000);
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      pendienteRef.current = null;
      setPendiente(null);
      void borrarEnLaBase(auto);
    }, SEGUNDOS_DESHACER * 1000);
  }

  function deshacer() {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
    const auto = pendienteRef.current;
    pendienteRef.current = null;
    setPendiente(null);
    if (auto) mostrarMensajeBarra(`Listo, ${auto.placas} sigue registrado.`);
  }

  // Cuenta regresiva de la barra de "Deshacer"
  useEffect(() => {
    if (!pendiente) return;
    const id = setInterval(() => setRestanteMs((ms) => Math.max(0, ms - 100)), 100);
    return () => clearInterval(id);
  }, [pendiente]);

  // Si el cliente cierra o recarga la pestaña con una eliminación pendiente, el navegador le pregunta antes.
  useEffect(() => {
    if (!pendiente) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [pendiente]);

  // Si sale de la pantalla dentro de la app con una eliminación pendiente, se aplica en ese momento.
  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      const auto = pendienteRef.current;
      if (auto) void crearClienteNavegador().rpc("eliminar_carro", { p_id_carro: auto.idCarro });
    };
  }, []);

  async function salir() {
    try {
      if (pendienteRef.current) {
        if (temporizador.current) clearTimeout(temporizador.current);
        temporizador.current = null;
        const auto = pendienteRef.current;
        pendienteRef.current = null;
        await crearClienteNavegador().rpc("eliminar_carro", { p_id_carro: auto.idCarro });
      }
      await crearClienteNavegador().auth.signOut();
    } finally {
      router.push("/login");
    }
  }

  // Seguimiento: primero los autos guardados y después los que se están capturando.
  // El auto que espera ser eliminado ya no se muestra (vuelve si el cliente pulsa "Deshacer").
  const registradosVisibles = registrados.filter((r) => r.id !== pendiente?.auto.id);
  const autosSeguimiento: AutoSeguimiento[] = [
    ...registradosVisibles.map((r) => ({
      id: r.id,
      etiqueta: r.placas,
      hex: buscarColor(r.codigoColor)?.hex,
      etapa: r.etapa,
    })),
    ...formulario.map((a, i) => ({
      id: a.id,
      etiqueta: limpiarPlacas(a.placas) || `Auto ${registrados.length + i + 1}`,
      hex: buscarColor(a.color)?.hex,
      etapa: "registro" as const,
    })),
  ];
  const nombreColorDe = (id: string) => {
    const registrado = registrados.find((r) => r.id === id);
    const codigo = registrado ? registrado.codigoColor : formulario.find((a) => a.id === id)?.color;
    return buscarColor(codigo ?? "")?.nombre ?? "Sin color";
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BarraSuperior
        derecha={
          <div className="flex items-center gap-3 text-sm text-suave">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-tinta text-[13px] font-semibold text-acento">
              {usuario?.iniciales ?? ""}
            </span>
            {usuario?.nombre ?? "Cargando…"}
            <button
              type="button"
              onClick={salir}
              className="ml-1 cursor-pointer rounded-lg border border-borde bg-tarjeta px-3.5 py-2 font-semibold text-tinta hover:border-tinta"
            >
              Salir
            </button>
          </div>
        }
      />

      <main className="grid flex-1 grid-cols-[520px_1fr]">
        {/* Panel izquierdo: registro de autos */}
        <form onSubmit={registrar} noValidate className="border-r border-borde bg-tarjeta px-12 py-7">
          <h1 className="font-titulo text-[28px] leading-none font-semibold">
            {registrados.length > 0 && !mostrarFormulario ? "Tus autos" : "Registra tu auto"}
          </h1>
          <p className="mt-2 text-sm text-suave">
            Por ahora el taller atiende solo este modelo.
            {registrados.length > 0 &&
              (disponibles > 0
                ? ` Tienes ${registradosVisibles.length} ${registradosVisibles.length === 1 ? "auto registrado" : "autos registrados"}.`
                : ` Ya registraste el máximo de ${MAX_AUTOS} autos.`)}
          </p>

          {mostrarFormulario && (
            <div className="mt-5">
              <BuscadorOpciones
                id="modelo"
                etiqueta="Modelo de tu auto"
                placeholder="Busca marca, modelo o año"
                opciones={OPCIONES_MODELO}
                valor={modeloId}
                error={errorModelo}
                onChange={(id) => {
                  setModeloId(id);
                  setErrorModelo(undefined);
                  setAviso(null);
                }}
              />
              {modeloElegido && (
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-[10px] border border-borde bg-fondo px-4 py-3.5">
                  {[
                    ["Marca", modeloElegido.marca],
                    ["Modelo", modeloElegido.modelo],
                    ["Año", String(modeloElegido.anio)],
                  ].map(([etiqueta, valor]) => (
                    <div key={etiqueta}>
                      <p className="text-xs text-suave">{etiqueta}</p>
                      <p className="font-semibold">{valor}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cliente con autos: el formulario solo se abre si él lo pide */}
          {cargado && registrados.length > 0 && disponibles > 0 && !mostrarFormulario && (
            <button
              type="button"
              onClick={abrirFormulario}
              className="mt-5 h-12 w-full cursor-pointer rounded-lg border border-borde bg-tarjeta font-titulo text-[17px] font-semibold tracking-wide text-tinta hover:border-tinta"
            >
              + Agregar otro auto
            </button>
          )}

          {mostrarFormulario && (
          <>
          <p id="cantidad-label" className="mt-5 text-sm font-semibold">
            ¿Cuántos autos vas a registrar?
          </p>
          <div className="mt-1.5 flex items-center gap-3.5">
            <div className="flex h-11 overflow-hidden rounded-lg border border-borde" role="group" aria-labelledby="cantidad-label">
              <button
                type="button"
                onClick={() => cambiarCantidad(formulario.length - 1)}
                disabled={formulario.length <= 1}
                aria-label="Quitar un auto"
                className="w-11 cursor-pointer text-xl disabled:cursor-default disabled:text-[#C9CBCF]"
              >
                −
              </button>
              <span className="flex w-[52px] items-center justify-center border-x border-borde text-[17px] font-semibold" aria-live="polite">
                {formulario.length}
              </span>
              <button
                type="button"
                onClick={() => cambiarCantidad(formulario.length + 1)}
                disabled={formulario.length >= disponibles}
                aria-label="Agregar un auto"
                className="w-11 cursor-pointer text-xl disabled:cursor-default disabled:text-[#C9CBCF]"
              >
                +
              </button>
            </div>
            <span className="text-[13px] text-suave">
              Puedes registrar hasta {disponibles} {disponibles === 1 ? "auto más" : "autos más"}
            </span>
          </div>

          {formulario.map((auto, i) => {
            const err = errores[auto.id] ?? {};
            const color = buscarColor(auto.color);
            return (
              <fieldset key={auto.id} className="mt-3 rounded-[10px] border border-borde px-4 pt-1 pb-3.5">
                <legend className="sr-only">Auto {i + 1}</legend>
                <p className="mt-2.5 font-titulo text-[17px] font-semibold" aria-hidden="true">
                  Auto {registrados.length + i + 1}
                </p>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                  <div>
                    <label htmlFor={`${auto.id}-placas`} className="mt-2.5 block text-sm font-semibold">
                      Placas
                    </label>
                    <input
                      id={`${auto.id}-placas`}
                      placeholder="ABC-123-D"
                      value={auto.placas}
                      onChange={(e) => actualizar(auto.id, "placas", e.target.value.toUpperCase())}
                      aria-invalid={Boolean(err.placas)}
                      aria-describedby={err.placas ? `${auto.id}-placas-error` : undefined}
                      className={`mt-1.5 h-12 w-full rounded-lg border bg-tarjeta px-3 text-base uppercase outline-none placeholder:normal-case placeholder:text-suave/70 focus:border-tinta ${
                        err.placas ? "border-error" : "border-borde"
                      }`}
                    />
                    {err.placas && <MensajeError id={`${auto.id}-placas-error`} texto={err.placas} />}
                  </div>
                  <div>
                    <label htmlFor={`${auto.id}-color`} className="mt-2.5 block text-sm font-semibold">
                      Color
                    </label>
                    <div className="relative mt-1.5">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                        <Muestra hex={color?.hex} tamano={16} />
                      </span>
                      <select
                        id={`${auto.id}-color`}
                        value={auto.color}
                        onChange={(e) => actualizar(auto.id, "color", e.target.value)}
                        aria-invalid={Boolean(err.color)}
                        aria-describedby={err.color ? `${auto.id}-color-error` : undefined}
                        className={`h-12 w-full cursor-pointer truncate rounded-lg border bg-tarjeta pr-3 pl-9 text-[15px] outline-none focus:border-tinta ${
                          auto.color ? "text-tinta" : "text-suave/70"
                        } ${err.color ? "border-error" : "border-borde"}`}
                      >
                        <option value="" disabled>
                          Elige el color
                        </option>
                        {COLORES_Z06_2025.map((c) => (
                          <option key={c.codigo} value={c.codigo} className="text-tinta">
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    {err.color && <MensajeError id={`${auto.id}-color-error`} texto={err.color} />}
                  </div>
                </div>
              </fieldset>
            );
          })}

          {/* Único botón de acento de la pantalla */}
          <button
            type="submit"
            disabled={guardando || !usuario}
            className="mt-6 h-12 w-full cursor-pointer rounded-lg bg-acento font-titulo text-[17px] font-semibold tracking-wide text-tinta transition hover:brightness-95 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
          >
            {guardando
              ? "Registrando…"
              : formulario.length === 1
                ? "Registrar auto"
                : `Registrar ${formulario.length} autos`}
          </button>
          {registrados.length > 0 && (
            <button
              type="button"
              onClick={cancelarFormulario}
              disabled={guardando}
              className="mt-2.5 h-11 w-full cursor-pointer rounded-lg border border-borde bg-tarjeta font-semibold text-suave hover:border-tinta hover:text-tinta"
            >
              Cancelar
            </button>
          )}
          </>
          )}

          {aviso && <Aviso {...aviso} className="mt-4" />}

          {/* Con al menos un auto registrado ya puede terminar el registro e ir a Mis autos.
              Es el botón de acento solo cuando el formulario está cerrado (un solo acento por pantalla). */}
          {cargado && registradosVisibles.length > 0 && (
            <div className="mt-6 border-t border-borde pt-5">
              <Link
                href="/autos"
                className={`flex w-full items-center justify-center gap-2 rounded-lg font-titulo text-[17px] font-semibold tracking-wide text-tinta transition ${
                  mostrarFormulario
                    ? "h-11 border border-borde bg-tarjeta hover:border-tinta"
                    : "h-12 bg-acento hover:brightness-95 active:scale-[0.99]"
                }`}
              >
                Terminar registro
                <span aria-hidden="true">→</span>
              </Link>
              <p className="mt-2 text-center text-[13px] text-suave">
                Podrás ver el diagnóstico y el avance de cada auto en Mis autos.
              </p>
            </div>
          )}
        </form>

        {/* Derecha: tarjeta de los autos */}
        <section className="flex items-center justify-center px-12 py-10">
          <div className="w-full max-w-[520px] overflow-hidden rounded-xl border border-borde bg-tarjeta">
            <div className="flex h-[200px] items-center justify-center border-b border-borde bg-[#E9E9E6]">
              <Image
                src="/corvette-z06.png"
                alt="Chevrolet Corvette Z06 2025"
                width={426}
                height={180}
                priority
                className="h-auto max-h-[180px] w-auto max-w-[88%]"
              />
            </div>
            <div className="px-6 py-5">
              <p className="flex items-center gap-2 text-[13px] text-suave">
                {autosSeguimiento.length === 1 ? "Tu auto" : "Tus autos"}
                <span className="rounded-full bg-tinta px-2.5 py-px text-xs font-semibold text-acento">
                  {autosSeguimiento.length}
                </span>
              </p>
              <p className="mt-0.5 font-titulo text-2xl font-semibold">{OPCIONES_MODELO[0].etiqueta}</p>

              <ul className="mt-3.5 flex flex-col gap-2">
                {autosSeguimiento.map((a) => {
                  const nombreColor = nombreColorDe(a.id);
                  const registrado = registrados.find((r) => r.id === a.id);
                  return (
                    <li key={a.id} className="rounded-lg border border-borde">
                      <div className="flex items-center gap-2 pr-2">
                        <div className="flex flex-1 items-center gap-3 px-3 py-2.5 text-left">
                          <Muestra hex={a.hex} tamano={14} />
                          <span className="flex-1">
                            <span className="block text-[15px] font-semibold">{a.etiqueta}</span>
                            <span className="text-[13px] text-suave">{nombreColor}</span>
                          </span>
                          <span className="rounded-full border border-borde bg-fondo px-2.5 py-0.5 text-xs font-semibold">
                            {TEXTO_ETAPA[a.etapa]}
                          </span>
                        </div>
                        {registrado?.eliminable && (
                          <button
                            type="button"
                            onClick={() => pedirEliminar(registrado)}
                            aria-label={`Eliminar el auto ${a.etiqueta}`}
                            className="cursor-pointer rounded-md px-2 py-1.5 text-[13px] font-semibold text-suave hover:text-error"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 border-t border-borde pt-3.5 text-sm text-suave">
                Cada auto tiene su propio diagnóstico, recibo y seguimiento en vivo. Puedes eliminar un auto mientras el
                mecánico no empiece su diagnóstico; tendrás unos segundos para deshacerlo.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Barra de "Deshacer" (como Gmail): abajo a la izquierda */}
      {(pendiente || mensajeBarra) && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-6 z-50 w-[380px] overflow-hidden rounded-lg bg-tinta text-[15px] text-white shadow-[0_8px_24px_rgba(17,18,20,0.25)]"
        >
          <div className="flex items-center gap-4 px-4 py-3">
            <p className="flex-1">
              {pendiente ? (
                <>
                  Eliminaste <span className="font-semibold">{pendiente.auto.placas}</span>
                  <span className="text-white/60"> · {Math.ceil(restanteMs / 1000)} s</span>
                </>
              ) : (
                mensajeBarra
              )}
            </p>
            {pendiente && (
              <button
                type="button"
                onClick={deshacer}
                className="cursor-pointer rounded-md px-2 py-1 font-titulo text-[17px] font-semibold text-acento hover:bg-white/10"
              >
                Deshacer
              </button>
            )}
          </div>
          {pendiente && (
            <div className="h-1 bg-white/15" aria-hidden="true">
              <div
                className="h-full bg-acento transition-[width] duration-100 ease-linear"
                style={{ width: `${(restanteMs / (SEGUNDOS_DESHACER * 1000)) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MensajeError({ id, texto }: { id: string; texto: string }) {
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-sm text-error">
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4ZM10 14.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
      {texto}
    </p>
  );
}
