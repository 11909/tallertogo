"use client";

// Diagnóstico de un auto (vista del cliente). Para ver otro auto hay que regresar a Mis autos.
// - Seguimiento en vivo del diagnóstico (antes estaba en /inicio).
// - Cada pieza defectuosa es una pestaña colapsable: al abrirla muestra los proveedores (OEM y GM) con su precio
//   y el cliente decide cuál agrega al carrito. La mano de obra es por pieza y solo se cobra si la compra.
// - "Cerrar diagnóstico" deja de ofrecer las piezas que faltan; "Reabrir" las vuelve a ofrecer (compras parciales).
// TODO (conexión con la BD): leer v_diagnostico_cliente por folio y escuchar el cambio de estado con Realtime.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Aviso from "@/components/Aviso";
import { useCliente, type EstadoFalla } from "@/components/cliente/EstadoCliente";
import LineaTiempo from "@/components/cliente/LineaTiempo";
import Modal from "@/components/cliente/Modal";
import { BOTON_ACENTO, BOTON_BORDE, FotoAuto, Icono, PastillaEtapa, Placa } from "@/components/cliente/Piezas";
import { Muestra } from "@/components/SeguimientoEnVivo";
import {
  AUTOS_CLIENTE,
  MARCAS,
  MECANICO_DEMO,
  MODELO,
  centavos,
  dinero,
  fecha,
  folioOrden,
  pieza,
  precioCentavos,
  puedeComprar,
  ubicacion,
  type Marca,
} from "@/lib/clienteDemo";
import { buscarColor } from "@/lib/colores";
import { DIAGNOSTICOS_DEMO } from "@/lib/diagnosticosDemo";

