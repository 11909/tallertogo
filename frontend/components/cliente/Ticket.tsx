// Ticket de una orden pagada: cliente, mecánico, auto, piezas por proveedor y totales.
// TODO (conexión con la BD): leer de v_ticket (num_ticket, transaction_id, fecha_pago, renglones…).
import Image from "next/image";
import { Placa } from "@/components/cliente/Piezas";
import { Muestra } from "@/components/SeguimientoEnVivo";
import {
  AUTOS_CLIENTE,
  MARCAS,
  MECANICO_DEMO,
  MODELO,
  dinero,
  fechaHora,
  folioOrden,
  pieza,
  precioCentavos,
  totalesOrden,
  type Orden,
} from "@/lib/clienteDemo";
import { buscarColor } from "@/lib/colores";

export default function Ticket({ orden, cliente }: { orden: Orden; cliente: string }) {
  const auto = AUTOS_CLIENTE.find((a) => a.id === orden.autoId)!;
  const color = buscarColor(auto.colorCodigo);
  const { piezas, manoDeObra, total } = totalesOrden(orden.lineas);

  return (
    <article className="mx-auto w-full max-w-[400px] rounded-xl border border-borde bg-tarjeta px-7 pt-6 pb-7">
      <div className="flex items-center justify-between">
        <Image src="/paddock-logo.png" alt="Paddock" width={120} height={36} className="h-auto w-[120px]" />
        <span className="text-xs font-semibold tracking-[0.12em] text-suave">TICKET DE SERVICIO</span>
      </div>

      <div className="mt-5 text-center">
        <p className="font-mono text-[15px] font-semibold">{folioOrden(orden.id)}</p>
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
          <dd className="text-[15px] font-semibold">{MECANICO_DEMO}</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">{MODELO}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-suave">
            <Muestra hex={color?.hex} />
            {color?.nombre} · <span className="font-mono text-xs">{auto.folio}</span>
          </p>
        </div>
        <Placa placa={auto.placas} tamano="sm" />
      </div>

      <Separador />

      {MARCAS.map((marca) => {
        const lineas = orden.lineas.filter((l) => l.marca === marca);
        if (lineas.length === 0) return null;
        return (
          <section key={marca} className="mb-4 last:mb-0">
            <p className="mb-2 inline-block rounded-md border border-borde bg-fondo px-2 py-0.5 text-xs font-semibold">
              Proveedor {marca}
            </p>
            <ul className="flex flex-col gap-2">
              {lineas.map((l) => (
                <li key={l.piezaId} className="flex items-start justify-between gap-4 text-[15px]">
                  <span>
                    {pieza(l.piezaId).nombre}
                    <code className="block font-mono text-xs text-suave">{l.piezaId}</code>
                  </span>
                  <span className="font-semibold whitespace-nowrap">{dinero(precioCentavos(marca))}</span>
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
          <dd>{dinero(manoDeObra)}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-borde pt-3">
          <dt className="font-titulo text-[20px] font-semibold">Total</dt>
          <dd className="font-titulo text-[28px] leading-none font-semibold">
            {dinero(total)} <span className="text-sm text-suave">MXN</span>
          </dd>
        </div>
      </dl>

      <p className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-[#BFE3CB] bg-[#E7F5EC] py-2 text-sm font-semibold text-[#166534]">
        Pagado con CoDi · Ref. {String(orden.id).padStart(7, "0")}
      </p>
    </article>
  );
}

function Separador() {
  return <div className="my-5 border-t border-dashed border-[#D0D0CC]" aria-hidden="true" />;
}
