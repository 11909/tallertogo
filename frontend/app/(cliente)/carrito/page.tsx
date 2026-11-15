"use client";

// Carrito del cliente: las piezas elegidas en los diagnósticos, agrupadas por auto (cada auto tiene su recibo).
// Al confirmar se genera un QR CoDi por auto y se abre en la pestaña Pagos.
// TODO (conexión con la BD): por cada auto llamar crear_orden(folio, [{ id_falla, id_marca }]) y pedir el QR a pey
// desde el servidor. El total de aquí es solo para mostrar: lo que se cobra lo calcula crear_orden.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TituloPantalla } from "@/components/cliente/EncabezadoCliente";
import { useCliente } from "@/components/cliente/EstadoCliente";
import { BOTON_ACENTO, BOTON_BORDE, Icono, Placa } from "@/components/cliente/Piezas";
import { Muestra } from "@/components/SeguimientoEnVivo";
import {
  AUTOS_CLIENTE,
  MINUTOS_QR,
  MODELO,
  centavos,
  dinero,
  formatoPlaca,
  pieza,
  precioCentavos,
  ubicacion,
} from "@/lib/clienteDemo";
import { buscarColor } from "@/lib/colores";
import { DIAGNOSTICOS_DEMO } from "@/lib/diagnosticosDemo";

