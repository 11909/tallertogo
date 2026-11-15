"use client";

// Ver diagnóstico (mecánico, diseñada para computadora)
// Diagnóstico ya enviado, de solo lectura, con su línea de tiempo.
// La misma pantalla sirve para todas las etapas: cuando el cliente ya pagó, muestra la marca
// que eligió en cada pieza y el total pagado con CoDi.
// Por ahora usa datos de ejemplo. Falta leer el diagnóstico de Supabase.
import Link from "next/link";
import { useParams } from "next/navigation";
import BarraSuperior from "@/components/BarraSuperior";
import FranjaAuto from "@/components/FranjaAuto";
import MenuMecanico from "@/components/MenuMecanico";
import { AUTOS_DEMO, ETAPAS_TALLER, hora, type EtapaTaller } from "@/lib/autosTaller";
import { CATALOGO, PRECIO_DEMO } from "@/lib/catalogo";
import { DIAGNOSTICOS_DEMO, precioPieza } from "@/lib/diagnosticosDemo";

const capital = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();
const dinero = (n: number) => `$${n.toFixed(2)}`;

const AVISO: Record<EtapaTaller, { titulo: string; texto: string }> = {
  por_diagnosticar: { titulo: "Sin diagnóstico", texto: "" },
  esperando_pago: { titulo: "Esperando que el cliente pague", texto: "El cliente está eligiendo las piezas y la marca de cada una." },
  pagado: { titulo: "Pagado con CoDi", texto: "Inicia la reparación desde la lista cuando sea su turno." },
  en_reparacion: { titulo: "En reparación", texto: "Márcalo como listo desde la lista al terminar." },
  listo: { titulo: "Listo para entregar", texto: "Márcalo como entregado cuando el cliente recoja su auto." },
  entregado: { titulo: "Entregado", texto: "El servicio está terminado." },
};

