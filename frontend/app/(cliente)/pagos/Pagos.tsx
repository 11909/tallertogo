"use client";

// Pagos del cliente. Un "pedido" junta todos los QR que se generaron para las mismas piezas: si un QR vence,
// el nuevo QR queda en el mismo pedido y se ven todos, también los vencidos.
// - Pendientes: pedidos con un QR vigente o con el último QR vencido / rechazado.
// - Pagados: pedidos con su ticket (solo órdenes que pey confirmó) y el historial de sus QR.
// La orden abierta va en la URL (?orden=ID) para poder abrir un QR o ticket desde otras pantallas.
// Datos: v_orden_cliente (una fila por línea de cada orden) y RPC regenerar_qr.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Aviso from "@/components/Aviso";
import CobroPrueba from "@/components/cliente/CobroPrueba";
import CodigoQR from "@/components/cliente/CodigoQR";
import { TituloPantalla } from "@/components/cliente/EncabezadoCliente";
import { EstadoCarga, useCliente, type Pedido } from "@/components/cliente/EstadoCliente";
import Modal from "@/components/cliente/Modal";
import { BOTON_ACENTO, BOTON_BORDE, Icono, Placa } from "@/components/cliente/Piezas";
import Ticket from "@/components/cliente/Ticket";
import { Muestra } from "@/components/SeguimientoEnVivo";
import { dinero, fechaHora, folioDiagnostico, folioOrden, formatoPlaca, plural, restante } from "@/lib/cliente/formato";
import type { OrdenCliente } from "@/lib/cliente/tipos";
import { COLORES_Z06_2025 } from "@/lib/colores";

const colorHex = (nombre: string) => COLORES_Z06_2025.find((c) => c.nombre === nombre)?.hex;