export default function Carrito() {
  const router = useRouter();
  const { carrito, quitar, confirmarCarrito } = useCliente();

  const grupos = AUTOS_CLIENTE.filter((a) => Object.keys(carrito[a.id] ?? {}).length > 0).map((auto) => {
    const lineas = Object.entries(carrito[auto.id]).map(([piezaId, marca]) => {
      const manoDeObra = centavos(DIAGNOSTICOS_DEMO[auto.id]?.fallas.find((f) => f.piezaId === piezaId)?.manoDeObra ?? 0);
      return { piezaId, marca, pieza: pieza(piezaId), precio: precioCentavos(marca), manoDeObra };
    });
    const piezas = lineas.reduce((s, l) => s + l.precio, 0);
    const manoDeObra = lineas.reduce((s, l) => s + l.manoDeObra, 0);
    return { auto, color: buscarColor(auto.colorCodigo), lineas, piezas, manoDeObra, subtotal: piezas + manoDeObra };
  });

  const totalPiezas = grupos.reduce((s, g) => s + g.piezas, 0);
  const totalManoDeObra = grupos.reduce((s, g) => s + g.manoDeObra, 0);
  const total = totalPiezas + totalManoDeObra;
  const cantidad = grupos.reduce((s, g) => s + g.lineas.length, 0);

  function confirmar() {
    const ids = confirmarCarrito();
    router.push(ids.length ? `/pagos?orden=${ids[0]}` : "/pagos");
  }

  if (grupos.length === 0) {
    return (
      <>
        <TituloPantalla titulo="Carrito" />
        <section className="flex flex-col items-center rounded-xl border border-borde bg-tarjeta px-8 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fondo text-suave">
            <Icono nombre="llave" tamano={22} />
          </span>
          <h2 className="mt-4 font-titulo text-[24px] font-semibold">Tu carrito está vacío</h2>
          <p className="mt-1.5 max-w-[420px] text-[15px] text-suave">
            Abre el diagnóstico de tu auto y agrega las piezas que quieras reparar.
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
        texto={`${cantidad} ${cantidad === 1 ? "pieza" : "piezas"} de ${grupos.length} ${grupos.length === 1 ? "auto" : "autos"}`}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-7">
        {/* Piezas por auto */}
        <div className="flex flex-col gap-5">
          {grupos.map((g) => (
            <section key={g.auto.id} className="overflow-hidden rounded-xl border border-borde bg-tarjeta">
              <header className="flex items-center gap-4 border-b border-borde bg-[#FAFAF9] px-6 py-3.5">
                <Muestra hex={g.color?.hex} tamano={12} />
                <Placa placa={g.auto.placas} tamano="sm" />
                <span className="text-sm text-suave">{MODELO}</span>
                <span className="rounded-full border border-borde bg-tarjeta px-2.5 py-0.5 text-xs font-semibold text-suave">
                  {g.lineas.length} {g.lineas.length === 1 ? "pieza" : "piezas"}
                </span>
                <span className="h-px flex-1 border-t border-dashed border-[#D0D0CC]" aria-hidden="true" />
                <span className="font-titulo text-[22px] leading-none font-semibold">{dinero(g.subtotal)}</span>
              </header>

              <div
                className="grid grid-cols-[minmax(0,1fr)_64px_96px_110px_40px] gap-4 px-6 pt-3 pb-1 text-xs font-semibold text-suave"
                aria-hidden="true"
              >
                <span>Pieza</span>
                <span>Proveedor</span>
                <span className="text-right">Precio</span>
                <span className="text-right">Mano de obra</span>
                <span />
              </div>
              <ul>
                {g.lineas.map((l) => (
                  <li
                    key={l.piezaId}
                    className="grid grid-cols-[minmax(0,1fr)_64px_96px_110px_40px] items-center gap-4 border-t border-[#EFEFED] px-6 py-4 first:border-t-0"
                  >
                    <div className="min-w-0">
                      <p className="text-base font-semibold">{l.pieza.nombre}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-sm text-suave">
                        <code className="font-mono text-xs">{l.piezaId}</code>
                        <span aria-hidden="true">·</span>
                        {ubicacion(l.pieza)}
                      </p>
                    </div>
                    <span>
                      <span className="inline-block rounded-md border border-borde bg-fondo px-2 py-0.5 text-xs font-semibold">
                        {l.marca}
                      </span>
                    </span>
                    <span className="text-right text-[15px] font-semibold">{dinero(l.precio)}</span>
                    <span className="text-right text-[15px]">{dinero(l.manoDeObra)}</span>
                    <button
                      type="button"
                      onClick={() => quitar(g.auto.id, l.piezaId)}
                      aria-label={`Quitar ${l.pieza.nombre}`}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-suave hover:bg-fondo hover:text-error"
                    >
                      <Icono nombre="basura" />
                    </button>
                  </li>
                ))}
              </ul>
              <footer className="flex items-center justify-between border-t border-[#EFEFED] px-6 py-3 text-sm">
                <Link href={`/autos/${g.auto.id}`} className="font-semibold text-suave underline underline-offset-4 hover:text-tinta">
                  Ver diagnóstico de {formatoPlaca(g.auto.placas)}
                </Link>
                <span className="text-suave">
                  Piezas {dinero(g.piezas)} · Mano de obra {dinero(g.manoDeObra)}
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
              {grupos.length} {grupos.length === 1 ? "auto" : "autos"} · {cantidad} {cantidad === 1 ? "pieza" : "piezas"}
            </p>
          </div>

          <ul className="mt-5 flex flex-col gap-3">
            {grupos.map((g) => (
              <li key={g.auto.id} className="flex items-center gap-2.5 text-[15px]">
                <Muestra hex={g.color?.hex} tamano={10} />
                <span className="font-titulo font-semibold tracking-[0.08em]">{formatoPlaca(g.auto.placas)}</span>
                <span className="h-px flex-1 border-t border-dashed border-[#D0D0CC]" aria-hidden="true" />
                <span>{dinero(g.subtotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-borde pt-5">
            <Etiqueta titulo="Total de piezas" valor={dinero(totalPiezas)} />
            <Etiqueta titulo="Total de mano de obra" valor={dinero(totalManoDeObra)} />
          </div>

          <div className="mt-5 flex items-baseline justify-between border-t border-borde pt-4">
            <span className="text-base font-semibold">Total a pagar</span>
            <span className="font-titulo text-[30px] leading-none font-semibold">
              {dinero(total)} <span className="text-sm text-suave">MXN</span>
            </span>
          </div>

          <button type="button" onClick={confirmar} className={`${BOTON_ACENTO} mt-5 w-full`}>
            Confirmar y pagar con CoDi
            <Icono nombre="flecha" />
          </button>

          <div className="mt-4 flex items-start gap-2.5 text-[13px] leading-[1.45] text-suave">
            <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded-md bg-tinta text-[11px] font-semibold text-acento">
              CoDi
            </span>
            <span>
              {grupos.length > 1
                ? `Se genera un QR por auto, porque cada auto tiene su propio recibo. `
                : "Te mostraremos un código QR para pagar desde la app de tu banco. "}
              Cada QR vence en {MINUTOS_QR} minutos.
            </span>
          </div>
        </aside>
      </div>
    </>
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
