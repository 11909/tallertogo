"use client";

// Pantalla 4: Autos por atender (mecánico, diseñada para computadora)
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import BarraSuperior from "@/components/BarraSuperior";
import MenuMecanico from "@/components/MenuMecanico";
import Aviso, { mensajeDeFallo, type DatosAviso } from "@/components/Aviso";
import { Muestra } from "@/components/SeguimientoEnVivo";
import { buscarColor, COLORES_Z06_2025 } from "@/lib/colores";
import { ETAPAS_TALLER, hora, normalizar, ordenarPorTurno, turnoDe, type AutoTaller, type EtapaTaller } from "@/lib/autosTaller";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

type Filtro = "todos" | "por_diagnosticar" | "esperando_pago" | "en_reparacion" | "listo" | "entregado";

const FILTROS: { clave: Filtro; texto: string }[] = [
  { clave: "todos", texto: "Todos" },
  { clave: "por_diagnosticar", texto: "Por diagnosticar" },
  { clave: "esperando_pago", texto: "Esperando pago" },
  { clave: "en_reparacion", texto: "En reparación" },
  { clave: "listo", texto: "Listos" },
  { clave: "entregado", texto: "Entregados" },
];

// "En reparación" incluye los pagados que aún no se empiezan a reparar
const coincideFiltro = (etapa: EtapaTaller, filtro: Filtro) =>
  filtro === "todos" || etapa === filtro || (filtro === "en_reparacion" && etapa === "pagado");

const CONTADORES: { filtro: Filtro; texto: string }[] = [
  { filtro: "por_diagnosticar", texto: "Por diagnosticar" },
  { filtro: "esperando_pago", texto: "Esperando pago" },
  { filtro: "en_reparacion", texto: "En reparación" },
  { filtro: "listo", texto: "Listos para entregar" },
];

// La fecha se calcula solo en el navegador (al prerenderizar no hay "hoy")
const fechaHoy = () =>
  new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" })
    .format(new Date())
    .replace(/^./, (c) => c.toUpperCase());
const sinSuscripcion = () => () => {};

type EstadoDiagnostico = "borrador" | "enviado" | "pagado" | "en_reparacion" | "listo" | "entregado";
type DiagnosticoFila = {
  folio: number;
  estado: EstadoDiagnostico;
  fecha_creacion: string;
  fecha_envio: string | null;
  fecha_reparacion: string | null;
  fecha_listo: string | null;
  fecha_entrega: string | null;
  orden: { estado: string; fecha_pago: string | null }[] | null;
};
type CarroFila = {
  id_carro: number;
  placa: string;
  color: string;
  fecha_registro: string;
  diagnostico: DiagnosticoFila[] | null;
};

function etapaDe(diagnostico?: DiagnosticoFila): EtapaTaller {
  if (!diagnostico || diagnostico.estado === "borrador") return "por_diagnosticar";
  return diagnostico.estado === "enviado" ? "esperando_pago" : diagnostico.estado;
}

function fechaDeActualizacion(diagnostico: DiagnosticoFila | undefined, etapa: EtapaTaller) {
  if (!diagnostico) return "";
  const fechas: Partial<Record<EtapaTaller, [string, string | null]>> = {
    esperando_pago: ["Enviado", diagnostico.fecha_envio],
    pagado: ["Pagó", diagnostico.orden?.find((orden) => orden.estado === "pagado")?.fecha_pago ?? null],
    en_reparacion: ["En reparación desde", diagnostico.fecha_reparacion],
    listo: ["Listo desde", diagnostico.fecha_listo],
    entregado: ["Entregado", diagnostico.fecha_entrega],
  };
  const detalle = fechas[etapa];
  return detalle?.[1] ? `${detalle[0]} ${hora(detalle[1])}` : "";
}

function folioVisible(folio: number) {
  return `DG-${String(folio).padStart(5, "0")}`;
}

