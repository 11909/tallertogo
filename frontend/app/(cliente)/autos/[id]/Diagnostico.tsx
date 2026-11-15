"use client";

// Diagnóstico de un auto (vista del cliente). Para ver otro auto hay que regresar a Mis autos.
// - Seguimiento en vivo del diagnóstico.
// - Las piezas que indicó el mecánico entran solas al carrito (con OEM). Cada pieza es una pestaña colapsable
//   con los proveedores disponibles y su precio: el cliente cambia el proveedor u omite la pieza.
// - "Cerrar diagnóstico": las piezas omitidas quedan sin comprar. "Reabrir": vuelven al carrito y se pagan
//   después en un QR aparte (compras parciales).
// Datos: v_diagnostico_cliente por folio (ver lib/cliente/fuenteSupabase.ts).
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Aviso from "@/components/Aviso";
import { EstadoCarga, useCliente, type EstadoFalla } from "@/components/cliente/EstadoCliente";
import LineaTiempo from "@/components/cliente/LineaTiempo";
import Modal from "@/components/cliente/Modal";
import { BOTON_ACENTO, BOTON_BORDE, FotoAuto, Icono, PastillaEtapa, Placa } from "@/components/cliente/Piezas";
import { Muestra } from "@/components/SeguimientoEnVivo";
import { MODELO, dinero, fecha, folioDiagnostico, folioOrden, plural, puedeComprar, ubicacion } from "@/lib/cliente/formato";
import type { OpcionMarca } from "@/lib/cliente/tipos";
import { COLORES_Z06_2025 } from "@/lib/colores";

