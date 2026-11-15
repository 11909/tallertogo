"use client";

// Pagos del cliente, en dos secciones:
// - Pendientes: QR CoDi por pagar (con cuenta regresiva) y QR vencidos, que se pueden generar de nuevo.
// - Pagados: los tickets (solo de órdenes que pey confirmó).
// La orden abierta se guarda en la URL (?orden=ID) para que el QR o el ticket se puedan abrir desde otras pantallas.
// TODO (conexión con la BD): leer `orden` del cliente y escuchar su cambio a 'pagado' / 'expirado' con Realtime.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CodigoQR from "@/components/cliente/CodigoQR";
import { TituloPantalla } from "@/components/cliente/EncabezadoCliente";
import { useCliente } from "@/components/cliente/EstadoCliente";
import Modal from "@/components/cliente/Modal";
import { BOTON_ACENTO, BOTON_BORDE, Icono, Placa } from "@/components/cliente/Piezas";
import Ticket from "@/components/cliente/Ticket";
import { Muestra } from "@/components/SeguimientoEnVivo";
import { AUTOS_CLIENTE, dinero, fechaHora, folioOrden, formatoPlaca, totalesOrden, type Orden } from "@/lib/clienteDemo";
import { buscarColor } from "@/lib/colores";

export default function Pagos() {
  const router = useRouter();
  const params = useSearchParams();
  const { ordenes, estadoOrden, ahora, usuario } = useCliente();
  const abierta = ordenes.find((o) => String(o.id) === params.get("orden"));

  const abrir = (id: number) => router.replace(`/pagos?orden=${id}`, { scroll: false });
  const cerrar = () => router.replace("/pagos", { scroll: false });

  // Pendientes: QR vigentes, y el último QR vencido de cada auto (los reemplazados por uno nuevo ya no se muestran)
  const pendientes = ordenes.filter((o) => {
    const estado = estadoOrden(o);
    if (estado === "pendiente") return true;
    if (estado !== "expirado") return false;
    return !ordenes.some((otra) => otra.autoId === o.autoId && otra.id > o.id && otra.estado !== "pagado");
  });
  const pagados = ordenes
    .filter((o) => o.estado === "pagado")
    .sort((a, b) => (b.pagadaEn ?? "").localeCompare(a.pagadaEn ?? ""));

  return (
    <>
      <TituloPantalla etiqueta="Historial" titulo="Pagos" texto="Tus códigos QR por pagar y los tickets de lo que ya pagaste." />

      <Seccion titulo="Pendientes" cantidad={pendientes.length}>
        {pendientes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#D0D0CC] bg-tarjeta px-6 py-8 text-center text-[15px] text-suave">
            No tienes pagos pendientes.{" "}
            <Link href="/carrito" className="font-semibold text-tinta underline underline-offset-4">
              Ir al carrito
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendientes.map((o) => (
              <FilaPendiente
                key={o.id}
                orden={o}
                vencida={estadoOrden(o) === "expirado"}
                ahora={ahora}
                onAbrir={() => abrir(o.id)}
              />
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Pagados" cantidad={pagados.length} nota="Toca un pago para ver su ticket">
        {pagados.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#D0D0CC] bg-tarjeta px-6 py-8 text-center text-[15px] text-suave">
            Aquí aparecerán tus tickets cuando pagues.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-borde bg-tarjeta">
            {pagados.map((o) => {
              const auto = AUTOS_CLIENTE.find((a) => a.id === o.autoId)!;
              return (
                <li key={o.id} className="border-t border-[#EFEFED] first:border-t-0">
                  <button
                    type="button"
                    onClick={() => abrir(o.id)}
                    className="grid w-full cursor-pointer grid-cols-[40px_170px_minmax(0,1fr)_150px_24px] items-center gap-5 px-6 py-4 text-left hover:bg-[#FAFAF9]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E7F5EC] text-[#166534]">
                      <Icono nombre="check" tamano={16} />
                    </span>
                    <span>
                      <span className="block font-mono text-sm font-semibold">{folioOrden(o.id)}</span>
                      <span className="text-[13px] text-suave">{o.pagadaEn ? fechaHora(o.pagadaEn) : ""}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <Placa placa={auto.placas} tamano="sm" />
                      <span className="text-sm text-suave">
                        {o.lineas.length} {o.lineas.length === 1 ? "pieza" : "piezas"} · {auto.folio}
                      </span>
                    </span>
                    <span className="text-right font-titulo text-[22px] font-semibold">{dinero(totalesOrden(o.lineas).total)}</span>
                    <span className="-rotate-90 text-suave">
                      <Icono nombre="chevron" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Seccion>

      {abierta &&
        (abierta.estado === "pagado" && !params.get("recien") ? (
          <Modal etiqueta="Comprobante de pago" titulo="Ticket" ancho={480} onCerrar={cerrar}>
            <Ticket orden={abierta} cliente={usuario.nombre} />
            <button type="button" onClick={cerrar} className={`${BOTON_BORDE} mt-5 w-full`}>
              Cerrar
            </button>
          </Modal>
        ) : (
          <ModalQR key={abierta.id} orden={abierta} onCerrar={cerrar} onCambiar={abrir} />
        ))}
    </>
  );
}

function Seccion({
  titulo,
  cantidad,
  nota,
  children,
}: {
  titulo: string;
  cantidad: number;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 font-titulo text-[24px] font-semibold">
          {titulo}
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-tinta px-2 font-sans text-xs text-acento">
            {cantidad}
          </span>
        </h2>
        {nota && <span className="text-sm text-suave">{nota}</span>}
      </div>
      {children}
    </section>
  );
}

const restante = (expiraEn: string, ahora: number | null) => {
  if (ahora === null) return "--:--";
  const s = Math.max(0, Math.floor((new Date(expiraEn).getTime() - ahora) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function FilaPendiente({
  orden,
  vencida,
  ahora,
  onAbrir,
}: {
  orden: Orden;
  vencida: boolean;
  ahora: number | null;
  onAbrir: () => void;
}) {
  const auto = AUTOS_CLIENTE.find((a) => a.id === orden.autoId)!;
  const color = buscarColor(auto.colorCodigo);
  return (
    <li className="grid grid-cols-[150px_minmax(0,1fr)_120px_210px_190px] items-center gap-6 rounded-xl border border-borde bg-tarjeta px-6 py-4">
      <div>
        <p className="text-xs text-suave">Orden</p>
        <p className="font-mono text-sm font-semibold">{folioOrden(orden.id)}</p>
      </div>
      <div className="flex items-center gap-3">
        <Placa placa={auto.placas} tamano="sm" />
        <span className="flex items-center gap-1.5 text-sm text-suave">
          <Muestra hex={color?.hex} />
          {orden.lineas.length} {orden.lineas.length === 1 ? "pieza" : "piezas"}
        </span>
      </div>
      <div>
        <p className="text-xs text-suave">Monto</p>
        <p className="font-titulo text-[22px] leading-tight font-semibold">{dinero(totalesOrden(orden.lineas).total)}</p>
      </div>
      <div>
        {vencida ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full border border-error/30 bg-error/5 px-2.5 py-0.5 text-xs font-semibold text-error">
              <Icono nombre="alerta" tamano={13} />
              QR vencido
            </span>
            <p className="mt-1 text-[13px] text-suave">Venció {fechaHora(orden.expiraEn)}</p>
          </>
        ) : (
          <>
            <span className="inline-flex rounded-full border border-tinta px-2.5 py-0.5 text-xs font-semibold">Por pagar</span>
            <p className="mt-1 flex items-center gap-1 text-[13px] text-suave">
              <Icono nombre="reloj" tamano={13} />
              Vence en <span className="font-mono">{restante(orden.expiraEn, ahora)}</span>
            </p>
          </>
        )}
      </div>
      <button type="button" onClick={onAbrir} className={`${BOTON_BORDE} w-full`}>
        {vencida ? "Generar nuevo QR" : "Ver QR"}
      </button>
    </li>
  );
}

function ModalQR({ orden, onCerrar, onCambiar }: { orden: Orden; onCerrar: () => void; onCambiar: (id: number) => void }) {
  const router = useRouter();
  const { estadoOrden, ahora, generarNuevoQR, simularPago } = useCliente();
  const confirmado = orden.estado === "pagado";
  const estado = estadoOrden(orden);
  const vencida = estado === "expirado";
  const auto = AUTOS_CLIENTE.find((a) => a.id === orden.autoId)!;
  const { total } = totalesOrden(orden.lineas);

  if (confirmado) {
    return (
      <Modal etiqueta="Pago con CoDi" titulo="Pago confirmado" onCerrar={onCerrar}>
        <div className="flex flex-col items-center rounded-lg border border-[#BFE3CB] bg-[#E7F5EC] px-6 py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#166534] text-white">
            <Icono nombre="check" tamano={28} />
          </span>
          <p className="mt-4 font-titulo text-[30px] leading-none font-semibold text-tinta">{dinero(total)}</p>
          <p className="mt-2 text-[15px] text-[#166534]">
            Recibimos el pago de {formatoPlaca(auto.placas)}. Tu reparación ya está en turno.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.replace(`/pagos?orden=${orden.id}`, { scroll: false })}
          className={`${BOTON_ACENTO} mt-5 w-full`}
        >
          Ver ticket
          <Icono nombre="flecha" />
        </button>
      </Modal>
    );
  }

  return (
    <Modal etiqueta="Pago con CoDi" titulo={vencida ? "Este QR venció" : "Escanea para pagar"} onCerrar={onCerrar}>
      <div className="relative flex justify-center rounded-lg border border-borde bg-tarjeta py-5">
        <CodigoQR semilla={orden.id} apagado={vencida} />
        {vencida && (
          <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-error/30 bg-tarjeta px-3 py-1 text-sm font-semibold text-error">
            <Icono nombre="reloj" tamano={15} />
            Vencido
          </span>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between border-b border-borde pb-4">
        <div>
          <p className="text-xs text-suave">Total a pagar</p>
          <p className="font-titulo text-[34px] leading-none font-semibold">
            {dinero(total)} <span className="text-sm text-suave">MXN</span>
          </p>
        </div>
        <Placa placa={auto.placas} tamano="sm" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 text-[15px]">
        <div>
          <dt className="text-xs text-suave">Concepto</dt>
          <dd className="font-semibold">Suspensión · {auto.folio}</dd>
        </div>
        <div>
          <dt className="text-xs text-suave">Orden</dt>
          <dd className="font-mono text-sm font-semibold">{folioOrden(orden.id)}</dd>
        </div>
      </dl>

      {vencida ? (
        <>
          <p role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2.5 text-sm text-error">
            <Icono nombre="alerta" tamano={16} className="mt-px" />
            <span>
              <b>El QR venció sin recibir el pago.</b> Genera uno nuevo para pagar; si pagas un QR vencido, el pago no se
              aplica.
            </span>
          </p>
          <button type="button" onClick={() => onCambiar(generarNuevoQR(orden.id))} className={`${BOTON_ACENTO} mt-5 w-full`}>
            Generar nuevo QR
          </button>
        </>
      ) : (
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
          {/* Solo para la demo: en producción el webhook de pey confirma el pago */}
          <button
            type="button"
            onClick={() => {
              simularPago(orden.id);
              router.replace(`/pagos?orden=${orden.id}&recien=1`, { scroll: false });
            }}
            className="mt-4 w-full cursor-pointer rounded-lg border border-dashed border-[#D0D0CC] py-2 text-[13px] font-semibold text-suave hover:border-tinta hover:text-tinta"
          >
            Simular pago (solo demo)
          </button>
        </>
      )}
    </Modal>
  );
}