export default function Pagos() {
  const router = useRouter();
  const params = useSearchParams();
  const { pedidos, ordenes, autos, usuario } = useCliente();
  const abierta = ordenes.find((o) => String(o.idOrden) === params.get("orden"));

  const abrir = (id: number) => router.replace(`/pagos?orden=${id}`, { scroll: false });
  const cerrar = () => router.replace("/pagos", { scroll: false });

  const pendientes = pedidos
    .filter((p) => p.estado === "pendiente" || p.estado === "vencido" || p.estado === "rechazado")
    .sort((a, b) => b.ultimo.idOrden - a.ultimo.idOrden);
  const pagados = pedidos
    .filter((p) => p.estado === "pagado")
    .sort((a, b) => (b.pagada?.pagadaEn ?? "").localeCompare(a.pagada?.pagadaEn ?? ""));
  const resueltos = pedidos.filter((p) => p.estado === "resuelto");

  const mecanicoDe = (o: OrdenCliente) => {
    const d = autos.find((a) => a.idCarro === o.idCarro)?.diagnostico;
    return d?.folio === o.folio ? d.mecanico : "";
  };

  return (
    <>
      <TituloPantalla etiqueta="Historial" titulo="Pagos" texto="Tus códigos QR por pagar, los que vencieron y los tickets de lo que ya pagaste." />
      <EstadoCarga />

      <Seccion titulo="Pendientes" cantidad={pendientes.length}>
        {pendientes.length === 0 ? (
          <Vacia>
            No tienes pagos pendientes.{" "}
            <Link href="/carrito" className="font-semibold text-tinta underline underline-offset-4">
              Ir al carrito
            </Link>
          </Vacia>
        ) : (
          <ul className="flex flex-col gap-4">
            {pendientes.map((p) => (
              <TarjetaPedido key={p.idPedido} pedido={p} onAbrir={abrir} />
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Pagados" cantidad={pagados.length} nota="Toca un pago para ver su ticket">
        {pagados.length === 0 ? (
          <Vacia>Aquí aparecerán tus tickets cuando pagues.</Vacia>
        ) : (
          <ul className="flex flex-col gap-3">
            {pagados.map((p) => (
              <FilaPagado key={p.idPedido} pedido={p} onAbrir={abrir} />
            ))}
          </ul>
        )}
      </Seccion>

      {resueltos.length > 0 && (
        <Seccion titulo="QR sin pagar" cantidad={resueltos.length} nota="Sus piezas ya se pagaron o están en otro QR">
          <ul className="flex flex-col gap-3">
            {resueltos.map((p) => (
              <TarjetaPedido key={p.idPedido} pedido={p} onAbrir={abrir} />
            ))}
          </ul>
        </Seccion>
      )}

      {abierta &&
        (abierta.estado === "pagado" && !params.get("recien") ? (
          <Modal etiqueta="Comprobante de pago" titulo="Ticket" ancho={480} onCerrar={cerrar}>
            <Ticket orden={abierta} cliente={usuario?.nombre ?? ""} mecanico={mecanicoDe(abierta)} />
            <button type="button" onClick={cerrar} className={`${BOTON_BORDE} mt-5 w-full`}>
              Cerrar
            </button>
          </Modal>
        ) : (
          <ModalQR key={abierta.idOrden} orden={abierta} pedido={pedidos.find((p) => p.idPedido === abierta.idPedido)} onCerrar={cerrar} onCambiar={abrir} />
        ))}
    </>
  );
}

function Seccion({ titulo, cantidad, nota, children }: { titulo: string; cantidad: number; nota?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 font-titulo text-[24px] font-semibold">
          {titulo}
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-tinta px-2 font-sans text-xs text-acento">{cantidad}</span>
        </h2>
        {nota && <span className="text-sm text-suave">{nota}</span>}
      </div>
      {children}
    </section>
  );
}

function Vacia({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[#D0D0CC] bg-tarjeta px-6 py-8 text-center text-[15px] text-suave">{children}</p>;
}

// Estado de un QR en particular
function EstadoQR({ orden }: { orden: OrdenCliente }) {
  const { estadoOrden, ahora } = useCliente();
  const estado = estadoOrden(orden);
  const base = "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";
  if (estado === "pagado") return <span className={`${base} border-[#BFE3CB] bg-[#E7F5EC] text-[#166534]`}>Pagado</span>;
  if (estado === "pendiente")
    return (
      <span className={`${base} border-tinta text-tinta`}>
        <Icono nombre="reloj" tamano={12} />
        Vence en <span className="font-mono">{restante(orden.expiraEn, ahora)}</span>
      </span>
    );
  if (estado === "rechazado")
    return (
      <span className={`${base} border-error/30 bg-error/5 text-error`}>
        <Icono nombre="alerta" tamano={12} />
        Pago rechazado
      </span>
    );
  return <span className={`${base} border-borde bg-fondo text-suave`}>Vencido</span>;
}

function TarjetaPedido({ pedido, onAbrir }: { pedido: Pedido; onAbrir: (id: number) => void }) {
  const { estadoOrden } = useCliente();
  const { ultimo } = pedido;
  const vigente = estadoOrden(ultimo) === "pendiente";
  const accionable = pedido.estado !== "resuelto";
  return (
    <li className="overflow-hidden rounded-xl border border-borde bg-tarjeta">
      <div className="grid grid-cols-[minmax(0,1fr)_130px_200px] items-center gap-6 px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <Placa placa={pedido.placa} tamano="sm" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm text-suave">
              <Muestra hex={colorHex(pedido.color)} />
              {folioDiagnostico(pedido.folio)} · {plural(ultimo.lineas.length, "pieza", "piezas")}
            </p>
            <p className="truncate text-[15px] font-semibold">{ultimo.lineas.map((l) => l.pieza).join(", ")}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-suave">Monto</p>
          <p className="font-titulo text-[22px] leading-tight font-semibold">{dinero(ultimo.monto)}</p>
        </div>
        {accionable ? (
          <button type="button" onClick={() => onAbrir(ultimo.idOrden)} className={`${BOTON_BORDE} w-full`}>
            {vigente ? "Ver QR" : "Generar nuevo QR"}
          </button>
        ) : (
          <span className="text-right text-sm text-suave">Sin acción pendiente</span>
        )}
      </div>
      <HistorialQR pedido={pedido} onAbrir={onAbrir} />
    </li>
  );
}

// Todos los QR de un pedido, del más nuevo al más viejo (incluye los vencidos)
function HistorialQR({ pedido, onAbrir }: { pedido: Pedido; onAbrir: (id: number) => void }) {
  const { estadoOrden } = useCliente();
  return (
    <div className="border-t border-[#EFEFED] bg-[#FAFAF9] px-6 py-3">
      <p className="mb-1.5 text-xs font-semibold tracking-[0.12em] text-suave uppercase">
        {plural(pedido.intentos.length, "QR generado", "QR generados")}
      </p>
      <ul>
        {pedido.intentos.map((o) => (
          <li key={o.idOrden} className="grid grid-cols-[150px_minmax(0,1fr)_auto_70px] items-center gap-4 py-1.5 text-sm">
            <span className="font-mono text-[13px] font-semibold">{folioOrden(o.idOrden)}</span>
            <span className="text-suave">
              Generado {fechaHora(o.creadaEn)}
              {o.pagadaEn && ` · pagado ${fechaHora(o.pagadaEn)}`}
            </span>
            <EstadoQR orden={o} />
            <span className="text-right">
              {(estadoOrden(o) === "pendiente" || o.estado === "pagado") && (
                <button type="button" onClick={() => onAbrir(o.idOrden)} className="cursor-pointer font-semibold underline underline-offset-4 hover:text-tinta">
                  {o.estado === "pagado" ? "Ticket" : "Ver"}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilaPagado({ pedido, onAbrir }: { pedido: Pedido; onAbrir: (id: number) => void }) {
  const pagada = pedido.pagada!;
  const [historial, setHistorial] = useState(false);
  return (
    <li className="overflow-hidden rounded-xl border border-borde bg-tarjeta">
      <div className="grid grid-cols-[40px_160px_minmax(0,1fr)_130px_150px] items-center gap-5 px-6 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E7F5EC] text-[#166534]">
          <Icono nombre="check" tamano={16} />
        </span>
        <span>
          <span className="block font-mono text-sm font-semibold">{folioOrden(pagada.idOrden)}</span>
          <span className="text-[13px] text-suave">{pagada.pagadaEn ? fechaHora(pagada.pagadaEn) : ""}</span>
        </span>
        <span className="flex min-w-0 items-center gap-3">
          <Placa placa={pedido.placa} tamano="sm" />
          <span className="min-w-0 text-sm text-suave">
            {plural(pagada.lineas.length, "pieza", "piezas")} · {folioDiagnostico(pedido.folio)}
            {pedido.intentos.length > 1 && (
              <button
                type="button"
                onClick={() => setHistorial(!historial)}
                aria-expanded={historial}
                className="ml-2 cursor-pointer font-semibold underline underline-offset-4 hover:text-tinta"
              >
                {historial ? "Ocultar" : "Ver"} {plural(pedido.intentos.length, "QR", "QR")}
              </button>
            )}
          </span>
        </span>
        <span className="text-right font-titulo text-[22px] font-semibold">{dinero(pagada.monto)}</span>
        <button type="button" onClick={() => onAbrir(pagada.idOrden)} className={`${BOTON_BORDE} w-full`}>
          Ver ticket
        </button>
      </div>
      {historial && <HistorialQR pedido={pedido} onAbrir={onAbrir} />}
    </li>
  );
}

function ModalQR({
  orden,
  pedido,
  onCerrar,
  onCambiar,
}: {
  orden: OrdenCliente;
  pedido?: Pedido;
  onCerrar: () => void;
  onCambiar: (id: number) => void;
}) {
  const router = useRouter();
  const { estadoOrden, ahora, generarNuevoQR, generarQR, simularPago } = useCliente();
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const estado = estadoOrden(orden);
  const vencida = estado === "expirado" || estado === "rechazado";
  const anteriores = (pedido?.intentos.length ?? 1) - 1;

  async function regenerar() {
    setTrabajando(true);
    setError(null);
    try {
      onCambiar(await generarNuevoQR(orden.idOrden));
    } catch (fallo) {
      setError(fallo instanceof Error ? `No se pudo generar el QR: ${fallo.message}` : "No se pudo generar el QR. Intenta de nuevo.");
    } finally {
      setTrabajando(false);
    }
  }

  async function reintentarQR() {
    if (!generarQR) return;
    setTrabajando(true);
    setError(null);
    try {
      await generarQR(orden.idOrden);
    } catch (fallo) {
      setError(fallo instanceof Error ? `No se pudo generar el QR: ${fallo.message}` : "No se pudo generar el QR. Intenta de nuevo.");
    } finally {
      setTrabajando(false);
    }
  }

  if (orden.estado === "pagado") {
    return (
      <Modal etiqueta="Pago con CoDi" titulo="Pago confirmado" onCerrar={onCerrar}>
        <div className="flex flex-col items-center rounded-lg border border-[#BFE3CB] bg-[#E7F5EC] px-6 py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#166534] text-white">
            <Icono nombre="check" tamano={28} />
          </span>
          <p className="mt-4 font-titulo text-[30px] leading-none font-semibold text-tinta">{dinero(orden.monto)}</p>
          <p className="mt-2 text-[15px] text-[#166534]">Recibimos el pago de {formatoPlaca(orden.placa)}. Tu reparación ya está en turno.</p>
        </div>
        <CobroPrueba cobro={orden.cobro} pagado className="mt-3" />
        <button
          type="button"
          onClick={() => router.replace(`/pagos?orden=${orden.idOrden}`, { scroll: false })}
          className={`${BOTON_ACENTO} mt-5 w-full`}
        >
          Ver ticket
          <Icono nombre="flecha" />
        </button>
      </Modal>
    );
  }

  return (
    <Modal etiqueta="Pago con CoDi" titulo={vencida ? (estado === "rechazado" ? "El pago de este QR se rechazó" : "Este QR venció") : "Escanea para pagar"} onCerrar={onCerrar}>
      <div className="relative flex justify-center rounded-lg border border-borde bg-tarjeta py-5">
        <CodigoQR qrString={orden.qrString} apagado={vencida} />
        {vencida && (
          <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-error/30 bg-tarjeta px-3 py-1 text-sm font-semibold text-error">
            <Icono nombre="reloj" tamano={15} />
            {estado === "rechazado" ? "Rechazado" : "Vencido"}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between border-b border-borde pb-4">
        <div>
          <p className="text-xs text-suave">Total del servicio</p>
          <p className="font-titulo text-[34px] leading-none font-semibold">
            {dinero(orden.monto)} <span className="text-sm text-suave">MXN</span>
          </p>
        </div>
        <Placa placa={orden.placa} tamano="sm" />
      </div>
      <CobroPrueba cobro={orden.cobro} className="mt-3" />

      <dl className="mt-4 grid grid-cols-2 gap-4 text-[15px]">
        <div>
          <dt className="text-xs text-suave">Concepto</dt>
          <dd className="font-semibold">
            Suspensión · {folioDiagnostico(orden.folio)} · {plural(orden.lineas.length, "pieza", "piezas")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-suave">Orden</dt>
          <dd className="font-mono text-sm font-semibold">{folioOrden(orden.idOrden)}</dd>
          {anteriores > 0 && <dd className="text-[13px] text-suave">{plural(anteriores, "QR anterior vencido", "QR anteriores vencidos")}</dd>}
        </div>
      </dl>

      {vencida ? (
        <>
          <p role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2.5 text-sm text-error">
            <Icono nombre="alerta" tamano={16} className="mt-px" />
            <span>
              {estado === "rechazado" ? (
                <>
                  <b>El pago no se aplicó</b> (llegó tarde o con otro monto). Genera un QR nuevo para pagar.
                </>
              ) : (
                <>
                  <b>El QR venció sin recibir el pago.</b> Genera uno nuevo; si pagas un QR vencido, el pago no se aplica.
                </>
              )}
            </span>
          </p>
          {error && <Aviso tipo="error" texto={error} className="mt-3" />}
          <button type="button" onClick={() => void regenerar()} disabled={trabajando} className={`${BOTON_ACENTO} mt-5 w-full`}>
            {trabajando ? "Generando…" : "Generar nuevo QR"}
          </button>
        </>
      ) : (
        <>
          {orden.qrString ? (
            <>
              <div className="mt-5 flex items-center justify-between rounded-lg bg-fondo px-4 py-3">
                <span className="flex items-center gap-2.5 text-sm">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-acento" aria-hidden="true" />
                  Esperando confirmación del pago…
                </span>
                <span className="flex items-center gap-1.5 text-sm text-suave">
                  <Icono nombre="reloj" tamano={15} />
                  <span className="font-mono text-tinta">{restante(orden.expiraEn, ahora)}</span>
                </span>
              </div>
              <p className="mt-3 text-[13px] text-suave">
                Abre la app de tu banco, entra a CoDi y escanea el código. Esta pantalla se actualiza sola cuando llegue el pago.
              </p>
            </>
          ) : (
            <div className="mt-4">
              <Aviso tipo="error" texto={error ?? "No se pudo generar el QR de esta orden. Intenta generarlo de nuevo."} />
              {generarQR && (
                <button type="button" onClick={() => void reintentarQR()} disabled={trabajando} className={`${BOTON_BORDE} mt-3 w-full`}>
                  {trabajando ? "Generando…" : "Reintentar generación del QR"}
                </button>
              )}
            </div>
          )}
          {simularPago && (
            // Solo en la demo: en producción el webhook de pey confirma el pago
            <button
              type="button"
              disabled={trabajando}
              onClick={async () => {
                setTrabajando(true);
                await simularPago(orden.idOrden);
                setTrabajando(false);
                router.replace(`/pagos?orden=${orden.idOrden}&recien=1`, { scroll: false });
              }}
              className="mt-4 w-full cursor-pointer rounded-lg border border-dashed border-[#D0D0CC] py-2 text-[13px] font-semibold text-suave hover:border-tinta hover:text-tinta"
            >
              Simular pago (solo demo)
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
