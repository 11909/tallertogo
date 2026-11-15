"use client";

// Carrito del cliente: las piezas que eligió del diagnóstico de un auto, con su marca y mano de obra.
// Las fallas que quitó (o que no eligió) quedan en "Pendiente por comprar" y se pueden pagar después
// en otra orden (compras parciales, sección 4 del CLAUDE.md).
// TODO: leer el diagnóstico de Supabase (v_diagnostico_cliente) y pagar con crear_orden + QR de pey.
// El total de aquí es solo para mostrar: el monto que se cobra lo calcula crear_orden en la base.
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import BarraSuperior from "@/components/BarraSuperior";
import SeguimientoEnVivo, { Muestra, type AutoSeguimiento } from "@/components/SeguimientoEnVivo";
import { AUTOS_DEMO } from "@/lib/autosTaller";
import { CATALOGO } from "@/lib/catalogo";
import { buscarColor } from "@/lib/colores";
import { DIAGNOSTICOS_DEMO, precioPieza, type Marca } from "@/lib/diagnosticosDemo";

// Lo que el cliente mandó al carrito desde su diagnóstico (demo). Las fallas que no aparecen quedan pendientes.
const CARRITO_DEMO: Record<string, Record<string, Marca>> = {
  v3: { "SUS-TRA-10-DER": "GM", "SUS-TRA-09-DER": "OEM" },
};

// Autos del cliente de la demo para el seguimiento en vivo
const AUTOS_CLIENTE = ["v1", "v2", "v3"];

const centavos = (pesos: number) => Math.round(pesos * 100);
const dinero = (c: number) => `$${(c / 100).toFixed(2)}`;
const LADO: Record<string, string> = { IZQUIERDO: "Izquierdo", DERECHO: "Derecho", CENTRAL: "Central" };
const EJE: Record<string, string> = { DELANTERO: "Delantero", TRASERO: "Trasero" };

