// Franja de seguimiento en vivo, debajo de la barra superior.
// Cada auto tiene su propio seguimiento: las pastillas eligen de qué auto se muestra el avance.
// Por ahora el estado viene de la pantalla; después se leerá de Supabase Realtime.

export type Etapa = "registro" | "diagnostico" | "recibo";

const ETAPAS: { clave: Etapa; titulo: string; texto: string }[] = [
  { clave: "registro", titulo: "Registro", texto: "Registra tu auto" },
  { clave: "diagnostico", titulo: "Diagnóstico", texto: "El mecánico revisa la suspensión" },
  { clave: "recibo", titulo: "Recibo pendiente", texto: "Eliges piezas y pagas con CoDi" },
];

export type AutoSeguimiento = { id: string; etiqueta: string; hex?: string; etapa: Etapa };

export default function SeguimientoEnVivo({
  autos,
  seleccionado,
  onSeleccionar,
}: {
  autos: AutoSeguimiento[];
  seleccionado: string;
  onSeleccionar: (id: string) => void;
}) {
  const auto = autos.find((a) => a.id === seleccionado) ?? autos[0];
  const indiceActual = ETAPAS.findIndex((e) => e.clave === auto?.etapa);

  return (
    <section className="border-b border-borde bg-tarjeta" aria-label="Seguimiento en vivo">
      <div className="mx-auto flex max-w-[1240px] items-center gap-10 px-12 py-3">
        <div className="flex shrink-0 flex-col gap-2">
          <p className="flex items-center gap-2 text-[13px] text-suave">
            <span className="h-2 w-2 rounded-full bg-[#17A34A] shadow-[0_0_0_4px_#DCF3E4]" aria-hidden="true" />
            Seguimiento en vivo
          </p>
          {autos.length > 1 && (
            <div className="flex max-w-[460px] flex-wrap gap-1.5" role="tablist" aria-label="Elige un auto">
              {autos.map((a) => {
                const activo = a.id === auto?.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => onSeleccionar(a.id)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      activo ? "border-tinta bg-tinta text-acento" : "border-borde text-suave hover:text-tinta"
                    }`}
                  >
                    <Muestra hex={a.hex} />
                    {a.etiqueta}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <ol className="flex flex-1 items-center gap-4">
          {ETAPAS.map((etapa, i) => {
            const actual = i === indiceActual;
            const hecha = i < indiceActual;
            return (
              <li key={etapa.clave} className="contents">
                {i > 0 && <span className="h-0.5 flex-1 bg-borde" aria-hidden="true" />}
                <div className="flex items-center gap-3" aria-current={actual ? "step" : undefined}>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] text-sm ${
                      actual || hecha ? "border-acento bg-acento font-semibold text-tinta" : "border-borde text-suave"
                    }`}
                  >
                    {hecha ? "✓" : i + 1}
                  </span>
                  <div>
                    <p className={`text-[15px] font-semibold ${actual ? "text-tinta" : "text-suave"}`}>{etapa.titulo}</p>
                    <p className={`text-[13px] ${actual ? "text-suave" : "text-suave/70"}`}>{etapa.texto}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function Muestra({ hex, tamano = 10 }: { hex?: string; tamano?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full border border-[#D0D0CC]"
      style={{ width: tamano, height: tamano, background: hex ?? "transparent" }}
    />
  );
}