export default function VerDiagnostico() {
  const { id } = useParams<{ id: string }>();
  const auto = AUTOS_DEMO.find((a) => a.id === id);
  const diag = DIAGNOSTICOS_DEMO[id];

  if (!auto || !auto.folio || !diag) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <BarraSuperior derecha={<MenuMecanico />} />
        <main className="flex flex-1 flex-col items-center justify-center gap-3 text-suave">
          <p>{auto && !auto.folio ? "Este auto todavía no tiene diagnóstico." : "No encontramos ese diagnóstico."}</p>
          <div className="flex gap-3">
            {auto && !auto.folio && (
              <Link
                href={`/taller/diagnostico/${auto.id}`}
                className="rounded-lg border border-borde bg-tarjeta px-3.5 py-2 font-semibold text-tinta hover:border-tinta"
              >
                Diagnosticar
              </Link>
            )}
            <Link href="/taller" className="px-1 py-2 font-semibold text-tinta underline underline-offset-4">
              Volver a autos por atender
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const pagado = Boolean(diag.pago);
  const fallas = diag.fallas.map((f) => ({ ...f, pieza: CATALOGO.find((p) => p.id === f.piezaId)! }));
  const compradas = fallas.filter((f) => f.marcaElegida);
  const totalManoDeObra = (pagado ? compradas : fallas).reduce((s, f) => s + f.manoDeObra, 0);
  const totalPiezas = compradas.reduce((s, f) => s + precioPieza(f.marcaElegida!), 0);
  const aviso = AVISO[auto.etapa];

  const linea: { titulo: string; cuando?: string; nota?: string }[] = [
    { titulo: "Auto registrado", cuando: auto.registradoEn },
    { titulo: "Diagnóstico enviado", cuando: diag.enviadoEn, nota: `${fallas.length} ${fallas.length === 1 ? "falla" : "fallas"}` },
    {
      titulo: pagado ? "Pagado con CoDi" : "Recibo pendiente",
      cuando: diag.pago?.pagadoEn,
      nota: pagado ? `Referencia ${diag.pago!.referencia}` : "Cuando pague con CoDi, este auto pasa solo a “Pagado”.",
    },
    { titulo: "En reparación", cuando: diag.reparacionEn, nota: diag.reparacionEn ? undefined : "La inicias tú desde la lista" },
    { titulo: "Listo", cuando: diag.listoEn },
    { titulo: "Entregado", cuando: diag.entregadoEn },
  ];
  const actual = linea.findIndex((l) => !l.cuando); // primera etapa sin hora = la actual

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BarraSuperior derecha={<MenuMecanico />} />
      <FranjaAuto placas={auto.placas} colorCodigo={auto.colorCodigo} folio={auto.folio} etapa={ETAPAS_TALLER[auto.etapa].etiqueta} />

      <main className="mx-auto grid w-full max-w-[1340px] flex-1 grid-cols-[minmax(0,1fr)_520px] items-start gap-6 px-12 py-6">
        {/* Diagnóstico de solo lectura */}
        <section className="rounded-xl border border-borde bg-tarjeta px-6 py-5.5">
          <h1 className="flex items-baseline gap-2.5 font-titulo text-2xl font-semibold">
            Diagnóstico enviado
            <span className="font-mono text-[15px] font-normal text-suave">Folio {auto.folio}</span>
          </h1>
          <p className="mt-1 text-sm text-suave">Enviado a las {hora(diag.enviadoEn)} por Taller Paddock. Ya no se puede editar.</p>

          <p className="mt-4.5 text-[13px] font-semibold">Descripción general de la falla</p>
          <p className="mt-2.5 rounded-[10px] border border-borde bg-fondo px-4 py-3.5 text-[15px] leading-relaxed">{diag.descripcion}</p>

          <p className="mt-4.5 flex items-center gap-1.5 text-[13px] font-semibold">
            Fallas
            <span className="rounded-full border border-borde bg-fondo px-2.5 py-0.5 text-xs text-[#3A4250]">{fallas.length}</span>
          </p>
          <div className="mt-3.5 overflow-hidden rounded-[10px] border border-borde">
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr className="border-b border-borde bg-[#FAFAF9] text-left text-xs text-suave">
                  <th className="px-3.5 py-2.5 font-semibold">Pieza</th>
                  <th className="px-3.5 py-2.5 font-semibold">Ubicación</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold">Mano de obra</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold">{pagado ? "Marca elegida" : "Pieza OEM / GM"}</th>
                </tr>
              </thead>
              <tbody>
                {fallas.map((f) => {
                  const noComprada = pagado && !f.marcaElegida;
                  return (
                    <tr key={f.piezaId} className={`border-b border-[#EFEFED] last:border-b-0 ${noComprada ? "text-suave" : ""}`}>
                      <td className="px-3.5 py-3">
                        <span className="block font-semibold">{f.pieza.nombre}</span>
                        <code className="font-mono text-[11px] text-suave">{f.piezaId}</code>
                      </td>
                      <td className="px-3.5 py-3">
                        {capital(f.pieza.eje)} · {capital(f.pieza.lado)}
                      </td>
                      <td className={`px-3.5 py-3 text-right whitespace-nowrap ${noComprada ? "line-through" : ""}`}>{dinero(f.manoDeObra)}</td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        {!pagado && `${dinero(PRECIO_DEMO.OEM)} / ${dinero(PRECIO_DEMO.GM)}`}
                        {pagado && f.marcaElegida && (
                          <>
                            <span className="mr-1.5 rounded-md border border-borde bg-fondo px-1.5 py-0.5 text-xs font-semibold">{f.marcaElegida}</span>
                            {dinero(precioPieza(f.marcaElegida))}
                          </>
                        )}
                        {noComprada && <span className="text-[13px]">No la compró</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 border-t border-borde pt-3.5 text-[15px]">
            <dt className="text-suave">Mano de obra{pagado ? " (piezas compradas)" : " total"}</dt>
            <dd className="text-right font-semibold">{dinero(totalManoDeObra)}</dd>
            <dt className="text-suave">Piezas</dt>
            <dd className="text-right font-semibold">{pagado ? dinero(totalPiezas) : "Las elige el cliente"}</dd>
            {pagado && (
              <>
                <dt className="mt-1 font-semibold">Total pagado con CoDi</dt>
                <dd className="mt-1 text-right font-titulo text-[22px] font-semibold">{dinero(totalManoDeObra + totalPiezas)}</dd>
              </>
            )}
          </dl>
        </section>

        {/* Estado y línea de tiempo */}
        <section className="rounded-xl border border-borde bg-tarjeta px-6 py-5.5">
          <h2 className="font-titulo text-2xl font-semibold">Estado</h2>
          <div className="mt-3.5 flex items-center gap-3 rounded-[10px] border border-borde bg-fondo px-4 py-3.5">
            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-tinta text-lg text-acento" aria-hidden="true">
              ◷
            </span>
            <div>
              <p className="font-semibold">{aviso.titulo}</p>
              <p className="text-[13px] text-suave">{aviso.texto}</p>
            </div>
          </div>

          <ol className="mt-4.5">
            {linea.map((l, i) => {
              const hecha = i < actual || actual === -1;
              const esActual = i === actual;
              return (
                <li key={l.titulo} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < linea.length - 1 && <span className="absolute top-[18px] bottom-0 left-[7px] w-0.5 bg-borde" aria-hidden="true" />}
                  <span
                    className={`relative mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                      hecha ? "border-[#17A34A] bg-[#17A34A]" : esActual ? "border-acento bg-acento" : "border-borde bg-tarjeta"
                    }`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className={`text-[15px] font-semibold ${hecha || esActual ? "" : "text-suave"}`}>
                      {l.titulo}
                      <span className="sr-only">{hecha ? " (hecho)" : esActual ? " (etapa actual)" : " (pendiente)"}</span>
                    </p>
                    {(l.cuando || l.nota) && (
                      <p className="text-[13px] text-suave">
                        {l.cuando && `Hoy, ${hora(l.cuando)}`}
                        {l.cuando && l.nota && " · "}
                        {(esActual || l.cuando) && l.nota}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <Link
            href="/taller"
            className="mt-5 flex h-12 items-center justify-center rounded-lg border border-borde font-titulo text-[17px] font-semibold hover:border-tinta"
          >
            ← Volver a autos por atender
          </Link>
        </section>
      </main>
    </div>
  );
}
