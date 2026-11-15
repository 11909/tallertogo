"use client";

// Pantalla 3: Inicio del cliente con el registro de sus autos (diseñada para computadora)
// - Hasta 3 autos por cliente, cada uno con placas y uno de los 10 colores de fábrica del Corvette Z06 2025.
// - Cada auto tiene su propio diagnóstico, recibo y seguimiento.
// Por ahora es solo la pantalla. Falta conectar el registro de autos y el usuario con Supabase.
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import BarraSuperior from "@/components/BarraSuperior";
import SeguimientoEnVivo, { Muestra, type AutoSeguimiento } from "@/components/SeguimientoEnVivo";
import { COLORES_Z06_2025, buscarColor } from "@/lib/colores";

const MAX_AUTOS = 3;
// TODO: tomar el nombre del usuario con sesión iniciada.
const USUARIO = { nombre: "Juan Pérez", iniciales: "JP" };

type AutoForm = { id: string; placas: string; color: string };
type ErroresAuto = { placas?: string; color?: string };


const limpiarPlacas = (p: string) => p.toUpperCase().replace(/[^A-Z0-9]/g, "");

export default function InicioPage() {
  // Contador propio del componente para dar un id único a cada bloque de auto
  const siguienteId = useRef(1);
  const [autos, setAutos] = useState<AutoForm[]>([{ id: "auto-0", placas: "", color: "" }]);
  const [errores, setErrores] = useState<Record<string, ErroresAuto>>({});
  const [seleccionado, setSeleccionado] = useState<string>(autos[0].id);
  const [enviado, setEnviado] = useState(false);

  function cambiarCantidad(n: number) {
    const cantidad = Math.min(MAX_AUTOS, Math.max(1, n));
    const nuevos =
      cantidad > autos.length
        ? [
            ...autos,
            ...Array.from({ length: cantidad - autos.length }, () => ({
              id: `auto-${siguienteId.current++}`,
              placas: "",
              color: "",
            })),
          ]
        : autos.slice(0, cantidad);
    setAutos(nuevos);
    if (!nuevos.some((a) => a.id === seleccionado)) setSeleccionado(nuevos[0].id);
    setEnviado(false);
  }

  function actualizar(id: string, campo: "placas" | "color", valor: string) {
    setAutos((prev) => prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
    setErrores((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: undefined } }));
    setEnviado(false);
  }

  function validar() {
    const e: Record<string, ErroresAuto> = {};
    const vistas = new Set<string>();
    for (const a of autos) {
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

  function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    // TODO: guardar cada auto en Supabase (tabla vehicles) con customer_id, placas y color.
    setEnviado(true);
  }

  const autosSeguimiento: AutoSeguimiento[] = autos.map((a, i) => ({
    id: a.id,
    etiqueta: limpiarPlacas(a.placas) || `Auto ${i + 1}`,
    hex: buscarColor(a.color)?.hex,
    etapa: "registro",
  }));

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BarraSuperior
        derecha={
          <div className="flex items-center gap-3 text-sm text-suave">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-tinta text-[13px] font-semibold text-acento">
              {USUARIO.iniciales}
            </span>
            {USUARIO.nombre}
            <Link
              href="/login"
              className="ml-1 rounded-lg border border-borde bg-tarjeta px-3.5 py-2 font-semibold text-tinta hover:border-tinta"
            >
              Salir
            </Link>
          </div>
        }
      />

      <SeguimientoEnVivo autos={autosSeguimiento} seleccionado={seleccionado} onSeleccionar={setSeleccionado} />

      <main className="grid flex-1 grid-cols-[520px_1fr]">
        {/* Panel izquierdo: registro de autos */}
        <form onSubmit={registrar} noValidate className="border-r border-borde bg-tarjeta px-12 py-7">
          <h1 className="font-titulo text-[28px] leading-none font-semibold">Registra tu auto</h1>
          <p className="mt-2 text-sm text-suave">Por ahora el taller atiende solo este modelo.</p>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-[10px] border border-borde bg-fondo px-4 py-3.5">
            {[
              ["Marca", "Chevrolet"],
              ["Modelo", "Corvette Z06"],
              ["Año", "2025"],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta}>
                <p className="text-xs text-suave">{etiqueta}</p>
                <p className="font-semibold">{valor}</p>
              </div>
            ))}
          </div>

          <p id="cantidad-label" className="mt-5 text-sm font-semibold">
            ¿Cuántos autos vas a registrar?
          </p>
          <div className="mt-1.5 flex items-center gap-3.5">
            <div className="flex h-11 overflow-hidden rounded-lg border border-borde" role="group" aria-labelledby="cantidad-label">
              <button
                type="button"
                onClick={() => cambiarCantidad(autos.length - 1)}
                disabled={autos.length <= 1}
                aria-label="Quitar un auto"
                className="w-11 cursor-pointer text-xl disabled:cursor-default disabled:text-[#C9CBCF]"
              >
                −
              </button>
              <span className="flex w-[52px] items-center justify-center border-x border-borde text-[17px] font-semibold" aria-live="polite">
                {autos.length}
              </span>
              <button
                type="button"
                onClick={() => cambiarCantidad(autos.length + 1)}
                disabled={autos.length >= MAX_AUTOS}
                aria-label="Agregar un auto"
                className="w-11 cursor-pointer text-xl disabled:cursor-default disabled:text-[#C9CBCF]"
              >
                +
              </button>
            </div>
            <span className="text-[13px] text-suave">Máximo {MAX_AUTOS} autos</span>
          </div>

          {autos.map((auto, i) => {
            const err = errores[auto.id] ?? {};
            const color = buscarColor(auto.color);
            return (
              <fieldset key={auto.id} className="mt-3 rounded-[10px] border border-borde px-4 pt-1 pb-3.5">
                <legend className="sr-only">Auto {i + 1}</legend>
                <p className="mt-2.5 font-titulo text-[17px] font-semibold" aria-hidden="true">
                  Auto {i + 1}
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
            className="mt-6 h-12 w-full cursor-pointer rounded-lg bg-acento font-titulo text-[17px] font-semibold tracking-wide text-tinta transition hover:brightness-95 active:scale-[0.99]"
          >
            {autos.length === 1 ? "Registrar auto" : `Registrar ${autos.length} autos`}
          </button>

          {enviado && (
            <p role="status" className="mt-4 rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-suave">
              Datos listos. Falta conectar el registro de autos con Supabase.
            </p>
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
                {autos.length === 1 ? "Tu auto" : "Tus autos"}
                <span className="rounded-full bg-tinta px-2.5 py-px text-xs font-semibold text-acento">{autos.length}</span>
              </p>
              <p className="mt-0.5 font-titulo text-2xl font-semibold">Chevrolet Corvette Z06 2025</p>

              <ul className="mt-3.5 flex flex-col gap-2">
                {autosSeguimiento.map((a, i) => {
                  const activo = a.id === seleccionado;
                  const nombreColor = buscarColor(autos[i].color)?.nombre ?? "Sin color";
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setSeleccionado(a.id)}
                        aria-pressed={activo}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left ${
                          activo ? "border-tinta" : "border-borde hover:border-suave"
                        }`}
                      >
                        <Muestra hex={a.hex} tamano={14} />
                        <span className="flex-1">
                          <span className="block text-[15px] font-semibold">{a.etiqueta}</span>
                          <span className="text-[13px] text-suave">{nombreColor}</span>
                        </span>
                        <span className="rounded-full border border-borde bg-fondo px-2.5 py-0.5 text-xs font-semibold">
                          Registro
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 border-t border-borde pt-3.5 text-sm text-suave">
                Cada auto tiene su propio diagnóstico, recibo y seguimiento. Elige uno para ver su avance arriba.
              </p>
            </div>
          </div>
        </section>
      </main>
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
