"use client";

// Mis autos: grid con cada auto del cliente y su seguimiento en vivo. Al tocar una tarjeta se abre su diagnóstico.
// Datos: carro + último diagnóstico visible (ver lib/cliente/fuenteSupabase.ts).
import Link from "next/link";
import { TituloPantalla } from "@/components/cliente/EncabezadoCliente";
import { EstadoCarga, useCliente } from "@/components/cliente/EstadoCliente";
import { BOTON_BORDE, FotoAuto, Icono, PastillaEtapa, Placa } from "@/components/cliente/Piezas";
import { Muestra } from "@/components/SeguimientoEnVivo";
import { MODELO, PASOS, folioDiagnostico } from "@/lib/cliente/formato";
import { COLORES_Z06_2025 } from "@/lib/colores";

export default function MisAutos() {
  const { autos, cargando, etapaDe, estadoFalla, carrito } = useCliente();

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

      <EstadoCarga />

      {!cargando && autos.length === 0 && (
        <section className="flex flex-col items-center rounded-xl border border-borde bg-tarjeta px-8 py-14 text-center">
          <h2 className="font-titulo text-[24px] font-semibold">Aún no registras ningún auto</h2>
          <p className="mt-1.5 text-[15px] text-suave">Registra tu Corvette para que el mecánico lo pueda revisar.</p>
          <Link href="/inicio" className={`${BOTON_BORDE} mt-6`}>
            Registrar mi auto
          </Link>
        </section>
      )}

      <ul className="grid grid-cols-3 gap-6">
        {autos.map((auto) => {
          const hex = COLORES_Z06_2025.find((c) => c.nombre === auto.color)?.hex;
          const etapa = etapaDe(auto);
          const paso = PASOS.findIndex((p) => p.clave === etapa);
          const avance = Math.max(6, (paso / (PASOS.length - 1)) * 100);
          const fallas = auto.diagnostico?.fallas ?? [];
          const enCarrito = carrito.filter((i) => i.auto.idCarro === auto.idCarro).length;
          const porPagar = fallas.filter((f) => estadoFalla(auto, f).tipo === "en_pago").length;
          const aviso =
            enCarrito > 0
              ? `${enCarrito} ${enCarrito === 1 ? "pieza" : "piezas"} en tu carrito`
              : porPagar > 0
                ? "Tienes un QR por pagar"
                : PASOS[paso].texto;
          return (
            <li key={auto.idCarro}>
              <Link
                href={`/autos/${auto.idCarro}`}
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
                    <Placa placa={auto.placa} />
                    <span className="flex items-center gap-1.5 text-right text-sm text-suave">
                      <Muestra hex={hex} tamano={11} />
                      {auto.color}
                    </span>
                  </div>

                  <div className="mt-5 border-t border-borde pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-[13px] text-suave">
                        <span className="h-2 w-2 rounded-full bg-[#17A34A] shadow-[0_0_0_3px_#DCF3E4]" aria-hidden="true" />
                        Seguimiento en vivo
                      </p>
                      <PastillaEtapa etapa={etapa} />
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fondo" aria-hidden="true">
                      <div className="h-full rounded-full bg-acento" style={{ width: `${avance}%` }} />
                    </div>
                    <p className="mt-2.5 flex items-center justify-between gap-3 text-sm">
                      <span className="text-suave">{aviso}</span>
                      {auto.diagnostico && (
                        <span className="font-mono text-xs text-suave">{folioDiagnostico(auto.diagnostico.folio)}</span>
                      )}
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
