"use client";

// Pantalla 5: Diagnosticar un auto (mecánico, diseñada para computadora)
// - Una descripción general de la falla por diagnóstico.
// - Cada pieza-posición del catálogo se agrega una sola vez, con su propia mano de obra.
// Por ahora usa datos de ejemplo. Falta guardar el borrador y enviar el diagnóstico a Supabase.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import BarraSuperior from "@/components/BarraSuperior";
import FranjaAuto from "@/components/FranjaAuto";
import MenuMecanico from "@/components/MenuMecanico";
import { AUTOS_DEMO, normalizar } from "@/lib/autosTaller";
import { CATALOGO, PRECIO_DEMO, type Eje, type Lado, type PiezaCatalogo } from "@/lib/catalogo";

const LADO_CORTO: Record<Lado, string> = { IZQUIERDO: "IZQ", DERECHO: "DER", CENTRAL: "CEN" };
const capital = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();
const dinero = (n: number) => `$${n.toFixed(2)}`;

type Falla = { pieza: PiezaCatalogo; manoDeObra: string };
type Aviso = { tipo: "error" | "ok"; texto: string } | null;

export default function Diagnosticar() {
  const { id } = useParams<{ id: string }>();
  const auto = AUTOS_DEMO.find((a) => a.id === id);

  const [eje, setEje] = useState<Eje>("DELANTERO");
  const [lado, setLado] = useState<Lado | "TODOS">("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fallas, setFallas] = useState<Falla[]>([]);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviado, setEnviado] = useState(false);

  const piezas = useMemo(() => {
    const q = normalizar(busqueda);
    return CATALOGO.filter(
      (p) =>
        p.eje === eje &&
        (lado === "TODOS" || p.lado === lado) &&
        (!q || [p.nombre, p.nombreTecnico, p.id].some((t) => normalizar(t).includes(q)))
    );
  }, [eje, lado, busqueda]);

  const agregadas = new Set(fallas.map((f) => f.pieza.id));
  const totalManoDeObra = fallas.reduce((s, f) => s + (Number(f.manoDeObra) || 0), 0);

  if (!auto) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <BarraSuperior derecha={<MenuMecanico />} />
        <main className="flex flex-1 flex-col items-center justify-center gap-3 text-suave">
          <p>No encontramos ese auto.</p>
          <Link href="/taller" className="font-semibold text-tinta underline underline-offset-4">
            Volver a autos por atender
          </Link>
        </main>
      </div>
    );
  }

  // El folio se asigna al empezar el diagnóstico. TODO: lo genera la base de datos.
  const folio = auto.folio ?? "DG-00043";

  function cambiar() {
    setAviso(null);
    setEnviado(false);
  }

  function agregar(pieza: PiezaCatalogo) {
    if (agregadas.has(pieza.id)) return;
    setFallas((prev) => [...prev, { pieza, manoDeObra: PRECIO_DEMO.manoDeObra.toFixed(2) }]);
    cambiar();
  }

  function quitar(idPieza: string) {
    setFallas((prev) => prev.filter((f) => f.pieza.id !== idPieza));
    cambiar();
  }

  function validar(): string | null {
    if (!descripcion.trim()) return "Escribe la descripción general de la falla.";
    if (fallas.length === 0) return "Agrega al menos una pieza del catálogo.";
    const mala = fallas.find((f) => !/^\d+(\.\d{1,2})?$/.test(f.manoDeObra.trim()));
    if (mala) return `Revisa la mano de obra de: ${mala.pieza.nombre}.`;
    return null;
  }

  function guardarBorrador() {
    // TODO: guardar en Supabase con estado "borrador".
    setAviso({ tipo: "ok", texto: "Borrador listo. Falta conectar el guardado con Supabase." });
  }

  function enviar() {
    const error = validar();
    if (error) {
      setAviso({ tipo: "error", texto: error });
      return;
    }
    // TODO: guardar en Supabase y cambiar el diagnóstico a "enviado".
    setEnviado(true);
    setAviso({ tipo: "ok", texto: "Diagnóstico listo para enviar. Falta conectar el envío con Supabase." });
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BarraSuperior derecha={<MenuMecanico />} />
      <FranjaAuto placas={auto.placas} colorCodigo={auto.colorCodigo} folio={folio} etapa="Diagnóstico en borrador" />

      <main className="mx-auto grid w-full max-w-[1340px] flex-1 grid-cols-[minmax(0,1fr)_520px] items-start gap-6 px-12 py-6">
        {/* Catálogo */}
        <section className="rounded-xl border border-borde bg-tarjeta px-6 py-5.5">
          <h1 className="font-titulo text-2xl font-semibold">Catálogo de suspensión</h1>
          <p className="mt-1 text-sm text-suave">Elige la pieza y la posición que falla. Cada una se agrega una sola vez.</p>

          <div className="mt-4 flex items-center gap-2">
            <Segmentos
              etiqueta="Eje"
              opciones={[
                ["DELANTERO", "Delantero"],
                ["TRASERO", "Trasero"],
              ]}
              valor={eje}
              onCambio={(v) => setEje(v as Eje)}
            />
            <Segmentos
              etiqueta="Lado"
              opciones={[
                ["TODOS", "Todos"],
                ["IZQUIERDO", "Izquierdo"],
                ["DERECHO", "Derecho"],
                ["CENTRAL", "Central"],
              ]}
              valor={lado}
              onCambio={(v) => setLado(v as Lado | "TODOS")}
            />
            <label className="relative flex-1">
              <span className="sr-only">Buscar pieza</span>
              <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-suave" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="9" r="6" />
                <path d="m14 14 4 4" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar pieza"
                className="h-[38px] w-full rounded-lg border border-borde bg-tarjeta pr-3 pl-9 text-sm outline-none placeholder:text-suave/70 focus:border-tinta"
              />
            </label>
          </div>

          <ul className="mt-3.5">
            {piezas.map((p) => {
              const ya = agregadas.has(p.id);
              return (
                <li key={p.id} className="flex items-center gap-3.5 border-b border-[#EFEFED] px-1 py-2.5 last:border-b-0">
                  <code className="w-[118px] shrink-0 font-mono text-xs text-suave">{p.id}</code>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{p.nombre}</span>
                    <span className="block truncate text-[13px] text-suave">{p.nota}</span>
                  </span>
                  <span className="rounded-md border border-borde bg-fondo px-2 py-0.5 text-xs font-semibold text-[#3A4250]">
                    {LADO_CORTO[p.lado]}
                  </span>
                  <button
                    type="button"
                    onClick={() => agregar(p)}
                    disabled={ya}
                    className={`w-[104px] shrink-0 rounded-lg border px-3 py-1.5 text-[13px] font-semibold ${
                      ya
                        ? "cursor-default border-[#CDEBD8] bg-[#E3F4EA] text-[#17663F]"
                        : "cursor-pointer border-borde bg-tarjeta hover:border-tinta"
                    }`}
                  >
                    {ya ? "✓ Agregada" : "+ Agregar"}
                  </button>
                </li>
              );
            })}
            {piezas.length === 0 && (
              <li className="py-10 text-center text-sm text-suave">
                No hay piezas con «{busqueda}» en {eje === "DELANTERO" ? "el eje delantero" : "el eje trasero"}.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    setLado("TODOS");
                  }}
                  className="cursor-pointer font-semibold text-tinta underline underline-offset-4"
                >
                  Limpiar búsqueda
                </button>
              </li>
            )}
          </ul>
        </section>

        {/* Fallas del diagnóstico */}
        <section className="sticky top-4 rounded-xl border border-borde bg-tarjeta px-6 py-5.5">
          <h2 className="flex items-center gap-2 font-titulo text-2xl font-semibold">
            Fallas del diagnóstico
            <span className="rounded-full border border-borde bg-fondo px-2.5 py-0.5 font-sans text-xs text-[#3A4250]">{fallas.length}</span>
          </h2>
          <p className="mt-1 text-sm text-suave">El cliente verá cada falla y elegirá la marca: OEM o GM.</p>

          <label htmlFor="descripcion" className="mt-4 block text-[13px] font-semibold">
            Descripción general de la falla
          </label>
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => {
              setDescripcion(e.target.value);
              cambiar();
            }}
            rows={3}
            placeholder="Qué síntomas tiene el auto y qué encontraste al revisarlo"
            className="mt-1.5 w-full resize-y rounded-lg border border-borde px-3 py-2.5 text-[15px] outline-none placeholder:text-suave/70 focus:border-tinta"
          />
          <p className="mt-1 text-[13px] text-suave">El cliente la verá arriba de la lista de piezas.</p>

          {fallas.length === 0 && (
            <p className="mt-3 rounded-[10px] border border-dashed border-borde px-4 py-6 text-center text-sm text-suave">
              Agrega piezas desde el catálogo de la izquierda.
            </p>
          )}

          {fallas.map((f) => (
            <div key={f.pieza.id} className="mt-3 rounded-[10px] border border-borde px-4 py-3.5">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <p className="font-semibold">{f.pieza.nombre}</p>
                  <p className="text-[13px] text-suave">
                    {capital(f.pieza.eje)} · {capital(f.pieza.lado)} · <code className="font-mono text-[11px]">{f.pieza.id}</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitar(f.pieza.id)}
                  className="cursor-pointer text-[13px] font-semibold text-suave hover:text-tinta"
                >
                  Quitar
                </button>
              </div>
              <div className="mt-2.5 flex items-end gap-3">
                <div>
                  <label htmlFor={`mo-${f.pieza.id}`} className="block text-[13px] font-semibold">
                    Mano de obra
                  </label>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-suave">$</span>
                    <input
                      id={`mo-${f.pieza.id}`}
                      inputMode="decimal"
                      value={f.manoDeObra}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setFallas((prev) => prev.map((x) => (x.pieza.id === f.pieza.id ? { ...x, manoDeObra: valor } : x)));
                        cambiar();
                      }}
                      className="h-[42px] w-[150px] rounded-lg border border-borde pr-3 pl-7 text-[15px] outline-none focus:border-tinta"
                    />
                  </div>
                </div>
                <p className="pb-2.5 text-[13px] text-suave">
                  Pieza: OEM {dinero(PRECIO_DEMO.OEM)} · GM {dinero(PRECIO_DEMO.GM)}
                </p>
              </div>
            </div>
          ))}

          <div className="mt-4.5 flex items-baseline justify-between border-t border-borde pt-3.5">
            <span className="text-sm text-suave">Mano de obra total</span>
            <span className="font-titulo text-[22px] font-semibold">{dinero(totalManoDeObra)}</span>
          </div>
          <p className="mt-1 text-[13px] text-suave">Las piezas las elige el cliente; el total final se calcula al pagar.</p>

          {aviso && (
            <p
              role={aviso.tipo === "error" ? "alert" : "status"}
              className={`mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${
                aviso.tipo === "error" ? "border-error/30 text-error" : "border-borde bg-fondo text-suave"
              }`}
            >
              {aviso.tipo === "error" && <span aria-hidden="true">⚠</span>}
              {aviso.texto}
              {enviado && (
                <Link href="/taller" className="ml-auto font-semibold whitespace-nowrap text-tinta underline underline-offset-4">
                  Ir a la lista
                </Link>
              )}
            </p>
          )}

          <div className="mt-4 grid grid-cols-[1fr_1.4fr] gap-2.5">
            <button
              type="button"
              onClick={guardarBorrador}
              className="h-12 cursor-pointer rounded-lg border border-borde font-titulo text-[17px] font-semibold hover:border-tinta"
            >
              Guardar borrador
            </button>
            {/* Único botón de acento de la pantalla */}
            <button
              type="button"
              onClick={enviar}
              className="h-12 cursor-pointer rounded-lg bg-acento font-titulo text-[17px] font-semibold text-tinta transition hover:brightness-95 active:scale-[0.99]"
            >
              Enviar diagnóstico
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function Segmentos({
  etiqueta,
  opciones,
  valor,
  onCambio,
}: {
  etiqueta: string;
  opciones: [string, string][];
  valor: string;
  onCambio: (v: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex overflow-hidden rounded-lg border border-borde">
      {opciones.map(([clave, texto]) => (
        <button
          key={clave}
          type="button"
          role="radio"
          aria-checked={valor === clave}
          onClick={() => onCambio(clave)}
          className={`cursor-pointer border-r border-borde px-3.5 py-2 text-[13px] font-semibold last:border-r-0 ${
            valor === clave ? "bg-tinta text-acento" : "text-suave hover:text-tinta"
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}
