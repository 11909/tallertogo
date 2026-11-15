"use client";

// Carrito del cliente: las piezas de los diagnósticos, agrupadas por auto (cada auto tiene su propio recibo).
// Antes de confirmar se avisa cuántos QR se generarán (uno por auto). Al confirmar se llama crear_orden por
// cada auto y se abre el primer QR en Pagos. El total de aquí es solo para mostrar: lo calcula crear_orden.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Aviso from "@/components/Aviso";
import CobroPrueba from "@/components/cliente/CobroPrueba";
import { TituloPantalla } from "@/components/cliente/EncabezadoCliente";
import { EstadoCarga, useCliente, type ItemCarrito } from "@/components/cliente/EstadoCliente";
import Modal from "@/components/cliente/Modal";
import { BOTON_ACENTO, BOTON_BORDE, Icono, Placa } from "@/components/cliente/Piezas";
import { Muestra } from "@/components/SeguimientoEnVivo";
import { MINUTOS_QR, MODELO, dinero, formatoPlaca, plural, ubicacion } from "@/lib/cliente/formato";
import { COLORES_Z06_2025 } from "@/lib/colores";

const colorHex = (nombre: string) => COLORES_Z06_2025.find((c) => c.nombre === nombre)?.hex;

export default function Carrito() {
  const router = useRouter();
  const { carrito, cargando, autos, estadoFalla, enCarrito, omitir, elegirMarca, confirmarCarrito } = useCliente();
  const [confirmando, setConfirmando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);

  // Agrupar por auto
  const grupos = autos
    .map((auto) => {
      const items = carrito.filter((i) => i.auto.idCarro === auto.idCarro);
      const piezas = items.reduce((s, i) => s + i.opcion.precio, 0);
      const manoObra = items.reduce((s, i) => s + i.falla.manoObra, 0);
      const omitidas = (auto.diagnostico?.fallas ?? []).filter((f) => estadoFalla(auto, f).tipo === "disponible" && !enCarrito(f));
      return { auto, items, piezas, manoObra, subtotal: piezas + manoObra, omitidas };
    })
    .filter((g) => g.items.length > 0);

  const totalPiezas = grupos.reduce((s, g) => s + g.piezas, 0);
  const totalManoObra = grupos.reduce((s, g) => s + g.manoObra, 0);
  const total = totalPiezas + totalManoObra;
  const omitidasTotal = grupos.reduce((s, g) => s + g.omitidas.length, 0);

  async function generar() {
    setGenerando(true);
    setErrores([]);
    const r = await confirmarCarrito();
    setGenerando(false);
    if (r.errores.length > 0) {
      setErrores(r.errores);
      if (r.ids.length === 0) return;
    }
    setConfirmando(false);
    router.push(r.ids.length ? `/pagos?orden=${r.ids[0]}` : "/pagos");
  }

  if (!cargando && grupos.length === 0) {
    return (
      <>
        <TituloPantalla titulo="Carrito" />
        <section className="flex flex-col items-center rounded-xl border border-borde bg-tarjeta px-8 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fondo text-suave">
            <Icono nombre="llave" tamano={22} />
          </span>
          <h2 className="mt-4 font-titulo text-[24px] font-semibold">Tu carrito está vacío</h2>
          <p className="mt-1.5 max-w-[440px] text-[15px] text-suave">
            Cuando el mecánico envíe el diagnóstico de tu auto, sus piezas aparecerán aquí. Si omitiste alguna, vuelve a
            agregarla desde el diagnóstico.
          </p>
          <Link href="/autos" className={`${BOTON_BORDE} mt-6`}>
            Ver mis autos
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <TituloPantalla
        etiqueta="Tu selección"
        titulo="Carrito"
        texto={
          cargando
            ? undefined
            : `${plural(carrito.length, "pieza", "piezas")} de ${plural(grupos.length, "auto", "autos")} · cambia el proveedor o quita las que no quieras reparar`
        }
      />
      <EstadoCarga />

      {grupos.length > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-7">
          {/* Piezas por auto */}
          <div className="flex flex-col gap-5">
            {grupos.map((g) => (
              <section key={g.auto.idCarro} className="overflow-hidden rounded-xl border border-borde bg-tarjeta">
                <header className="flex items-center gap-4 border-b border-borde bg-[#FAFAF9] px-6 py-3.5">
                  <Muestra hex={colorHex(g.auto.color)} tamano={12} />
                  <Placa placa={g.auto.placa} tamano="sm" />
                  <span className="text-sm text-suave">{MODELO}</span>
                  <span className="rounded-full border border-borde bg-tarjeta px-2.5 py-0.5 text-xs font-semibold text-suave">
                    {plural(g.items.length, "pieza", "piezas")}
                  </span>
                  <span className="h-px flex-1 border-t border-dashed border-[#D0D0CC]" aria-hidden="true" />
                  <span className="font-titulo text-[22px] leading-none font-semibold">{dinero(g.subtotal)}</span>
                </header>

                <div className="grid grid-cols-[minmax(0,1fr)_108px_84px_96px_40px] gap-4 px-6 pt-3 pb-1 text-xs font-semibold text-suave" aria-hidden="true">
                  <span>Pieza</span>
                  <span>Proveedor</span>
                  <span className="text-right">Precio</span>
                  <span className="text-right">Mano de obra</span>
                  <span />
                </div>
                <ul>
                  {g.items.map((i) => (
                    <Fila key={i.falla.idFalla} item={i} onQuitar={() => omitir(i.falla)} onMarca={(id) => elegirMarca(i.falla, id)} />
                  ))}
                </ul>
                <footer className="flex items-center justify-between gap-4 border-t border-[#EFEFED] px-6 py-3 text-sm">
                  <Link
                    href={`/autos/${g.auto.idCarro}`}
                    className="font-semibold text-suave underline underline-offset-4 hover:text-tinta"
                  >
                    Ver diagnóstico de {formatoPlaca(g.auto.placa)}
                  </Link>
                  <span className="text-suave">
                    {g.omitidas.length > 0
                      ? `${plural(g.omitidas.length, "pieza omitida", "piezas omitidas")}: se pagarán después en otro QR`
                      : `Piezas ${dinero(g.piezas)} · Mano de obra ${dinero(g.manoObra)}`}
                  </span>
                </footer>
              </section>
            ))}
          </div>

          {/* Resumen */}
          <aside className="sticky top-6 rounded-xl border border-borde bg-tarjeta p-6">
            <h2 className="font-titulo text-[24px] leading-none font-semibold">Resumen del pedido</h2>

            <div className="mt-5 rounded-lg border border-borde bg-fondo px-5 py-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-suave uppercase">Total del pedido</p>
              <p className="mt-1 font-titulo text-[38px] leading-none font-semibold">{dinero(total)}</p>
              <p className="mt-2 text-[13px] text-suave">
                {plural(grupos.length, "auto", "autos")} · {plural(carrito.length, "pieza", "piezas")}
              </p>
            </div>

            <ul className="mt-5 flex flex-col gap-3">
              {grupos.map((g) => (
                <li key={g.auto.idCarro} className="flex items-center gap-2.5 text-[15px]">
                  <Muestra hex={colorHex(g.auto.color)} tamano={10} />
                  <span className="font-titulo font-semibold tracking-[0.08em]">{formatoPlaca(g.auto.placa)}</span>
                  <span className="h-px flex-1 border-t border-dashed border-[#D0D0CC]" aria-hidden="true" />
                  <span>{dinero(g.subtotal)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-borde pt-5">
              <Etiqueta titulo="Total de piezas" valor={dinero(totalPiezas)} />
              <Etiqueta titulo="Total de mano de obra" valor={dinero(totalManoObra)} />
            </div>

            <div className="mt-5 flex items-baseline justify-between border-t border-borde pt-4">
              <span className="text-base font-semibold">Total del servicio</span>
              <span className="font-titulo text-[30px] leading-none font-semibold">
                {dinero(total)} <span className="text-sm text-suave">MXN</span>
              </span>
            </div>
            <CobroPrueba porQR={grupos.length > 1} className="mt-3" />

            <button type="button" onClick={() => setConfirmando(true)} className={`${BOTON_ACENTO} mt-5 w-full`}>
              Confirmar y pagar con CoDi
              <Icono nombre="flecha" />
            </button>

            <div className="mt-4 flex items-start gap-2.5 text-[13px] leading-[1.45] text-suave">
              <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded-md bg-tinta text-[11px] font-semibold text-acento">
                CoDi
              </span>
              <span>
                {grupos.length > 1
                  ? `Se generarán ${grupos.length} códigos QR, uno por auto, porque cada auto tiene su propio recibo.`
                  : "Se generará un código QR para pagar desde la app de tu banco."}{" "}
                Cada QR vence en {MINUTOS_QR} minutos.
              </span>
            </div>
          </aside>
        </div>
      )}

      {confirmando && (
        <Modal
          etiqueta="Antes de pagar"
          titulo={grupos.length > 1 ? `Se generarán ${grupos.length} códigos QR` : "Se generará un código QR"}
          onCerrar={() => !generando && setConfirmando(false)}
          ancho={500}
        >
          <p className="text-[15px]">
            {grupos.length > 1
              ? "Cada auto tiene su propio recibo, así que pagarás un QR por auto. Los verás todos en la pestaña Pagos."
              : "Lo verás en la pestaña Pagos junto con su cuenta regresiva."}
          </p>
          <ul className="mt-4 overflow-hidden rounded-lg border border-borde">
            {grupos.map((g, n) => (
              <li key={g.auto.idCarro} className="flex items-center gap-3 border-t border-[#EFEFED] px-4 py-3 first:border-t-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tinta text-xs font-semibold text-acento">
                  QR{n + 1}
                </span>
                <Placa placa={g.auto.placa} tamano="sm" />
                <span className="flex-1 text-sm text-suave">{plural(g.items.length, "pieza", "piezas")}</span>
                <span className="font-titulo text-[20px] font-semibold">{dinero(g.subtotal)}</span>
              </li>
            ))}
          </ul>
          {omitidasTotal > 0 && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-borde bg-fondo px-3.5 py-3 text-sm">
              <Icono nombre="alerta" tamano={16} className="mt-0.5" />
              Aún te faltan {plural(omitidasTotal, "pieza", "piezas")} del diagnóstico por comprar; podrás pagarlas después en
              otro QR.
            </p>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-[13px] text-suave">
            <Icono nombre="reloj" tamano={14} />
            Cada QR vence en {MINUTOS_QR} minutos. Si vence, puedes generar otro desde Pagos.
          </p>
          {errores.length > 0 && <Aviso tipo="error" texto={`No se pudo generar: ${errores.join(" · ")}`} className="mt-4" />}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setConfirmando(false)} disabled={generando} className={BOTON_BORDE}>
              Volver
            </button>
            <button type="button" onClick={() => void generar()} disabled={generando} className={BOTON_ACENTO}>
              {generando ? "Generando…" : grupos.length > 1 ? `Generar ${grupos.length} QR` : "Generar QR"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Fila({ item, onQuitar, onMarca }: { item: ItemCarrito; onQuitar: () => void; onMarca: (idMarca: number) => void }) {
  const { falla, opcion } = item;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_108px_84px_96px_40px] items-center gap-4 border-t border-[#EFEFED] px-6 py-4 first:border-t-0">
      <div className="min-w-0">
        <p className="text-base font-semibold">{falla.pieza}</p>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-suave">
          <code className="font-mono text-xs">{falla.idPieza}</code>
          <span aria-hidden="true">·</span>
          {ubicacion(falla)}
        </p>
      </div>
      {/* Selector de proveedor: la opción elegida va con fondo tinta y texto amarillo */}
      <div className="flex h-8 overflow-hidden rounded-md border border-borde" role="radiogroup" aria-label={`Proveedor de ${falla.pieza}`}>
        {falla.opciones.map((o) => {
          const activa = o.idMarca === opcion.idMarca;
          return (
            <button
              key={o.idMarca}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => onMarca(o.idMarca)}
              className={`flex-1 cursor-pointer text-xs font-semibold ${activa ? "bg-tinta text-acento" : "bg-tarjeta text-suave hover:text-tinta"}`}
            >
              {o.marca}
            </button>
          );
        })}
      </div>
      <span className="text-right text-[15px] font-semibold">{dinero(opcion.precio)}</span>
      <span className="text-right text-[15px]">{dinero(falla.manoObra)}</span>
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar ${falla.pieza}`}
        title="Quitar del carrito"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-suave hover:bg-fondo hover:text-error"
      >
        <Icono nombre="basura" />
      </button>
    </li>
  );
}

function Etiqueta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-borde px-3.5 py-2.5">
      <p className="text-xs text-suave">{titulo}</p>
      <p className="mt-0.5 font-titulo text-[20px] leading-tight font-semibold">{valor}</p>
    </div>
  );
}