export default function Diagnostico() {
  const { id } = useParams<{ id: string }>();
  const { autos, cargando, ordenes, etapaDe, estadoFalla, enCarrito, opcionElegida, elegirMarca, omitir, incluir, cambiarCierre, carrito } =
    useCliente();
  const [abierta, setAbierta] = useState<number | null>(null);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auto = autos.find((a) => String(a.idCarro) === id);
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
        <EstadoCarga />
        {!cargando && <Vacio titulo="No encontramos este auto" texto="Regresa a Mis autos y elige uno de la lista." />}
      </>
    );
  }

  const hex = COLORES_Z06_2025.find((c) => c.nombre === auto.color)?.hex;
  const etapa = etapaDe(auto);
  const diagnostico = auto.diagnostico;
  const cerrado = Boolean(diagnostico?.cerrado);
  const comprable = puedeComprar(etapa);
  const pagos = ordenes.filter((o) => o.idCarro === auto.idCarro && o.estado === "pagado");

  const fallas = (diagnostico?.fallas ?? []).map((f) => ({ falla: f, estado: estadoFalla(auto, f) }));
  const omitidas = fallas.filter((x) => x.estado.tipo === "disponible" && !enCarrito(x.falla));
  const itemsAuto = carrito.filter((i) => i.auto.idCarro === auto.idCarro);
  const totalAuto = itemsAuto.reduce((s, i) => s + i.opcion.precio + i.falla.manoObra, 0);

  async function cambiar(cerrar: boolean) {
    setGuardando(true);
    setError(null);
    try {
      await cambiarCierre(auto!, cerrar);
      setConfirmarCierre(false);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar el cambio. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
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
            <Placa placa={auto.placa} tamano="lg" />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-suave">
            <Muestra hex={hex} tamano={11} />
            {auto.color}
          </p>
          <dl className="mt-6 grid grid-cols-4 gap-6 border-t border-borde pt-5">
            <Dato titulo="Folio">
              <span className="font-mono text-[15px]">{diagnostico ? folioDiagnostico(diagnostico.folio) : "Por asignar"}</span>
            </Dato>
            <Dato titulo="Enviado">{diagnostico?.fechaEnvio ? fecha(diagnostico.fechaEnvio) : "—"}</Dato>
            <Dato titulo="Diagnosticado por">{diagnostico?.mecanico || "—"}</Dato>
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
            esperando: auto.fechaRegistro,
            enviado: diagnostico?.fechaEnvio ?? undefined,
            pagado: pagos.map((p) => p.pagadaEn ?? "").sort()[0] || undefined,
            en_reparacion: diagnostico?.fechaReparacion ?? undefined,
            listo: diagnostico?.fechaListo ?? undefined,
            entregado: diagnostico?.fechaEntrega ?? undefined,
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
              <p className="mt-1 font-titulo text-[22px] leading-tight font-semibold">{diagnostico.mecanico || "Tu mecánico"}</p>
            </div>
            <p className="text-base leading-relaxed">{diagnostico.descripcion}</p>
          </section>

          {/* Piezas defectuosas */}
          <div className="mt-10 mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-titulo text-[24px] leading-none font-semibold">Piezas a reemplazar</h2>
              <p className="mt-1.5 text-sm text-suave">
                {comprable && !cerrado
                  ? "Ya están en tu carrito con OEM. Abre cada pieza para cambiar el proveedor u omitirla."
                  : plural(fallas.length, "pieza", "piezas")}
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
              texto="Cerraste este diagnóstico: las piezas que omitiste quedan sin comprar. Reábrelo cuando quieras comprarlas; se pagarán en un QR aparte."
              className="mb-4"
            />
          )}
          {!comprable && (
            <p className="mb-4 rounded-lg border border-borde bg-fondo px-4 py-3 text-sm text-suave">
              Tu auto ya entró a reparación: las piezas que no compraste quedan como no compradas.
            </p>
          )}
          {error && <Aviso tipo="error" texto={error} className="mb-4" />}

          <ul className="flex flex-col gap-3">
            {fallas.map(({ falla, estado }, i) => {
              const abiertaEsta = abierta === falla.idFalla;
              const incluida = estado.tipo === "disponible" && enCarrito(falla);
              const omitida = estado.tipo === "disponible" && !incluida;
              const atenuada = (omitida && cerrado) || estado.tipo === "no_comprada";
              return (
                <li
                  key={falla.idFalla}
                  className={`overflow-hidden rounded-xl border bg-tarjeta transition ${abiertaEsta ? "border-tinta" : "border-borde"} ${
                    atenuada ? "opacity-60" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setAbierta(abiertaEsta ? null : falla.idFalla)}
                    aria-expanded={abiertaEsta}
                    className="grid w-full cursor-pointer grid-cols-[40px_minmax(0,1fr)_170px_120px_150px_24px] items-center gap-4 px-6 py-4 text-left hover:bg-[#FAFAF9]"
                  >
                    <span className="font-titulo text-[22px] font-semibold text-suave">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="block text-base font-semibold">{falla.pieza}</span>
                      <code className="font-mono text-xs text-suave">{falla.idPieza}</code>
                    </span>
                    <span>
                      <span className="block text-xs text-suave">Ubicación</span>
                      <span className="text-[15px]">{ubicacion(falla)}</span>
                    </span>
                    <span>
                      <span className="block text-xs text-suave">Mano de obra</span>
                      <span className="text-[15px] font-semibold">{dinero(falla.manoObra)}</span>
                    </span>
                    <span className="flex justify-end">
                      <EstadoPieza estado={estado} incluida={incluida} marca={opcionElegida(falla).marca} cerrado={cerrado} />
                    </span>
                    <span className={`text-suave transition ${abiertaEsta ? "rotate-180 text-tinta" : ""}`}>
                      <Icono nombre="chevron" />
                    </span>
                  </button>

                  {abiertaEsta && (
                    <div className="border-t border-[#EFEFED] bg-[#FAFAF9] px-6 pt-5 pb-6">
                      {estado.tipo === "disponible" ? (
                        <>
                          <p className="text-xs font-semibold tracking-[0.12em] text-suave uppercase">Proveedores disponibles</p>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            {falla.opciones.map((opcion) => (
                              <Proveedor
                                key={opcion.idMarca}
                                opcion={opcion}
                                manoObra={falla.manoObra}
                                elegido={incluida && opcionElegida(falla).idMarca === opcion.idMarca}
                                deshabilitado={omitida && cerrado}
                                onElegir={() => elegirMarca(falla, opcion.idMarca)}
                              />
                            ))}
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#EFEFED] pt-4">
                            <p className="text-[13px] text-suave">
                              {incluida
                                ? "La mano de obra solo se cobra si compras la pieza."
                                : cerrado
                                  ? "Reabre el diagnóstico para volver a agregar esta pieza."
                                  : "Omitiste esta pieza: no se cobrará. Puedes comprarla después en un QR aparte."}
                            </p>
                            {incluida ? (
                              <button type="button" onClick={() => omitir(falla)} className={`${BOTON_BORDE} h-9 px-3 text-[15px]`}>
                                <Icono nombre="cerrar" tamano={15} />
                                Omitir esta pieza
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => incluir(falla)}
                                disabled={cerrado}
                                className={`${BOTON_BORDE} h-9 px-3 text-[15px]`}
                              >
                                <Icono nombre="mas" tamano={15} />
                                Volver a agregar
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <DetalleCompra estado={estado} />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Acciones */}
          <div className="mt-8 flex items-center justify-between gap-6 rounded-xl border border-borde bg-tarjeta px-6 py-4">
            {comprable ? (
              <button
                type="button"
                disabled={guardando}
                onClick={() => (cerrado ? void cambiar(false) : omitidas.length > 0 ? setConfirmarCierre(true) : void cambiar(true))}
                className={BOTON_BORDE}
              >
                {cerrado ? "Reabrir diagnóstico" : "Cerrar diagnóstico"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-5">
              <p className="text-right text-sm text-suave">
                {itemsAuto.length === 0 ? (
                  "No hay piezas de este auto en tu carrito"
                ) : (
                  <>
                    {plural(itemsAuto.length, "pieza", "piezas")} en tu carrito
                    <span className="block font-titulo text-[22px] font-semibold text-tinta">{dinero(totalAuto)}</span>
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
          <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-suave uppercase">Piezas omitidas</p>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {omitidas.map(({ falla }) => (
              <li key={falla.idFalla} className="flex justify-between gap-3">
                <span>{falla.pieza}</span>
                <code className="font-mono text-xs whitespace-nowrap text-suave">{falla.idPieza}</code>
              </li>
            ))}
          </ul>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setConfirmarCierre(false)} className={BOTON_BORDE}>
              Volver
            </button>
            <button type="button" disabled={guardando} onClick={() => void cambiar(true)} className={`${BOTON_BORDE} border-tinta`}>
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

function EstadoPieza({ estado, incluida, marca, cerrado }: { estado: EstadoFalla; incluida: boolean; marca: string; cerrado: boolean }) {
  const base = "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";
  if (estado.tipo === "pagada") return <span className={`${base} border-[#BFE3CB] bg-[#E7F5EC] text-[#166534]`}>Pagada · {estado.marca}</span>;
  if (estado.tipo === "en_pago") return <span className={`${base} border-borde bg-fondo text-suave`}>QR por pagar</span>;
  if (estado.tipo === "no_comprada") return <span className={`${base} border-borde bg-fondo text-suave`}>No comprada</span>;
  if (incluida) return <span className={`${base} border-tinta bg-tinta text-acento`}>En carrito · {marca}</span>;
  return (
    <span className={`${base} border-dashed border-[#D0D0CC] bg-tarjeta text-suave`}>{cerrado ? "Sin comprar" : "Omitida"}</span>
  );
}

function Proveedor({
  opcion,
  manoObra,
  elegido,
  deshabilitado,
  onElegir,
}: {
  opcion: OpcionMarca;
  manoObra: number;
  elegido: boolean;
  deshabilitado: boolean;
  onElegir: () => void;
}) {
  return (
    <div className={`flex flex-col rounded-lg border bg-tarjeta px-5 py-4 ${elegido ? "border-tinta shadow-[inset_0_0_0_1px_#111214]" : "border-borde"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
              elegido ? "bg-tinta text-acento" : "border border-borde bg-fondo text-tinta"
            }`}
          >
            {opcion.marca}
          </span>
          <p className="mt-2 text-sm text-suave">{opcion.nombreComercial}</p>
        </div>
        <p className="text-right">
          <span className="block font-titulo text-[22px] leading-none font-semibold">{dinero(opcion.precio)}</span>
          <span className="text-xs text-suave">pieza</span>
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#EFEFED] pt-3">
        <p className="text-[13px] text-suave">
          Con mano de obra <span className="font-semibold text-tinta">{dinero(opcion.precio + manoObra)}</span>
        </p>
        {elegido ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-tinta px-3 font-titulo text-[15px] font-semibold text-acento">
            <Icono nombre="check" tamano={15} />
            En tu carrito
          </span>
        ) : (
          <button type="button" onClick={onElegir} disabled={deshabilitado} className={`${BOTON_BORDE} h-9 px-3 text-[15px]`}>
            Elegir {opcion.marca}
          </button>
        )}
      </div>
    </div>
  );
}

function DetalleCompra({ estado }: { estado: Exclude<EstadoFalla, { tipo: "disponible" }> }) {
  if (estado.tipo === "no_comprada")
    return <p className="text-[15px] text-suave">Esta pieza no se compró antes de que el auto entrara a reparación.</p>;
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[15px]">
        {estado.tipo === "pagada" ? (
          <>
            Compraste esta pieza con <b>{estado.marca}</b> en la orden <span className="font-mono text-sm">{folioOrden(estado.idOrden)}</span>.
          </>
        ) : (
          <>
            Esta pieza ({estado.marca}) está en la orden <span className="font-mono text-sm">{folioOrden(estado.idOrden)}</span>, que
            espera tu pago con CoDi.
          </>
        )}
      </p>
      <Link href={`/pagos?orden=${estado.idOrden}`} className={`${BOTON_BORDE} h-9 px-3 text-[15px]`}>
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
