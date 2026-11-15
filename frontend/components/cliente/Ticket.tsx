// Ticket de una orden pagada: cliente, mecánico, auto, piezas por proveedor y totales.
// Con Supabase los datos equivalen a v_ticket (num_ticket = id_orden, transaction_id, fecha_pago, renglones).
import Image from "next/image";
import CobroPrueba from "@/components/cliente/CobroPrueba";
import { Placa } from "@/components/cliente/Piezas";
import { Muestra } from "@/components/SeguimientoEnVivo";
import { MODELO, dinero, fechaHora, folioDiagnostico, folioOrden } from "@/lib/cliente/formato";
import type { Marca, OrdenCliente } from "@/lib/cliente/tipos";
import { COLORES_Z06_2025 } from "@/lib/colores";

const PROVEEDORES: Marca[] = ["OEM", "GM"];

export default function Ticket({ orden, cliente, mecanico }: { orden: OrdenCliente; cliente: string; mecanico: string }) {
  const hex = COLORES_Z06_2025.find((c) => c.nombre === orden.color)?.hex;
  const piezas = orden.lineas.reduce((s, l) => s + l.precio, 0);
  const manoObra = orden.lineas.reduce((s, l) => s + l.manoObra, 0);

  return (
    <article className="mx-auto w-full max-w-[400px] rounded-xl border border-borde bg-tarjeta px-7 pt-6 pb-7">
      <div className="flex items-center justify-between">
        <Image src="/paddock-logo.png" alt="Paddock" width={120} height={36} className="h-auto w-[120px]" />
        <span className="text-xs font-semibold tracking-[0.12em] text-suave">TICKET DE SERVICIO</span>
      </div>

      <div className="mt-5 text-center">
        <p className="font-mono text-[15px] font-semibold">{folioOrden(orden.idOrden)}</p>
        <p className="mt-0.5 text-[13px] text-suave">{orden.pagadaEn ? fechaHora(orden.pagadaEn) : ""}</p>
      </div>

      <Separador />

      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-suave">Cliente</dt>
          <dd className="text-[15px] font-semibold">{cliente}</dd>
        </div>
        <div>
          <dt className="text-xs text-suave">Mecánico</dt>
          <dd className="text-[15px] font-semibold">{mecanico || "—"}</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">{MODELO}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-suave">
            <Muestra hex={hex} />
            {orden.color} · <span className="font-mono text-xs">{folioDiagnostico(orden.folio)}</span>
          </p>
        </div>
        <Placa placa={orden.placa} tamano="sm" />
      </div>

      <Separador />

      {PROVEEDORES.map((marca) => {
        const lineas = orden.lineas.filter((l) => l.marca === marca);
        if (lineas.length === 0) return null;
        return (
          <section key={marca} className="mb-4 last:mb-0">
            <p className="mb-2 inline-block rounded-md border border-borde bg-fondo px-2 py-0.5 text-xs font-semibold">
              Proveedor {marca}
            </p>
            <ul className="flex flex-col gap-2">
              {lineas.map((l) => (
                <li key={l.idFalla} className="flex items-start justify-between gap-4 text-[15px]">
                  <span>
                    {l.pieza}
                    <code className="block font-mono text-xs text-suave">{l.idPieza}</code>
                  </span>
                  <span className="font-semibold whitespace-nowrap">{dinero(l.precio)}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <Separador />

      <dl className="flex flex-col gap-1.5 text-[15px]">
        <div className="flex justify-between">
          <dt className="text-suave">Subtotal de piezas</dt>
          <dd>{dinero(piezas)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-suave">
            Subtotal de mano de obra <span className="text-[13px]">({orden.lineas.length})</span>
          </dt>
          <dd>{dinero(manoObra)}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-borde pt-3">
          <dt className="font-titulo text-[20px] font-semibold">Total</dt>
          <dd className="font-titulo text-[28px] leading-none font-semibold">
            {dinero(orden.monto)} <span className="text-sm text-suave">MXN</span>
          </dd>
        </div>
      </dl>

      <p className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-[#BFE3CB] bg-[#E7F5EC] py-2 text-sm font-semibold text-[#166534]">
        Pagado con CoDi · Ref. {String(orden.idOrden).padStart(7, "0")}
      </p>
      <CobroPrueba cobro={orden.cobro} pagado className="mt-2.5" />
    </article>
  );
}

function Separador() {
  return <div className="my-5 border-t border-dashed border-[#D0D0CC]" aria-hidden="true" />;
}
