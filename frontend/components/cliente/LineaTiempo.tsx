// Seguimiento en vivo de un auto: línea de tiempo horizontal con el estado del diagnóstico.
// (Antes vivía arriba de /inicio; ahora se ve dentro del diagnóstico de cada auto.)
import { PASOS, fechaHora, type EtapaCliente } from "@/lib/clienteDemo";

export default function LineaTiempo({
  etapa,
  fechas = {},
}: {
  etapa: EtapaCliente;
  fechas?: Partial<Record<EtapaCliente, string | undefined>>;
}) {
  const actual = PASOS.findIndex((p) => p.clave === etapa);
  return (
    <ol className="grid grid-cols-6 gap-2">
      {PASOS.map((paso, i) => {
        const hecho = i < actual;
        const esActual = i === actual;
        const cuando = fechas[paso.clave];
        return (
          <li key={paso.clave} className="relative" aria-current={esActual ? "step" : undefined}>
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-4 right-[calc(50%+22px)] left-[calc(-50%+22px)] h-0.5 ${
                  i <= actual ? "bg-acento" : "bg-borde"
                }`}
              />
            )}
            <div className="flex flex-col items-center text-center">
              <span
                className={`relative flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] text-sm font-semibold ${
                  hecho || esActual ? "border-acento bg-acento text-tinta" : "border-borde bg-tarjeta text-suave"
                } ${esActual ? "shadow-[0_0_0_5px_#FDF3CC]" : ""}`}
              >
                {hecho ? "✓" : i + 1}
              </span>
              <p className={`mt-2.5 text-[15px] font-semibold ${esActual || hecho ? "text-tinta" : "text-suave"}`}>
                {paso.titulo}
              </p>
              <p className="mt-0.5 text-[13px] text-suave">
                {cuando && (hecho || esActual) ? fechaHora(cuando) : esActual ? paso.texto : " "}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
