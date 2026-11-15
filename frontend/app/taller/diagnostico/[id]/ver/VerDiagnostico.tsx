"use client";

// Ver diagnóstico (mecánico, diseñada para computadora)
// Diagnóstico ya enviado, de solo lectura, con su línea de tiempo.
// La misma pantalla sirve para todas las etapas: cuando el cliente ya pagó, muestra la marca
// que eligió en cada pieza y el total pagado con CoDi.
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Aviso, { mensajeDeFallo, type DatosAviso } from "@/components/Aviso";
import BarraSuperior from "@/components/BarraSuperior";
import FranjaAuto from "@/components/FranjaAuto";
import MenuMecanico from "@/components/MenuMecanico";
import { COLORES_Z06_2025 } from "@/lib/colores";
import { ETAPAS_TALLER, type EtapaTaller } from "@/lib/autosTaller";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

const capital = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();
const dineroCentavos = (centavos: number) =>
  (centavos / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const fechaHora = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Mexico_City",
  }).format(new Date(iso));

type EstadoDiagnostico = "enviado" | "pagado" | "en_reparacion" | "listo" | "entregado";
type PiezaFila = { id_pieza: string; nombre: string; eje: "DELANTERO" | "TRASERO"; lado: "IZQUIERDO" | "DERECHO" | "CENTRAL" };
type FallaFila = { id_falla: number; id_pieza: string; mano_obra_centavos: number; pieza: PiezaFila | PiezaFila[] | null };
type OrdenFila = {
  id_orden: number;
  estado: string;
  fecha_pago: string | null;
  monto_centavos: number;
  orden_detalle: { id_falla: number; id_marca: number }[] | null;
};
type AutoInfo = { id: string; placas: string; colorCodigo: string; color: string; registradoEn: string };
type DiagnosticoInfo = {
  folio: number;
  estado: EstadoDiagnostico;
  descripcion: string;
  fecha_envio: string | null;
  fecha_reparacion: string | null;
  fecha_listo: string | null;
  fecha_entrega: string | null;
  mecanico: string;
};
type FallaInfo = {
  id: number;
  piezaId: string;
  pieza: PiezaFila;
  manoDeObraCentavos: number;
  marcaElegida?: "OEM" | "GM";
  precioCentavos?: number;
  precioOEMCentavos?: number;
  precioGMCentavos?: number;
};

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
  const router = useRouter();
  const [auto, setAuto] = useState<AutoInfo | null>(null);
  const [diag, setDiag] = useState<DiagnosticoInfo | null>(null);
  const [fallas, setFallas] = useState<FallaInfo[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<DatosAviso | null>(null);
  const [sinDiagnostico, setSinDiagnostico] = useState(false);

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      try {
        const idCarro = Number(id);
        if (!Number.isSafeInteger(idCarro) || idCarro <= 0) throw new Error("El identificador del auto no es válido.");
        const supabase = crearClienteNavegador();
        const { data: sesion, error: errorSesion } = await supabase.auth.getUser();
        if (errorSesion) throw errorSesion;
        if (!sesion.user) {
          router.replace("/login");
          return;
        }

        const { data: perfil, error: errorPerfil } = await supabase
          .from("perfil")
          .select("rol")
          .eq("id_perfil", sesion.user.id)
          .maybeSingle();
        if (errorPerfil) throw errorPerfil;
        if (perfil?.rol !== "mecanico") {
          router.replace(perfil?.rol === "cliente" ? "/autos" : "/login");
          return;
        }

        const { data: carro, error: errorCarro } = await supabase
          .from("carro")
          .select("id_carro, placa, color, fecha_registro")
          .eq("id_carro", idCarro)
          .maybeSingle();
        if (errorCarro) throw errorCarro;
        if (!carro) {
          if (vigente) setSinDiagnostico(false);
          return;
        }

        const diagnosticoResult = await supabase
          .from("diagnostico")
          .select("folio, estado, descripcion, fecha_envio, fecha_reparacion, fecha_listo, fecha_entrega, id_mecanico")
          .eq("id_carro", idCarro)
          .order("fecha_creacion", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (diagnosticoResult.error) throw diagnosticoResult.error;
        const diagnostico = diagnosticoResult.data;
        if (!diagnostico || diagnostico.estado === "borrador") {
          if (vigente) setSinDiagnostico(true);
          return;
        }

        if (!["enviado", "pagado", "en_reparacion", "listo", "entregado"].includes(diagnostico.estado)) {
          throw new Error("El diagnóstico tiene un estado no reconocido.");
        }

        const [mecanicoResult, fallasResult, ordenesResult] = await Promise.all([
          supabase.from("perfil").select("nombre, apellido_paterno").eq("id_perfil", diagnostico.id_mecanico).maybeSingle(),
          supabase
            .from("falla")
            .select("id_falla, id_pieza, mano_obra_centavos, pieza ( id_pieza, nombre, eje, lado )")
            .eq("folio", diagnostico.folio)
            .order("id_falla"),
          supabase
            .from("orden")
            .select("id_orden, estado, fecha_pago, monto_centavos, orden_detalle ( id_falla, id_marca )")
            .eq("folio", diagnostico.folio)
            .eq("estado", "pagado")
            .order("fecha_pago", { ascending: true }),
        ]);
        if (mecanicoResult.error) throw mecanicoResult.error;
        if (fallasResult.error) throw fallasResult.error;
        if (ordenesResult.error) throw ordenesResult.error;
        if (!mecanicoResult.data) throw new Error("No se encontró el perfil del mecánico que envió este diagnóstico.");

        const fallasDB = (fallasResult.data ?? []) as FallaFila[];
        const ordenesDB = (ordenesResult.data ?? []) as OrdenFila[];
        const idsPieza = [...new Set(fallasDB.map((falla) => falla.id_pieza))];
        const [preciosResult, marcasResult] = await Promise.all([
          idsPieza.length
            ? supabase.from("precio_pieza").select("id_pieza, id_marca, precio_centavos").in("id_pieza", idsPieza)
            : Promise.resolve({ data: [], error: null }),
          supabase.from("marca_refaccion").select("id_marca, nombre"),
        ]);
        if (preciosResult.error) throw preciosResult.error;
        if (marcasResult.error) throw marcasResult.error;

        const precios = new Map(
          ((preciosResult.data ?? []) as { id_pieza: string; id_marca: number; precio_centavos: number }[])
            .map((precio) => [`${precio.id_pieza}:${precio.id_marca}`, precio.precio_centavos])
        );
        const marcas = new Map(
          ((marcasResult.data ?? []) as { id_marca: number; nombre: string }[]).map((marca) => [marca.id_marca, marca.nombre])
        );
        const idOEM = [...marcas].find(([, nombre]) => nombre === "OEM")?.[0];
        const idGM = [...marcas].find(([, nombre]) => nombre === "GM")?.[0];
        if (fallasDB.length > 0 && (idOEM === undefined || idGM === undefined)) {
          throw new Error("No se encontraron las marcas OEM y GM en la base de datos.");
        }
        const marcaPorFalla = new Map<number, { marca: "OEM" | "GM"; precioCentavos: number }>();
        for (const orden of ordenesDB) {
          for (const detalle of orden.orden_detalle ?? []) {
            const falla = fallasDB.find((item) => item.id_falla === detalle.id_falla);
            const nombreMarca = marcas.get(detalle.id_marca);
            const precio = falla && precios.get(`${falla.id_pieza}:${detalle.id_marca}`);
            if (!falla || (nombreMarca !== "OEM" && nombreMarca !== "GM") || precio === undefined) {
              throw new Error("No se pudo encontrar el precio o la marca de una pieza pagada.");
            }
            marcaPorFalla.set(falla.id_falla, { marca: nombreMarca, precioCentavos: precio });
          }
        }

        const color = COLORES_Z06_2025.find((item) => item.nombre === carro.color);
        if (!color) throw new Error(`El color del auto ${carro.placa} no coincide con el catálogo.`);
        const nombreMecanico = `${mecanicoResult.data.nombre} ${mecanicoResult.data.apellido_paterno}`;
        const fallasCargadas = fallasDB.map((falla) => {
          const pieza = Array.isArray(falla.pieza) ? falla.pieza[0] : falla.pieza;
          if (!pieza) throw new Error(`No se encontró la pieza ${falla.id_pieza} del diagnóstico.`);
          const compra = marcaPorFalla.get(falla.id_falla);
          const precioOEMCentavos = idOEM === undefined ? undefined : precios.get(`${falla.id_pieza}:${idOEM}`);
          const precioGMCentavos = idGM === undefined ? undefined : precios.get(`${falla.id_pieza}:${idGM}`);
          if (precioOEMCentavos === undefined || precioGMCentavos === undefined) {
            throw new Error(`Faltan precios OEM o GM para la pieza ${falla.id_pieza}.`);
          }
          return {
            id: falla.id_falla,
            piezaId: falla.id_pieza,
            pieza,
            manoDeObraCentavos: falla.mano_obra_centavos,
            marcaElegida: compra?.marca,
            precioCentavos: compra?.precioCentavos,
            precioOEMCentavos,
            precioGMCentavos,
          };
        });

        if (vigente) {
          setAuto({
            id: String(carro.id_carro),
            placas: carro.placa,
            colorCodigo: color.codigo,
            color: carro.color,
            registradoEn: carro.fecha_registro,
          });
          setDiag({
            folio: diagnostico.folio,
            estado: diagnostico.estado as EstadoDiagnostico,
            descripcion: diagnostico.descripcion ?? "",
            fecha_envio: diagnostico.fecha_envio,
            fecha_reparacion: diagnostico.fecha_reparacion,
            fecha_listo: diagnostico.fecha_listo,
            fecha_entrega: diagnostico.fecha_entrega,
            mecanico: nombreMecanico,
          });
          setFallas(fallasCargadas);
          setOrdenes(ordenesDB);
        }
      } catch (error) {
        if (vigente) setAviso({ tipo: "error", texto: `No se pudo cargar el diagnóstico. ${mensajeDeFallo(error)}` });
      } finally {
        if (vigente) setCargando(false);
      }
    }

    void cargar();
    return () => {
      vigente = false;
    };
  }, [id, router]);

  if (cargando) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <BarraSuperior derecha={<MenuMecanico />} />
        <main className="flex flex-1 items-center justify-center text-sm text-suave">Cargando diagnóstico de la base de datos…</main>
      </div>
    );
  }

  if (!auto || !diag) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <BarraSuperior derecha={<MenuMecanico />} />
        <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center justify-center gap-3 px-6 text-suave">
          {aviso ? <Aviso {...aviso} /> : <p>{sinDiagnostico ? "Este auto todavía no tiene diagnóstico enviado." : "No encontramos ese auto."}</p>}
          <div className="flex gap-3">
            {sinDiagnostico && (
              <Link
                href={`/taller/diagnostico/${id}`}
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

  const pagado = diag.estado !== "enviado";
  const compradas = fallas.filter((f) => f.marcaElegida);
  const totalManoDeObra = (pagado ? compradas : fallas).reduce((s, f) => s + f.manoDeObraCentavos, 0);
  const totalPiezas = compradas.reduce((s, f) => s + (f.precioCentavos ?? 0), 0);
  const totalPagado = ordenes.reduce((s, orden) => s + orden.monto_centavos, 0);
  const primerPago = ordenes.find((orden) => orden.fecha_pago);
  const etapa: EtapaTaller = diag.estado === "enviado" ? "esperando_pago" : diag.estado;
  const estadoAviso = AVISO[etapa];

  const linea: { titulo: string; cuando?: string; nota?: string }[] = [
    { titulo: "Auto registrado", cuando: auto.registradoEn },
    { titulo: "Diagnóstico enviado", cuando: diag.fecha_envio ?? undefined, nota: `${fallas.length} ${fallas.length === 1 ? "falla" : "fallas"}` },
    {
      titulo: pagado ? "Pagado con CoDi" : "Recibo pendiente",
      cuando: primerPago?.fecha_pago ?? undefined,
      nota: pagado && primerPago ? `Referencia ${String(primerPago.id_orden).padStart(7, "0")}` : "Cuando pague con CoDi, este auto pasa solo a “Pagado”.",
    },
    { titulo: "En reparación", cuando: diag.fecha_reparacion ?? undefined, nota: diag.fecha_reparacion ? undefined : "La inicias tú desde la lista" },
    { titulo: "Listo", cuando: diag.fecha_listo ?? undefined },
    { titulo: "Entregado", cuando: diag.fecha_entrega ?? undefined },
  ];
  const actual = linea.findIndex((l) => !l.cuando); // primera etapa sin hora = la actual

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BarraSuperior derecha={<MenuMecanico />} />
      <FranjaAuto
        placas={auto.placas}
        colorCodigo={auto.colorCodigo}
        folio={`DG-${String(diag.folio).padStart(5, "0")}`}
        etapa={ETAPAS_TALLER[etapa].etiqueta}
      />

      <main className="mx-auto grid w-full max-w-[1340px] flex-1 grid-cols-[minmax(0,1fr)_520px] items-start gap-6 px-12 py-6">
        {/* Diagnóstico de solo lectura */}
        <section className="rounded-xl border border-borde bg-tarjeta px-6 py-5.5">
          <h1 className="flex items-baseline gap-2.5 font-titulo text-2xl font-semibold">
            Diagnóstico enviado
            <span className="font-mono text-[15px] font-normal text-suave">Folio DG-{String(diag.folio).padStart(5, "0")}</span>
          </h1>
          <p className="mt-1 text-sm text-suave">Enviado el {diag.fecha_envio ? fechaHora(diag.fecha_envio) : "sin fecha"} por {diag.mecanico}. Ya no se puede editar.</p>

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
                    <tr key={f.id} className={`border-b border-[#EFEFED] last:border-b-0 ${noComprada ? "text-suave" : ""}`}>
                      <td className="px-3.5 py-3">
                        <span className="block font-semibold">{f.pieza.nombre}</span>
                        <code className="font-mono text-[11px] text-suave">{f.piezaId}</code>
                      </td>
                      <td className="px-3.5 py-3">
                        {capital(f.pieza.eje)} · {capital(f.pieza.lado)}
                      </td>
                      <td className={`px-3.5 py-3 text-right whitespace-nowrap ${noComprada ? "line-through" : ""}`}>{dineroCentavos(f.manoDeObraCentavos)}</td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        {!pagado && `${dineroCentavos(f.precioOEMCentavos ?? 0)} / ${dineroCentavos(f.precioGMCentavos ?? 0)}`}
                        {pagado && f.marcaElegida && (
                          <>
                            <span className="mr-1.5 rounded-md border border-borde bg-fondo px-1.5 py-0.5 text-xs font-semibold">{f.marcaElegida}</span>
                            {dineroCentavos(f.precioCentavos ?? 0)}
                          </>
                        )}
                        {noComprada && <span className="text-[13px]">{etapa === "pagado" ? "Aún no comprada" : "No la compró"}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 border-t border-borde pt-3.5 text-[15px]">
            <dt className="text-suave">Mano de obra{pagado ? " (piezas compradas)" : " total"}</dt>
            <dd className="text-right font-semibold">{dineroCentavos(totalManoDeObra)}</dd>
            <dt className="text-suave">Piezas</dt>
            <dd className="text-right font-semibold">{pagado ? dineroCentavos(totalPiezas) : "Las elige el cliente"}</dd>
            {pagado && (
              <>
                <dt className="mt-1 font-semibold">Total pagado con CoDi</dt>
                <dd className="mt-1 text-right font-titulo text-[22px] font-semibold">{dineroCentavos(totalPagado)}</dd>
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
              <p className="font-semibold">{estadoAviso.titulo}</p>
              <p className="text-[13px] text-suave">{estadoAviso.texto}</p>
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
                        {l.cuando && fechaHora(l.cuando)}
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
