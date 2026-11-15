"use client";

// Pantalla 5: Diagnosticar un auto (mecánico, diseñada para computadora)
// - Una descripción general de la falla por diagnóstico.
// - Cada pieza-posición del catálogo se agrega una sola vez, con su propia mano de obra.
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Aviso, { mensajeDeFallo, type DatosAviso } from "@/components/Aviso";
import BarraSuperior from "@/components/BarraSuperior";
import FranjaAuto from "@/components/FranjaAuto";
import MenuMecanico from "@/components/MenuMecanico";
import { COLORES_Z06_2025 } from "@/lib/colores";
import { normalizar, type AutoTaller } from "@/lib/autosTaller";
import { PRECIO_DEMO, type Eje, type Lado } from "@/lib/catalogo";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

const LADO_CORTO: Record<Lado, string> = { IZQUIERDO: "IZQ", DERECHO: "DER", CENTRAL: "CEN" };
const capital = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();
const dinero = (n: number) => `$${n.toFixed(2)}`;
const dineroCentavos = (centavos: number) =>
  (centavos / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const folioVisible = (folio: number) => `DG-${String(folio).padStart(5, "0")}`;

type Marca = "OEM" | "GM";
type PiezaCatalogo = { id: string; nombre: string; nombreTecnico: string; eje: Eje; lado: Lado };
type Falla = { pieza: PiezaCatalogo; manoDeObra: string };
type FilaPieza = { id_pieza: string; nombre: string; nombre_tecnico: string; eje: Eje; lado: Lado };
type FilaPrecio = { id_pieza: string; id_marca: number; precio_centavos: number };
type FilaMarca = { id_marca: number; nombre: string };
type FallaGuardada = { id_pieza: string; mano_obra_centavos: number };
type DiagnosticoGuardado = { folio: number; estado: string; descripcion: string | null };

export default function Diagnosticar() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [auto, setAuto] = useState<AutoTaller | null>(null);
  const [folioNumero, setFolioNumero] = useState<number | null>(null);
  const [catalogo, setCatalogo] = useState<PiezaCatalogo[]>([]);
  const [precios, setPrecios] = useState<Record<string, Partial<Record<Marca, number>>>>({});
  const [eje, setEje] = useState<Eje>("DELANTERO");
  const [lado, setLado] = useState<Lado | "TODOS">("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fallas, setFallas] = useState<Falla[]>([]);
  const [aviso, setAviso] = useState<DatosAviso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [enviado, setEnviado] = useState(false);

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

        const [carroResult, piezasResult, preciosResult, marcasResult] = await Promise.all([
          supabase.from("carro").select("id_carro, placa, color, fecha_registro").eq("id_carro", idCarro).maybeSingle(),
          supabase.from("pieza").select("id_pieza, nombre, nombre_tecnico, eje, lado").order("id_pieza"),
          supabase.from("precio_pieza").select("id_pieza, id_marca, precio_centavos"),
          supabase.from("marca_refaccion").select("id_marca, nombre"),
        ]);
        if (carroResult.error) throw carroResult.error;
        if (piezasResult.error) throw piezasResult.error;
        if (preciosResult.error) throw preciosResult.error;
        if (marcasResult.error) throw marcasResult.error;
        const carro = carroResult.data;
        if (!carro) throw new Error("No encontramos ese auto en la base de datos.");

        const color = COLORES_Z06_2025.find((item) => item.nombre === carro.color);
        if (!color) throw new Error(`El color del auto ${carro.placa} no coincide con el catálogo.`);

        const marcas = new Map<number, Marca>(
          ((marcasResult.data ?? []) as FilaMarca[])
            .filter((marca): marca is FilaMarca & { nombre: Marca } => marca.nombre === "OEM" || marca.nombre === "GM")
            .map((marca) => [marca.id_marca, marca.nombre])
        );
        const preciosPorPieza: Record<string, Partial<Record<Marca, number>>> = {};
        for (const precio of (preciosResult.data ?? []) as FilaPrecio[]) {
          const marca = marcas.get(precio.id_marca);
          if (marca) (preciosPorPieza[precio.id_pieza] ??= {})[marca] = precio.precio_centavos;
        }

        const piezas = (piezasResult.data ?? []) as FilaPieza[];
        if (piezas.length === 0 || piezas.some((pieza) => !preciosPorPieza[pieza.id_pieza]?.OEM || !preciosPorPieza[pieza.id_pieza]?.GM)) {
          throw new Error("El catálogo o los precios OEM/GM están incompletos en la base de datos.");
        }

        const { data: existente, error: errorDiagnostico } = await supabase
          .from("diagnostico")
          .select("folio, estado, descripcion")
          .eq("id_carro", idCarro)
          .order("fecha_creacion", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (errorDiagnostico) throw errorDiagnostico;
        if (existente && existente.estado !== "borrador") {
          router.replace(`/taller/diagnostico/${idCarro}/ver`);
          return;
        }

        let diagnostico = existente as DiagnosticoGuardado | null;
        if (!diagnostico) {
          const { data, error } = await supabase
            .from("diagnostico")
            .insert({ id_carro: idCarro, id_mecanico: sesion.user.id })
            .select("folio, estado, descripcion")
            .single();
          if (error) throw error;
          diagnostico = data as DiagnosticoGuardado;
        }

        const { data: fallasGuardadas, error: errorFallas } = await supabase
          .from("falla")
          .select("id_pieza, mano_obra_centavos")
          .eq("folio", diagnostico.folio);
        if (errorFallas) throw errorFallas;

        const piezasPorId = new Map(
          piezas.map((pieza) => [
            pieza.id_pieza,
            {
              id: pieza.id_pieza,
              nombre: pieza.nombre,
              nombreTecnico: pieza.nombre_tecnico,
              eje: pieza.eje,
              lado: pieza.lado,
            },
          ])
        );
        const cargadas = ((fallasGuardadas ?? []) as FallaGuardada[]).map((falla) => {
          const pieza = piezasPorId.get(falla.id_pieza);
          if (!pieza) throw new Error(`La pieza ${falla.id_pieza} de este diagnóstico no está en el catálogo.`);
          return { pieza, manoDeObra: (falla.mano_obra_centavos / 100).toFixed(2) };
        });

        if (vigente) {
          setAuto({
            id: String(carro.id_carro),
            placas: carro.placa,
            colorCodigo: color.codigo,
            folio: folioVisible(diagnostico.folio),
            folioNumero: diagnostico.folio,
            etapa: "por_diagnosticar",
            actualizacion: "",
            registradoEn: carro.fecha_registro,
            pagadoEn: null,
          });
          setFolioNumero(diagnostico.folio);
          setCatalogo(piezas.map((pieza) => ({
            id: pieza.id_pieza,
            nombre: pieza.nombre,
            nombreTecnico: pieza.nombre_tecnico,
            eje: pieza.eje,
            lado: pieza.lado,
          })));
          setPrecios(preciosPorPieza);
          setDescripcion(diagnostico.descripcion ?? "");
          setFallas(cargadas);
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

  const piezas = useMemo(() => {
    const q = normalizar(busqueda);
    return catalogo.filter(
      (p) =>
        p.eje === eje &&
        (lado === "TODOS" || p.lado === lado) &&
        (!q || [p.nombre, p.nombreTecnico, p.id].some((t) => normalizar(t).includes(q)))
    );
  }, [catalogo, eje, lado, busqueda]);

  const agregadas = new Set(fallas.map((f) => f.pieza.id));
  const totalManoDeObra = fallas.reduce((s, f) => s + (Math.round(Number(f.manoDeObra) * 100) || 0), 0);

  if (cargando) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <BarraSuperior derecha={<MenuMecanico />} />
        <main className="flex flex-1 flex-col items-center justify-center gap-3 text-suave">
          <p>Cargando el catálogo y el diagnóstico…</p>
        </main>
      </div>
    );
  }

  if (!auto || folioNumero === null) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <BarraSuperior derecha={<MenuMecanico />} />
        <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center justify-center gap-3 px-6 text-suave">
          {aviso && <Aviso {...aviso} />}
          <Link href="/taller" className="font-semibold text-tinta underline underline-offset-4">
            Volver a autos por atender
          </Link>
        </main>
      </div>
    );
  }

  function cambiar() {
    if (!enviado) setAviso(null);
  }

  function agregar(pieza: PiezaCatalogo) {
    if (agregadas.has(pieza.id)) return;
    setFallas((prev) => [...prev, { pieza, manoDeObra: PRECIO_DEMO.manoDeObra.toFixed(2) }]);
    cambiar();
  }

  function quitar(idPieza: string) {
    setFallas((prev) => prev.filter((f) => f.pieza.id !== idPieza));
    cambiar();
  }

  function validar(): string | null {
    if (!descripcion.trim()) return "Escribe la descripción general de la falla.";
    if (fallas.length === 0) return "Agrega al menos una pieza del catálogo.";
    const mala = fallas.find((f) => {
      if (!/^\d+(\.\d{1,2})?$/.test(f.manoDeObra.trim())) return true;
      const centavos = Number(f.manoDeObra) * 100;
      return !Number.isSafeInteger(centavos) || centavos > 2147483647;
    });
    if (mala) return `Revisa la mano de obra de: ${mala.pieza.nombre}.`;
    return null;
  }

  async function persistirBorrador() {
    const supabase = crearClienteNavegador();
    const { data: borradorActualizado, error: errorDescripcion } = await supabase
      .from("diagnostico")
      .update({ descripcion: descripcion.trim() || null })
      .eq("folio", folioNumero)
      .eq("estado", "borrador")
      .select("folio")
      .maybeSingle();
    if (errorDescripcion) throw errorDescripcion;
    if (!borradorActualizado) throw new Error("El diagnóstico ya no está en borrador. Actualiza la pantalla.");

    const { data: existentes, error: errorExistentes } = await supabase
      .from("falla")
      .select("id_falla, id_pieza")
      .eq("folio", folioNumero);
    if (errorExistentes) throw errorExistentes;

    const idsActuales = new Set(fallas.map((falla) => falla.pieza.id));
    const eliminables = (existentes ?? []).filter((falla) => !idsActuales.has(falla.id_pieza)).map((falla) => falla.id_falla);
    const lineas = fallas.map((falla) => ({
      folio: folioNumero,
      id_pieza: falla.pieza.id,
      mano_obra_centavos: Math.round(Number(falla.manoDeObra) * 100),
    }));

    if (lineas.length > 0) {
      const { error } = await supabase.from("falla").upsert(lineas, { onConflict: "folio,id_pieza" });
      if (error) throw error;
    }
    if (eliminables.length > 0) {
      const { error } = await supabase.from("falla").delete().in("id_falla", eliminables);
      if (error) throw error;
    }
  }

  async function guardarBorrador(enviarDiagnostico = false) {
    if (guardando || enviado) return;
    if (enviarDiagnostico) {
      const error = validar();
      if (error) {
        setAviso({ tipo: "error", texto: error });
        return;
      }
    }

    setGuardando(true);
    setAviso(null);
    try {
      await persistirBorrador();
      if (enviarDiagnostico) {
        const supabase = crearClienteNavegador();
        const { data, error } = await supabase
          .from("diagnostico")
          .update({ estado: "enviado" })
          .eq("folio", folioNumero)
          .eq("estado", "borrador")
          .select("folio")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("El diagnóstico ya no está en borrador. Actualiza la pantalla.");
        setEnviado(true);
        setAviso({ tipo: "exito", texto: "Diagnóstico guardado y enviado al cliente." });
      } else {
        setAviso({ tipo: "exito", texto: "Borrador guardado en la base de datos." });
      }
    } catch (error) {
      setAviso({
        tipo: "error",
        texto: `No se pudo ${enviarDiagnostico ? "enviar" : "guardar"} el diagnóstico. ${mensajeDeFallo(error)}`,
      });
    } finally {
      setGuardando(false);
    }
  }

  function enviar() {
    void guardarBorrador(true);
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BarraSuperior derecha={<MenuMecanico />} />
      <FranjaAuto placas={auto.placas} colorCodigo={auto.colorCodigo} folio={auto.folio ?? folioVisible(folioNumero)} etapa="Diagnóstico en borrador" />

      <main className="mx-auto grid w-full max-w-[1340px] flex-1 grid-cols-[minmax(0,1fr)_520px] items-start gap-6 px-12 py-6">
        {/* Catálogo */}
        <section className="rounded-xl border border-borde bg-tarjeta px-6 py-5.5">
          <h1 className="font-titulo text-2xl font-semibold">Catálogo de suspensión</h1>
          <p className="mt-1 text-sm text-suave">Elige la pieza y la posición que falla. Cada una se agrega una sola vez.</p>

          <div className="mt-4 flex items-center gap-2">
            <Segmentos
              etiqueta="Eje"
              opciones={[
                ["DELANTERO", "Delantero"],
                ["TRASERO", "Trasero"],
              ]}
              valor={eje}
              onCambio={(v) => setEje(v as Eje)}
            />
            <Segmentos
              etiqueta="Lado"
              opciones={[
                ["TODOS", "Todos"],
                ["IZQUIERDO", "Izquierdo"],
                ["DERECHO", "Derecho"],
                ["CENTRAL", "Central"],
              ]}
              valor={lado}
              onCambio={(v) => setLado(v as Lado | "TODOS")}
            />
            <label className="relative flex-1">
              <span className="sr-only">Buscar pieza</span>
              <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-suave" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="9" r="6" />
                <path d="m14 14 4 4" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar pieza"
                className="h-[38px] w-full rounded-lg border border-borde bg-tarjeta pr-3 pl-9 text-sm outline-none placeholder:text-suave/70 focus:border-tinta"
              />
            </label>
          </div>

          <ul className="mt-3.5">
            {piezas.map((p) => {
              const ya = agregadas.has(p.id);
              return (
                <li key={p.id} className="flex items-center gap-3.5 border-b border-[#EFEFED] px-1 py-2.5 last:border-b-0">
                  <code className="w-[118px] shrink-0 font-mono text-xs text-suave">{p.id}</code>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{p.nombre}</span>
                    <span className="block truncate text-[13px] text-suave">{p.nombreTecnico}</span>
                  </span>
                  <span className="rounded-md border border-borde bg-fondo px-2 py-0.5 text-xs font-semibold text-[#3A4250]">
                    {LADO_CORTO[p.lado]}
                  </span>
                  <button
                    type="button"
                    onClick={() => agregar(p)}
                    disabled={ya || guardando || enviado}
                    className={`w-[104px] shrink-0 rounded-lg border px-3 py-1.5 text-[13px] font-semibold ${
                      ya
                        ? "cursor-default border-[#CDEBD8] bg-[#E3F4EA] text-[#17663F]"
                        : "cursor-pointer border-borde bg-tarjeta hover:border-tinta"
                    }`}
                  >
                    {ya ? "✓ Agregada" : "+ Agregar"}
                  </button>
                </li>
              );
            })}
            {piezas.length === 0 && (
              <li className="py-10 text-center text-sm text-suave">
                No hay piezas con «{busqueda}» en {eje === "DELANTERO" ? "el eje delantero" : "el eje trasero"}.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    setLado("TODOS");
                  }}
                  className="cursor-pointer font-semibold text-tinta underline underline-offset-4"
                >
                  Limpiar búsqueda
                </button>
              </li>
            )}
          </ul>
        </section>

        {/* Fallas del diagnóstico */}
        <section className="sticky top-4 rounded-xl border border-borde bg-tarjeta px-6 py-5.5">
          <h2 className="flex items-center gap-2 font-titulo text-2xl font-semibold">
            Fallas del diagnóstico
            <span className="rounded-full border border-borde bg-fondo px-2.5 py-0.5 font-sans text-xs text-[#3A4250]">{fallas.length}</span>
          </h2>
          <p className="mt-1 text-sm text-suave">El cliente verá cada falla y elegirá la marca: OEM o GM.</p>

          <label htmlFor="descripcion" className="mt-4 block text-[13px] font-semibold">
            Descripción general de la falla
          </label>
          <textarea
            id="descripcion"
            value={descripcion}
            disabled={guardando || enviado}
            onChange={(e) => {
              setDescripcion(e.target.value);
              cambiar();
            }}
            rows={3}
            placeholder="Qué síntomas tiene el auto y qué encontraste al revisarlo"
            className="mt-1.5 w-full resize-y rounded-lg border border-borde px-3 py-2.5 text-[15px] outline-none placeholder:text-suave/70 focus:border-tinta"
          />
          <p className="mt-1 text-[13px] text-suave">El cliente la verá arriba de la lista de piezas.</p>

          {fallas.length === 0 && (
            <p className="mt-3 rounded-[10px] border border-dashed border-borde px-4 py-6 text-center text-sm text-suave">
              Agrega piezas desde el catálogo de la izquierda.
            </p>
          )}

          {fallas.map((f) => (
            <div key={f.pieza.id} className="mt-3 rounded-[10px] border border-borde px-4 py-3.5">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <p className="font-semibold">{f.pieza.nombre}</p>
                  <p className="text-[13px] text-suave">
                    {capital(f.pieza.eje)} · {capital(f.pieza.lado)} · <code className="font-mono text-[11px]">{f.pieza.id}</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitar(f.pieza.id)}
                  disabled={guardando || enviado}
                  className="cursor-pointer text-[13px] font-semibold text-suave hover:text-tinta"
                >
                  Quitar
                </button>
              </div>
              <div className="mt-2.5 flex items-end gap-3">
                <div>
                  <label htmlFor={`mo-${f.pieza.id}`} className="block text-[13px] font-semibold">
                    Mano de obra
                  </label>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-suave">$</span>
                    <input
                      id={`mo-${f.pieza.id}`}
                      inputMode="decimal"
                      value={f.manoDeObra}
                      disabled={guardando || enviado}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setFallas((prev) => prev.map((x) => (x.pieza.id === f.pieza.id ? { ...x, manoDeObra: valor } : x)));
                        cambiar();
                      }}
                      className="h-[42px] w-[150px] rounded-lg border border-borde pr-3 pl-7 text-[15px] outline-none focus:border-tinta"
                    />
                  </div>
                </div>
                <p className="pb-2.5 text-[13px] text-suave">
                  Pieza: OEM {dineroCentavos(precios[f.pieza.id]?.OEM ?? 0)} · GM {dineroCentavos(precios[f.pieza.id]?.GM ?? 0)}
                </p>
              </div>
            </div>
          ))}

          <div className="mt-4.5 flex items-baseline justify-between border-t border-borde pt-3.5">
            <span className="text-sm text-suave">Mano de obra total</span>
            <span className="font-titulo text-[22px] font-semibold">{dinero(totalManoDeObra / 100)}</span>
          </div>
          <p className="mt-1 text-[13px] text-suave">Las piezas las elige el cliente; el total final se calcula al pagar.</p>

          {aviso && <Aviso {...aviso} className="mt-3" />}

          <div className="mt-4 grid grid-cols-[1fr_1.4fr] gap-2.5">
            <button
              type="button"
              onClick={() => void guardarBorrador()}
              disabled={guardando || enviado}
              className="h-12 cursor-pointer rounded-lg border border-borde font-titulo text-[17px] font-semibold hover:border-tinta"
            >
              {guardando ? "Guardando…" : "Guardar borrador"}
            </button>
            {/* Único botón de acento de la pantalla */}
            <button
              type="button"
              onClick={enviar}
              disabled={guardando || enviado}
              className="h-12 cursor-pointer rounded-lg bg-acento font-titulo text-[17px] font-semibold text-tinta transition hover:brightness-95 active:scale-[0.99]"
            >
              {enviado ? "Enviado" : guardando ? "Enviando…" : "Enviar diagnóstico"}
            </button>
          </div>
          {enviado && (
            <Link
              href={`/taller/diagnostico/${auto.id}/ver`}
              className="mt-3 block text-center text-sm font-semibold text-tinta underline underline-offset-4"
            >
              Ver diagnóstico enviado
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}

function Segmentos({
  etiqueta,
  opciones,
  valor,
  onCambio,
}: {
  etiqueta: string;
  opciones: [string, string][];
  valor: string;
  onCambio: (v: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex overflow-hidden rounded-lg border border-borde">
      {opciones.map(([clave, texto]) => (
        <button
          key={clave}
          type="button"
          role="radio"
          aria-checked={valor === clave}
          onClick={() => onCambio(clave)}
          className={`cursor-pointer border-r border-borde px-3.5 py-2 text-[13px] font-semibold last:border-r-0 ${
            valor === clave ? "bg-tinta text-acento" : "text-suave hover:text-tinta"
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}
