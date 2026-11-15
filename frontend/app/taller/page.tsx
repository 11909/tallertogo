"use client";

// Pantalla 4: Autos por atender (mecánico, diseñada para computadora)
// Por ahora usa datos de ejemplo. Falta leer los autos de Supabase y guardar los cambios de etapa.
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import BarraSuperior from "@/components/BarraSuperior";
import { Muestra } from "@/components/SeguimientoEnVivo";
import { buscarColor } from "@/lib/colores";
import { AUTOS_DEMO, ETAPAS_TALLER, normalizar, type AutoTaller, type EtapaTaller } from "@/lib/autosTaller";

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

export default function TallerPage() {
  const [autos, setAutos] = useState<AutoTaller[]>(AUTOS_DEMO);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const hoy = useSyncExternalStore(sinSuscripcion, fechaHoy, () => "");

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    return autos.filter(
      (a) =>
        coincideFiltro(a.etapa, filtro) &&
        (!q || normalizar(a.placas).includes(q) || normalizar(a.folio ?? "").includes(q))
    );
  }, [autos, filtro, busqueda]);

  // El botón amarillo es "Diagnosticar" del primer auto que espera diagnóstico
  const primeroPorDiagnosticar = visibles.find((a) => a.etapa === "por_diagnosticar")?.id;

  function avanzar(id: string) {
    // TODO: guardar el cambio de etapa en Supabase (el cliente lo ve en vivo).
    setAutos((prev) =>
      prev.map((a) => {
        const siguiente = ETAPAS_TALLER[a.etapa].siguiente;
        return a.id === id && siguiente ? { ...a, etapa: siguiente, actualizacion: "Justo ahora" } : a;
      })
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BarraSuperior
        derecha={
          <div className="flex items-center gap-3 text-sm text-suave">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-tinta text-[13px] font-semibold text-acento">
              TM
            </span>
            <span>
              <span className="block font-semibold text-tinta">Taller Paddock</span>
              <span className="text-xs">Mecánico</span>
            </span>
            <Link
              href="/login"
              className="ml-1 rounded-lg border border-borde bg-tarjeta px-3.5 py-2 font-semibold text-tinta hover:border-tinta"
            >
              Salir
            </Link>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-[1240px] px-12 py-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-titulo text-[30px] leading-none font-semibold">Autos por atender</h1>
            <p className="mt-2 text-sm text-suave">
              {hoy ? `${hoy} · ` : ""}
              {autos.length} autos
            </p>
          </div>
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
                <th className="px-4 py-3 font-semibold">Última actualización</th>
                <th className="px-4 py-3 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((auto) => {
                const etapa = ETAPAS_TALLER[auto.etapa];
                const color = buscarColor(auto.colorCodigo);
                const primario = auto.id === primeroPorDiagnosticar;
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
                        <span className="font-mono text-sm">{auto.folio}</span>
                      ) : (
                        <span className="text-sm text-suave/70">Sin folio</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChipEtapa texto={etapa.etiqueta} estilo={etapa.estilo} />
                    </td>
                    <td className="px-4 py-3 text-[13px] whitespace-nowrap text-suave">{auto.actualizacion}</td>
                    <td className="px-4 py-3 text-right">
                      {etapa.siguiente ? (
                        <button type="button" onClick={() => avanzar(auto.id)} className={claseBoton}>
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
              {visibles.length === 0 && (
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
