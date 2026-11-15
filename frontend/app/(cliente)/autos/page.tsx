"use client";

// Mis autos: grid con cada auto del cliente y su seguimiento en vivo. Al tocar una tarjeta se abre su diagnóstico.
// TODO (conexión con la BD): leer los autos de `carro` y el estado de su último `diagnostico` (como /inicio),
// y recargar con Supabase Realtime cuando el mecánico cambie un diagnóstico.
import Link from "next/link";
import { TituloPantalla } from "@/components/cliente/EncabezadoCliente";
import { useCliente } from "@/components/cliente/EstadoCliente";
import { BOTON_BORDE, FotoAuto, Icono, PastillaEtapa, Placa } from "@/components/cliente/Piezas";
import { Muestra } from "@/components/SeguimientoEnVivo";
import { AUTOS_CLIENTE, MODELO, PASOS } from "@/lib/clienteDemo";
import { buscarColor } from "@/lib/colores";

export default function MisAutos() {
  const { etapaDe } = useCliente();

  return (
    <>
      <TituloPantalla
        etiqueta="Tu garage"
        titulo="Mis autos"
        texto="Elige un auto para ver su diagnóstico y seguir su reparación en vivo."
        accion={
          <Link href="/inicio" className={BOTON_BORDE}>
            <Icono nombre="mas" tamano={16} />
            Registrar otro auto
          </Link>
        }
      />

      <ul className="grid grid-cols-3 gap-6">
        {AUTOS_CLIENTE.map((auto) => {
          const color = buscarColor(auto.colorCodigo);
          const etapa = etapaDe(auto.id);
          const paso = PASOS.findIndex((p) => p.clave === etapa);
          const avance = Math.max(6, (paso / (PASOS.length - 1)) * 100);
          return (
            <li key={auto.id}>
              <Link
                href={`/autos/${auto.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-borde bg-tarjeta transition hover:border-tinta"
              >
                <FotoAuto alto={168} className="border-b border-borde" />

                <div className="flex flex-1 flex-col px-6 pt-5 pb-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.12em] text-suave">CHEVROLET</p>
                      <h2 className="font-titulo text-[24px] leading-tight font-semibold">{MODELO}</h2>
                    </div>
                    <span className="mt-1 text-suave transition group-hover:translate-x-0.5 group-hover:text-tinta">
                      <Icono nombre="flecha" />
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Placa placa={auto.placas} />
                    <span className="flex items-center gap-1.5 text-right text-sm text-suave">
                      <Muestra hex={color?.hex} tamano={11} />
                      {color?.nombre}
                    </span>
                  </div>

                  <div className="mt-5 border-t border-borde pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-[13px] text-suave">
                        <span
                          className="h-2 w-2 rounded-full bg-[#17A34A] shadow-[0_0_0_3px_#DCF3E4]"
                          aria-hidden="true"
                        />
                        Seguimiento en vivo
                      </p>
                      <PastillaEtapa etapa={etapa} />
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fondo" aria-hidden="true">
                      <div className="h-full rounded-full bg-acento" style={{ width: `${avance}%` }} />
                    </div>
                    <p className="mt-2.5 flex items-center justify-between text-sm">
                      <span className="text-suave">{PASOS[paso].texto}</span>
                      {auto.folio && <span className="font-mono text-xs text-suave">{auto.folio}</span>}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