export default function Diagnostico() {
  const { id } = useParams<{ id: string }>();
  const { carrito, cerrados, etapaDe, estadoFalla, elegir, quitar, alternarCierre, ordenes } = useCliente();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  const auto = AUTOS_CLIENTE.find((a) => a.id === id);
  const regresar = (
    <Link href="/autos" className={`${BOTON_BORDE} mb-6 h-10 px-3.5 text-[15px]`}>
      <Icono nombre="atras" tamano={16} />
      Mis autos
    </Link>
  );

  if (!auto) {
    return (
      <>
        {regresar}
        <Vacio titulo="No encontramos este auto" texto="Regresa a Mis autos y elige uno de la lista." />
      </>
    );
  }

  const color = buscarColor(auto.colorCodigo);
  const etapa = etapaDe(auto.id);
  const diagnostico = DIAGNOSTICOS_DEMO[auto.id];
  const enCarrito = carrito[auto.id] ?? {};
  const cerrado = Boolean(cerrados[auto.id]);
  const comprable = puedeComprar(etapa) && !cerrado;
  const pagos = ordenes.filter((o) => o.autoId === auto.id && o.estado === "pagado");

  const fallas = (diagnostico?.fallas ?? []).map((f) => ({
    ...f,
    pieza: pieza(f.piezaId),
    estado: estadoFalla(auto.id, f.piezaId),
  }));
  const sinComprar = fallas.filter((f) => f.estado.tipo === "disponible" && !enCarrito[f.piezaId]);
  const elegidas = fallas.filter((f) => f.estado.tipo === "disponible" && enCarrito[f.piezaId]);
  const totalElegido = elegidas.reduce((s, f) => s + precioCentavos(enCarrito[f.piezaId]) + centavos(f.manoDeObra), 0);

  function pedirCierre() {
    if (sinComprar.length > 0) setConfirmarCierre(true);
    else alternarCierre(auto!.id);
  }

  return (
    <>
      {regresar}

      {/* Encabezado del auto */}
      <section className="grid grid-cols-[360px_minmax(0,1fr)] overflow-hidden rounded-xl border border-borde bg-tarjeta">
        <FotoAuto alto={220} llenar className="border-r border-borde" />
        <div className="px-8 py-7">
          <p className="text-xs font-semibold tracking-[0.12em] text-suave uppercase">Diagnóstico de suspensión</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-4">
            <h1 className="font-titulo text-[30px] leading-none font-semibold">{MODELO}</h1>
            <Placa placa={auto.placas} tamano="lg" />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-suave">
            <Muestra hex={color?.hex} tamano={11} />
            {color?.nombre}
          </p>
          <dl className="mt-6 grid grid-cols-4 gap-6 border-t border-borde pt-5">
            <Dato titulo="Folio">
              <span className="font-mono text-[15px]">{auto.folio ?? "Por asignar"}</span>
            </Dato>
            <Dato titulo="Enviado">{diagnostico ? fecha(diagnostico.enviadoEn) : "—"}</Dato>
            <Dato titulo="Diagnosticado por">{diagnostico ? MECANICO_DEMO : "—"}</Dato>
            <Dato titulo="Estado">
              <PastillaEtapa etapa={etapa} />
            </Dato>
          </dl>
        </div>
      </section>

      {/* Seguimiento en vivo */}
      <section className="mt-6 rounded-xl border border-borde bg-tarjeta px-8 pt-6 pb-7" aria-label="Seguimiento en vivo">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-titulo text-[22px] font-semibold">Seguimiento en vivo</h2>
          <p className="flex items-center gap-2 text-[13px] text-suave">
            <span className="h-2 w-2 rounded-full bg-[#17A34A] shadow-[0_0_0_4px_#DCF3E4]" aria-hidden="true" />
            Se actualiza solo
          </p>
        </div>
        <LineaTiempo
          etapa={etapa}
          fechas={{
            esperando: auto.registradoEn,
            enviado: diagnostico?.enviadoEn,
            pagado: pagos.at(-1)?.pagadaEn ?? diagnostico?.pago?.pagadoEn,
            en_reparacion: diagnostico?.reparacionEn,
            listo: diagnostico?.listoEn,
            entregado: diagnostico?.entregadoEn,
          }}
        />
      </section>

      {!diagnostico ? (
        <Vacio
          titulo="El mecánico aún no envía el diagnóstico de este auto"
          texto="En cuanto termine de revisar la suspensión verás aquí las piezas a reemplazar."
          icono="reloj"
        />
      ) : (
        <>
          {/* Lo que encontró el mecánico */}
          <section className="mt-6 grid grid-cols-[260px_minmax(0,1fr)] gap-8 rounded-xl border border-borde bg-tarjeta px-8 py-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-suave uppercase">Lo que encontró</p>
              <p className="mt-1 font-titulo text-[22px] leading-tight font-semibold">{MECANICO_DEMO}, tu mecánico</p>
            </div>
            <p className="text-base leading-relaxed">{diagnostico.descripcion}</p>
          </section>

          {/* Piezas defectuosas */}
          <div className="mt-10 mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-titulo text-[24px] leading-none font-semibold">Piezas a reemplazar</h2>
              <p className="mt-1.5 text-sm text-suave">
                {fallas.length} {fallas.length === 1 ? "pieza" : "piezas"} · abre cada una para elegir proveedor
              </p>
            </div>
            {cerrado && (
              <span className="rounded-full border border-borde bg-fondo px-3 py-1 text-xs font-semibold text-suave">
                Diagnóstico cerrado
              </span>
            )}
          </div>

          {cerrado && (
            <Aviso
              tipo="exito"
              texto="Cerraste este diagnóstico. Las piezas que no compraste siguen aquí: reábrelo cuando quieras comprarlas."
              className="mb-4"
            />
          )}
          {!puedeComprar(etapa) && (
            <p className="mb-4 rounded-lg border border-borde bg-fondo px-4 py-3 text-sm text-suave">
              Tu auto ya entró a reparación: las piezas que no compraste quedan como no compradas.
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {fallas.map((f, i) => {
              const abiertaEsta = abierta === f.piezaId;
              const marcaEnCarrito = f.estado.tipo === "disponible" ? enCarrito[f.piezaId] : undefined;
              const atenuada = f.estado.tipo === "disponible" && !marcaEnCarrito && !comprable;
              return (
                <li
                  key={f.piezaId}
                  className={`overflow-hidden rounded-xl border bg-tarjeta transition ${
                    abiertaEsta ? "border-tinta" : "border-borde"
                  } ${atenuada ? "opacity-60" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setAbierta(abiertaEsta ? null : f.piezaId)}
                    aria-expanded={abiertaEsta}
                    className="grid w-full cursor-pointer grid-cols-[40px_minmax(0,1fr)_170px_120px_150px_24px] items-center gap-4 px-6 py-4 text-left hover:bg-[#FAFAF9]"
                  >
                    <span className="font-titulo text-[22px] font-semibold text-suave">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="block text-base font-semibold">{f.pieza.nombre}</span>
                      <code className="font-mono text-xs text-suave">{f.piezaId}</code>
                    </span>
                    <span>
                      <span className="block text-xs text-suave">Ubicación</span>
                      <span className="text-[15px]">{ubicacion(f.pieza)}</span>
                    </span>
                    <span>
                      <span className="block text-xs text-suave">Mano de obra</span>
                      <span className="text-[15px] font-semibold">{dinero(centavos(f.manoDeObra))}</span>
                    </span>
                    <span className="flex justify-end">
                      <EstadoPieza estado={f.estado} marcaEnCarrito={marcaEnCarrito} comprable={puedeComprar(etapa)} />
                    </span>
                    <span className={`text-suave transition ${abiertaEsta ? "rotate-180 text-tinta" : ""}`}>
                      <Icono nombre="chevron" />
                    </span>
                  </button>

                  {abiertaEsta && (
                    <div className="border-t border-[#EFEFED] bg-[#FAFAF9] px-6 pt-5 pb-6">
                      {f.estado.tipo === "disponible" ? (
                        <>
                          <p className="text-xs font-semibold tracking-[0.12em] text-suave uppercase">
                            Proveedores disponibles
                          </p>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            {MARCAS.map((marca) => (
                              <Proveedor
                                key={marca}
                                marca={marca}
                                nombre={f.pieza.nombreTecnico}
                                manoDeObra={centavos(f.manoDeObra)}
                                elegido={marcaEnCarrito === marca}
                                deshabilitado={!comprable}
                                onAgregar={() => elegir(auto.id, f.piezaId, marca)}
                                onQuitar={() => quitar(auto.id, f.piezaId)}
                              />
                            ))}
                          </div>
                          <p className="mt-3 text-[13px] text-suave">
                            Solo puedes elegir un proveedor por pieza. La mano de obra solo se cobra si compras la pieza.
                          </p>
                        </>
                      ) : (
                        <DetalleCompra estado={f.estado} />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Acciones */}
          <div className="mt-8 flex items-center justify-between gap-6 rounded-xl border border-borde bg-tarjeta px-6 py-4">
            {puedeComprar(etapa) ? (
              <button type="button" onClick={cerrado ? () => alternarCierre(auto.id) : pedirCierre} className={BOTON_BORDE}>
                {cerrado ? "Reabrir diagnóstico" : "Cerrar diagnóstico"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-5">
              <p className="text-right text-sm text-suave">
                {elegidas.length === 0 ? (
                  "Aún no agregas piezas de este auto"
                ) : (
                  <>
                    {elegidas.length} {elegidas.length === 1 ? "pieza" : "piezas"} en tu carrito
                    <span className="block font-titulo text-[22px] font-semibold text-tinta">{dinero(totalElegido)}</span>
                  </>
                )}
              </p>
              <Link href="/carrito" className={BOTON_ACENTO}>
                Ir al carrito
                <Icono nombre="flecha" tamano={18} />
              </Link>
            </div>
          </div>
        </>
      )}

      {confirmarCierre && (
        <Modal etiqueta="Antes de cerrar" titulo="Aún te faltan piezas por comprar" onCerrar={() => setConfirmarCierre(false)}>
          <div className="flex items-start gap-3 rounded-lg border border-borde bg-fondo px-4 py-3.5 text-[15px]">
            <Icono nombre="alerta" className="mt-0.5 text-tinta" />
            <p>Aún te faltan piezas del diagnóstico por comprar; podrás pagarlas después.</p>
          </div>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {sinComprar.map((f) => (
              <li key={f.piezaId} className="flex justify-between gap-3">
                <span>{f.pieza.nombre}</span>
                <code className="font-mono text-xs whitespace-nowrap text-suave">{f.piezaId}</code>
              </li>
            ))}
          </ul>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setConfirmarCierre(false)} className={BOTON_BORDE}>
              Volver
            </button>
            <button
              type="button"
              onClick={() => {
                alternarCierre(auto.id);
                setConfirmarCierre(false);
              }}
              className={`${BOTON_BORDE} border-tinta`}
            >
              Cerrar diagnóstico
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-suave">{titulo}</dt>
      <dd className="mt-1 text-[15px] font-semibold">{children}</dd>
    </div>
  );
}

function EstadoPieza({ estado, marcaEnCarrito, comprable }: { estado: EstadoFalla; marcaEnCarrito?: Marca; comprable: boolean }) {
  const base = "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";
  if (estado.tipo === "pagada")
    return <span className={`${base} border-[#BFE3CB] bg-[#E7F5EC] text-[#166534]`}>Pagada · {estado.marca}</span>;
  if (estado.tipo === "en_pago") return <span className={`${base} border-borde bg-fondo text-suave`}>QR por pagar</span>;
  if (marcaEnCarrito) return <span className={`${base} border-tinta bg-tinta text-acento`}>En carrito · {marcaEnCarrito}</span>;
  if (!comprable) return <span className={`${base} border-borde bg-fondo text-suave`}>No comprada</span>;
  return <span className="text-[13px] text-suave">Elige proveedor</span>;
}

function Proveedor({
  marca,
  nombre,
  manoDeObra,
  elegido,
  deshabilitado,
  onAgregar,
  onQuitar,
}: {
  marca: Marca;
  nombre: string;
  manoDeObra: number;
  elegido: boolean;
  deshabilitado: boolean;
  onAgregar: () => void;
  onQuitar: () => void;
}) {
  const precio = precioCentavos(marca);
  return (
    <div
      className={`flex flex-col rounded-lg border bg-tarjeta px-5 py-4 ${elegido ? "border-tinta shadow-[inset_0_0_0_1px_#111214]" : "border-borde"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
              elegido ? "bg-tinta text-acento" : "border border-borde bg-fondo text-tinta"
            }`}
          >
            {marca}
          </span>
          <p className="mt-2 text-sm text-suave">{nombre}</p>
        </div>
        <p className="text-right">
          <span className="block font-titulo text-[22px] leading-none font-semibold">{dinero(precio)}</span>
          <span className="text-xs text-suave">pieza</span>
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#EFEFED] pt-3">
        <p className="text-[13px] text-suave">
          Con mano de obra <span className="font-semibold text-tinta">{dinero(precio + manoDeObra)}</span>
        </p>
        {elegido ? (
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={onQuitar}
              disabled={deshabilitado}
              className="cursor-pointer text-[13px] font-semibold text-suave underline underline-offset-4 hover:text-tinta disabled:cursor-not-allowed"
            >
              Quitar
            </button>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-tinta px-3 font-titulo text-[15px] font-semibold text-acento">
              <Icono nombre="check" tamano={15} />
              En tu carrito
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={onAgregar}
            disabled={deshabilitado}
            className={`${BOTON_BORDE} h-9 px-3 text-[15px]`}
          >
            <Icono nombre="mas" tamano={15} />
            Agregar al carrito
          </button>
        )}
      </div>
    </div>
  );
}

function DetalleCompra({ estado }: { estado: Exclude<EstadoFalla, { tipo: "disponible" }> }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[15px]">
        {estado.tipo === "pagada" ? (
          <>
            Compraste esta pieza con <b>{estado.marca}</b> en la orden{" "}
            <span className="font-mono text-sm">{folioOrden(estado.ordenId)}</span>.
          </>
        ) : (
          <>
            Esta pieza ({estado.marca}) está en la orden <span className="font-mono text-sm">{folioOrden(estado.ordenId)}</span>,
            que espera tu pago con CoDi.
          </>
        )}
      </p>
      <Link href={`/pagos?orden=${estado.ordenId}`} className={`${BOTON_BORDE} h-9 px-3 text-[15px]`}>
        {estado.tipo === "pagada" ? "Ver ticket" : "Ver QR"}
      </Link>
    </div>
  );
}

function Vacio({ titulo, texto, icono = "alerta" }: { titulo: string; texto: string; icono?: "alerta" | "reloj" }) {
  return (
    <section className="mt-6 flex flex-col items-center rounded-xl border border-borde bg-tarjeta px-8 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fondo text-suave">
        <Icono nombre={icono} tamano={22} />
      </span>
      <h2 className="mt-4 font-titulo text-[24px] font-semibold">{titulo}</h2>
      <p className="mt-1.5 max-w-[460px] text-[15px] text-suave">{texto}</p>
    </section>
  );
}