export default function Carrito() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const auto = AUTOS_DEMO.find((a) => a.id === id);
  const diagnostico = DIAGNOSTICOS_DEMO[id];
  const color = buscarColor(auto?.colorCodigo ?? "");

  // Marca elegida por falla. Si una falla no está aquí, está pendiente por comprar.
  const [enCarrito, setEnCarrito] = useState<Record<string, Marca>>(() => ({ ...(CARRITO_DEMO[id] ?? {}) }));
  // Recuerda la marca de una pieza quitada para regresarla igual
  const [ultimaMarca, setUltimaMarca] = useState<Record<string, Marca>>({});

  const seguimiento: AutoSeguimiento[] = AUTOS_DEMO.filter((a) => AUTOS_CLIENTE.includes(a.id)).map((a) => ({
    id: a.id,
    etiqueta: a.placas,
    hex: buscarColor(a.colorCodigo)?.hex,
    etapa: DIAGNOSTICOS_DEMO[a.id] ? "recibo" : "diagnostico",
  }));

  const barra = (
    <BarraSuperior
      derecha={
        <div className="flex items-center gap-3 text-sm text-suave">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-tinta text-[13px] font-semibold text-acento">
            JP
          </span>
          Juan Pérez
          <Link
            href="/login"
            className="ml-1 rounded-lg border border-borde bg-tarjeta px-3.5 py-2 font-semibold text-tinta hover:border-tinta"
          >
            Salir
          </Link>
        </div>
      }
    />
  );

  const seguimientoEnVivo = (
    <SeguimientoEnVivo autos={seguimiento} seleccionado={id} onSeleccionar={(nuevo) => router.push(`/carrito/${nuevo}`)} />
  );

  if (!auto || !diagnostico) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        {barra}
        {auto && seguimientoEnVivo}
        <main className="flex flex-1 items-center justify-center p-12">
          <div className="max-w-[440px] rounded-xl border border-borde bg-tarjeta p-8 text-center">
            <h1 className="font-titulo text-2xl font-semibold">
              {auto ? "Tu auto todavía no tiene diagnóstico" : "No encontramos este auto"}
            </h1>
            <p className="mt-2 text-sm text-suave">
              {auto
                ? "Cuando el mecánico envíe el diagnóstico podrás elegir tus piezas y pagarlas aquí."
                : "Revisa que el enlace sea correcto."}
            </p>
            <Link
              href="/inicio"
              className="mt-5 inline-block rounded-lg border border-borde px-4 py-2.5 text-sm font-semibold hover:border-tinta"
            >
              ← Volver a inicio
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const fallas = diagnostico.fallas
    .filter((f) => !f.marcaElegida) // las ya pagadas no vuelven al carrito
    .map((f) => ({ ...f, pieza: CATALOGO.find((p) => p.id === f.piezaId) }))
    .filter((f) => f.pieza);

  const elegidas = fallas.filter((f) => enCarrito[f.piezaId]);
  const pendientes = fallas.filter((f) => !enCarrito[f.piezaId]);

  const totalPiezas = elegidas.reduce((s, f) => s + centavos(precioPieza(enCarrito[f.piezaId])), 0);
  const totalManoDeObra = elegidas.reduce((s, f) => s + centavos(f.manoDeObra), 0);
  const total = totalPiezas + totalManoDeObra;

  const quitar = (piezaId: string) => {
    setUltimaMarca((m) => ({ ...m, [piezaId]: enCarrito[piezaId] }));
    setEnCarrito((c) => {
      const copia = { ...c };
      delete copia[piezaId];
      return copia;
    });
  };
  const agregar = (piezaId: string) => setEnCarrito((c) => ({ ...c, [piezaId]: ultimaMarca[piezaId] ?? "OEM" }));

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      {barra}
      {seguimientoEnVivo}

      <main className="grid flex-1 grid-cols-[minmax(0,1fr)_440px]">
        {/* Izquierda: piezas del carrito y pendientes */}
        <section className="border-r border-borde bg-tarjeta px-12 py-7">
          <h1 className="font-titulo text-[28px] font-semibold">
            Tu carrito{" "}
            <span className="ml-2 font-mono text-sm font-normal text-suave">Folio {auto.folio ?? "—"}</span>
          </h1>
          <p className="mt-1.5 text-sm text-suave">
            Piezas que elegiste para tu Corvette Z06 2025 ({auto.placas}). Cada auto tiene su propio carrito.
          </p>

          <div className="mt-[18px]" role="table" aria-label="Piezas en el carrito">
            <div
              role="row"
              className="grid grid-cols-[minmax(0,1fr)_110px_110px_100px_70px] gap-3 border-b border-borde py-2.5 text-xs font-semibold text-suave"
            >
              <span role="columnheader">Pieza</span>
              <span role="columnheader" className="text-right">
                Pieza
              </span>
              <span role="columnheader" className="text-right">
                Mano de obra
              </span>
              <span role="columnheader" className="text-right">
                Subtotal
              </span>
              <span role="columnheader" className="sr-only">
                Acción
              </span>
            </div>

            {elegidas.length === 0 && (
              <p className="border-b border-[#EFEFED] py-6 text-sm text-suave">
                Tu carrito está vacío. Agrega piezas de la lista de pendientes.
              </p>
            )}

            {elegidas.map((f) => {
              const marca = enCarrito[f.piezaId];
              const pieza = centavos(precioPieza(marca));
              const mano = centavos(f.manoDeObra);
              return (
                <div
                  key={f.piezaId}
                  role="row"
                  className="grid grid-cols-[minmax(0,1fr)_110px_110px_100px_70px] items-center gap-3 border-b border-[#EFEFED] py-3.5"
                >
                  <div role="cell">
                    <p className="text-base font-semibold">{f.pieza!.nombre}</p>
                    <p className="text-[13px] text-suave">
                      {EJE[f.pieza!.eje]} · {LADO[f.pieza!.lado]} ·{" "}
                      <code className="font-mono text-[11px]">{f.piezaId}</code>
                    </p>
                  </div>
                  <span role="cell" className="whitespace-nowrap text-right">
                    <span className="mr-1.5 inline-block rounded-md border border-borde bg-fondo px-2 py-0.5 text-xs font-semibold">
                      {marca}
                    </span>
                    {dinero(pieza)}
                  </span>
                  <span role="cell" className="text-right">
                    {dinero(mano)}
                  </span>
                  <span role="cell" className="text-right font-semibold">
                    {dinero(pieza + mano)}
                  </span>
                  <span role="cell" className="text-right">
                    <button
                      type="button"
                      onClick={() => quitar(f.piezaId)}
                      className="cursor-pointer text-[13px] font-semibold text-suave underline hover:text-tinta"
                    >
                      Quitar
                    </button>
                  </span>
                </div>
              );
            })}
          </div>

          {pendientes.length > 0 && (
            <div className="mt-5 rounded-[10px] border border-dashed border-[#D0D0CC] bg-[#FAFAF9] px-4 py-3.5">
              <p className="text-[15px] font-semibold">Pendiente por comprar ({pendientes.length})</p>
              <p className="text-[13px] text-suave">
                Puedes pagarla{pendientes.length > 1 ? "s" : ""} después en otra orden, mientras el auto no entre a
                reparación.
              </p>
              <ul>
                {pendientes.map((f) => (
                  <li
                    key={f.piezaId}
                    className="mt-2.5 flex items-center justify-between gap-4 border-t border-[#EFEFED] pt-2.5"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-suave">{f.pieza!.nombre}</p>
                      <p className="text-[13px] text-suave/70">
                        {EJE[f.pieza!.eje]} · {LADO[f.pieza!.lado]} ·{" "}
                        <code className="font-mono text-[11px]">{f.piezaId}</code>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => agregar(f.piezaId)}
                      className="shrink-0 cursor-pointer text-[13px] font-semibold text-suave underline hover:text-tinta"
                    >
                      Agregar al carrito
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href="/inicio"
            className="mt-5 inline-block rounded-lg border border-borde px-3.5 py-2.5 text-sm font-semibold hover:border-tinta"
          >
            ← Volver al diagnóstico
          </Link>
        </section>

        {/* Derecha: auto y resumen */}
        <aside className="flex flex-col gap-4 px-8 py-7">
          <div className="overflow-hidden rounded-xl border border-borde bg-tarjeta">
            <div className="flex h-[120px] items-center justify-center bg-[#E9E9E6]">
              <Image
                src="/corvette-z06.png"
                alt="Chevrolet Corvette Z06 2025"
                width={246}
                height={104}
                className="h-auto max-h-[104px] w-auto"
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-base font-semibold">{auto.placas}</p>
                <p className="text-[13px] text-suave">Corvette Z06 2025</p>
              </div>
              <p className="flex items-center gap-1.5 text-[13px] text-suave">
                <Muestra hex={color?.hex} />
                {color?.nombre ?? "Sin color"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-borde bg-tarjeta px-[22px] py-5">
            <h2 className="font-titulo text-[22px] font-semibold">Resumen</h2>
            <div className="flex justify-between py-1.5 text-[15px]">
              <span className="text-suave">Piezas ({elegidas.length})</span>
              <b>{dinero(totalPiezas)}</b>
            </div>
            <div className="flex justify-between py-1.5 text-[15px]">
              <span className="text-suave">Mano de obra</span>
              <b>{dinero(totalManoDeObra)}</b>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between border-t border-borde pt-3">
              <span className="font-titulo text-xl font-semibold">Total</span>
              <b className="font-titulo text-[30px]">{dinero(total)}</b>
            </div>
            <button
              type="button"
              disabled={elegidas.length === 0}
              className="mt-4 h-[52px] w-full cursor-pointer rounded-lg bg-acento font-titulo text-lg font-semibold text-tinta hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Pagar con CoDi
            </button>
            <div className="mt-3.5 flex items-start gap-2.5 text-[13px] leading-[1.45] text-suave">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-tinta text-[11px] font-semibold text-acento">
                CoDi
              </span>
              <span>
                Te mostraremos un código QR. Escanéalo con la app de tu banco para pagar. El QR vence en 10 minutos.
              </span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