export default function TallerPage() {
  const [autos, setAutos] = useState<AutoTaller[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [revision, setRevision] = useState(0);
  const [aviso, setAviso] = useState<DatosAviso | null>(null);
  const [avanzandoId, setAvanzandoId] = useState<string | null>(null);
  const [sesionLista, setSesionLista] = useState(false);
  const router = useRouter();
  const hoy = useSyncExternalStore(sinSuscripcion, fechaHoy, () => "");

  useEffect(() => {
    let vigente = true;
    let canal: ReturnType<ReturnType<typeof crearClienteNavegador>["channel"]> | null = null;
    let supabaseCliente: ReturnType<typeof crearClienteNavegador> | null = null;

    async function cargar() {
      setCargando(true);
      setAviso(null);
      try {
        const supabase = crearClienteNavegador();
        supabaseCliente = supabase;
        const { data: sesion, error: errorSesion } = await supabase.auth.getUser();
        if (errorSesion) throw errorSesion;
        if (!sesion.user) {
          router.replace("/login");
          return;
        }

        const { data: perfil, error: errorPerfil } = await supabase
          .from("perfil")
          .select("rol")
          .eq("id_perfil", sesion.user.id)
          .maybeSingle();
        if (errorPerfil) throw errorPerfil;
        if (perfil?.rol !== "mecanico") {
          router.replace(perfil?.rol === "cliente" ? "/autos" : "/login");
          return;
        }

        const { data, error } = await supabase
          .from("carro")
          .select(
            "id_carro, placa, color, fecha_registro, diagnostico ( folio, estado, fecha_creacion, fecha_envio, fecha_reparacion, fecha_listo, fecha_entrega, orden ( estado, fecha_pago ) )"
          )
          .order("fecha_registro", { ascending: true });
        if (error) throw error;

        const filas: CarroFila[] = data ?? [];
        const cargados = filas.map((carro) => {
          const diagnostico = [...(carro.diagnostico ?? [])].sort(
            (a, b) => Date.parse(b.fecha_creacion) - Date.parse(a.fecha_creacion)
          )[0];
          const color = COLORES_Z06_2025.find((item) => item.nombre === carro.color);
          if (!color) throw new Error(`El color del auto ${carro.placa} no coincide con el catálogo.`);
          const etapa = etapaDe(diagnostico);
          const pagos = (diagnostico?.orden ?? [])
            .filter((orden) => orden.estado === "pagado" && orden.fecha_pago)
            .map((orden) => orden.fecha_pago!)
            .sort();
          return {
            id: String(carro.id_carro),
            placas: carro.placa,
            colorCodigo: color.codigo,
            folio: diagnostico ? folioVisible(diagnostico.folio) : null,
            folioNumero: diagnostico?.folio ?? null,
            etapa,
            actualizacion: fechaDeActualizacion(diagnostico, etapa),
            registradoEn: carro.fecha_registro,
            pagadoEn: pagos[0] ?? null,
          };
        });
        if (vigente) {
          setAutos(cargados);
          setSesionLista(true);
        }

        canal = supabase
          .channel("taller-autos")
          .on("postgres_changes", { event: "*", schema: "public", table: "diagnostico" }, () => setRevision((n) => n + 1))
          .on("postgres_changes", { event: "*", schema: "public", table: "orden" }, () => setRevision((n) => n + 1))
          .subscribe((estado) => {
            if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") {
              console.error("[TallerToGo] No se pudo suscribir a las actualizaciones del taller:", estado);
              if (vigente) setAviso({ tipo: "error", texto: "No se pudo activar la actualización en vivo. Usa «Actualizar» para consultar los cambios." });
            }
          });
      } catch (error) {
        if (vigente) setAviso({ tipo: "error", texto: `No se pudieron cargar los autos del taller. ${mensajeDeFallo(error)}` });
      } finally {
        if (vigente) setCargando(false);
      }
    }

    void cargar();
    return () => {
      vigente = false;
      if (canal && supabaseCliente) void supabaseCliente.removeChannel(canal);
    };
  }, [revision, router]);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    return ordenarPorTurno(autos).filter(
      (a) =>
        coincideFiltro(a.etapa, filtro) &&
        (!q || normalizar(a.placas).includes(q) || normalizar(a.folio ?? "").includes(q))
    );
  }, [autos, filtro, busqueda]);

  // Se diagnostica por orden de llegada y se repara por orden de pago.
  // El botón amarillo es el turno 1 de diagnóstico; el turno 1 de reparación lleva la etiqueta "Siguiente".

  async function avanzar(auto: AutoTaller) {
    const siguiente = ETAPAS_TALLER[auto.etapa].siguiente;
    if (!siguiente || !auto.folioNumero || avanzandoId) return;
    setAvanzandoId(auto.id);
    setAviso(null);
    try {
      const supabase = crearClienteNavegador();
      const { data, error } = await supabase
        .from("diagnostico")
        .update({ estado: siguiente })
        .eq("folio", auto.folioNumero)
        .eq("estado", auto.etapa)
        .select("folio")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("La etapa cambió en otra sesión. Actualiza la lista antes de continuar.");
      setRevision((n) => n + 1);
    } catch (error) {
      setAviso({ tipo: "error", texto: `No se pudo actualizar la etapa. ${mensajeDeFallo(error)}` });
    } finally {
      setAvanzandoId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BarraSuperior derecha={<MenuMecanico />} />

      <main className="mx-auto w-full max-w-[1240px] px-12 py-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-titulo text-[30px] leading-none font-semibold">Autos por atender</h1>
            <p className="mt-2 text-sm text-suave">
              {hoy ? `${hoy} · ` : ""}
              {autos.length} autos
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sesionLista && (
              <button
                type="button"
                onClick={() => setRevision((n) => n + 1)}
                className="h-11 cursor-pointer rounded-lg border border-borde bg-tarjeta px-3 text-sm font-semibold hover:border-tinta"
              >
                Actualizar
              </button>
            )}
            <label className="relative w-[300px]">
              <span className="sr-only">Buscar por placas o folio</span>
              <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-suave" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="9" r="6" />
                <path d="m14 14 4 4" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por placas o folio"
                className="h-11 w-full rounded-lg border border-borde bg-tarjeta pr-3 pl-9 text-[15px] outline-none placeholder:text-suave/70 focus:border-tinta"
              />
            </label>
          </div>
        </div>

        {aviso && <Aviso {...aviso} className="mt-4" />}

        {/* Contadores: también funcionan como filtros */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {CONTADORES.map((c) => {
            const total = autos.filter((a) => coincideFiltro(a.etapa, c.filtro)).length;
            const activo = filtro === c.filtro;
            return (
              <button
                key={c.filtro}
                type="button"
                onClick={() => setFiltro(activo ? "todos" : c.filtro)}
                aria-pressed={activo}
                className={`cursor-pointer rounded-[10px] border bg-tarjeta px-4 py-3.5 text-left transition ${
                  activo ? "border-tinta" : "border-borde hover:border-suave"
                }`}
              >
                <span className="text-[13px] text-suave">{c.texto}</span>
                <span className="mt-0.5 block font-titulo text-[30px] leading-tight font-semibold">{total}</span>
              </button>
            );
          })}
        </div>

        {/* Filtros por etapa */}
        <div className="mt-6 mb-3 flex gap-1.5" role="tablist" aria-label="Filtrar por etapa">
          {FILTROS.map((f) => (
            <button
              key={f.clave}
              type="button"
              role="tab"
              aria-selected={filtro === f.clave}
              onClick={() => setFiltro(f.clave)}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${
                filtro === f.clave ? "border-tinta bg-tinta text-acento" : "border-borde bg-tarjeta text-suave hover:text-tinta"
              }`}
            >
              {f.texto}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-borde bg-tarjeta">
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-borde bg-[#FAFAF9] text-left text-xs font-semibold text-suave">
                <th className="w-[22%] px-4 py-3 font-semibold">Auto</th>
                <th className="px-4 py-3 font-semibold">Color</th>
                <th className="px-4 py-3 font-semibold">Folio</th>
                <th className="px-4 py-3 font-semibold">Etapa</th>
                <th className="px-4 py-3 font-semibold">Turno / actualización</th>
                <th className="px-4 py-3 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((auto) => {
                const etapa = ETAPAS_TALLER[auto.etapa];
                const color = buscarColor(auto.colorCodigo);
                const turno = turnoDe(auto, autos);
                const primario = auto.etapa === "por_diagnosticar" && turno === 1;
                const siguienteReparacion = auto.etapa === "pagado" && turno === 1;
                const detalle =
                  turno && auto.etapa === "por_diagnosticar"
                    ? `llegó a las ${hora(auto.registradoEn)}`
                    : turno && auto.pagadoEn
                      ? `pagó a las ${hora(auto.pagadoEn)}`
                      : auto.actualizacion;
                const claseBoton = `inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border px-3.5 text-sm font-semibold whitespace-nowrap ${
                  primario ? "border-acento bg-acento text-tinta hover:brightness-95" : "border-borde bg-tarjeta text-tinta hover:border-tinta"
                }`;
                return (
                  <tr key={auto.id} className="border-b border-[#EFEFED] last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-[72px] items-center justify-center rounded-md bg-[#E9E9E6] p-1">
                          <Image src="/corvette-z06.png" alt="" width={64} height={27} className="h-auto w-16" />
                        </span>
                        <span>
                          <span className="block font-semibold">{auto.placas}</span>
                          <span className="text-[13px] text-suave">Corvette Z06 2025</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-sm">
                        <Muestra hex={color?.hex} tamano={12} />
                        {color?.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {auto.folio ? (
                        <Link
                          href={auto.etapa === "por_diagnosticar" ? `/taller/diagnostico/${auto.id}` : `/taller/diagnostico/${auto.id}/ver`}
                          className="font-mono text-sm underline decoration-borde underline-offset-4 hover:decoration-tinta"
                          title="Ver diagnóstico"
                        >
                          {auto.folio}
                        </Link>
                      ) : (
                        <span className="text-sm text-suave/70">Sin folio</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChipEtapa texto={etapa.etiqueta} estilo={etapa.estilo} />
                    </td>
                    <td className="px-4 py-3 text-[13px] whitespace-nowrap text-suave">
                      {turno ? (
                        <>
                          <span className="font-semibold text-tinta">Turno {turno}</span> · {detalle}
                        </>
                      ) : (
                        detalle
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {siguienteReparacion && (
                        <span className="mr-2 rounded-full border border-tinta px-2 py-0.5 text-xs font-semibold">Siguiente</span>
                      )}
                      {etapa.siguiente ? (
                        <button type="button" onClick={() => void avanzar(auto)} disabled={avanzandoId === auto.id || cargando} className={claseBoton}>
                          {etapa.accion}
                        </button>
                      ) : (
                        // Diagnosticar y Ver diagnóstico abren sus pantallas (las siguientes por hacer)
                        <Link
                          href={auto.etapa === "por_diagnosticar" ? `/taller/diagnostico/${auto.id}` : `/taller/diagnostico/${auto.id}/ver`}
                          className={claseBoton}
                        >
                          {etapa.accion}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {cargando && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-suave">Cargando autos de la base de datos…</td>
                </tr>
              )}
              {!cargando && visibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-suave">
                    No hay autos con ese filtro.{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setFiltro("todos");
                        setBusqueda("");
                      }}
                      className="cursor-pointer font-semibold text-tinta underline underline-offset-4"
                    >
                      Ver todos
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function ChipEtapa({ texto, estilo }: { texto: string; estilo: "fuerte" | "verde" | "gris" }) {
  const clases = {
    fuerte: "border-tinta bg-tinta text-white",
    verde: "border-[#CDEBD8] bg-[#E3F4EA] text-[#17663F]",
    gris: "border-borde bg-fondo text-[#3A4250]",
  }[estilo];
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${clases}`}>{texto}</span>;
}
