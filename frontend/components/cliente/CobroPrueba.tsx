// Aviso del cobro de prueba del hackatón: las pantallas muestran precios de referencia reales,
// pero por CoDi cada orden cobra $0.01 (orden.monto_cobro_centavos, paso 10 de docs/base-de-datos.md).
// Va junto a cada total que lleve a un pago, para que nadie crea que el banco le cobrará el total.
import { COBRO_PRUEBA_CENTAVOS } from "@/lib/catalogo";
import { dinero } from "@/lib/cliente/formato";

export default function CobroPrueba({
  cobro = COBRO_PRUEBA_CENTAVOS,
  porQR = false,
  pagado = false,
  className = "",
}: {
  cobro?: number; // centavos que se cobran por CoDi
  porQR?: boolean; // texto para varios QR ("cada QR")
  pagado?: boolean; // ya se cobró (ticket o pago confirmado)
  className?: string;
}) {
  const texto = pagado
    ? `Cobro de prueba del hackatón: por CoDi se cobraron ${dinero(cobro)}.`
    : `Cobro de prueba del hackatón: tu banco te cobrará ${dinero(cobro)}${porQR ? " por cada QR" : ""}.`;
  return (
    <p
      className={`flex items-start gap-2 rounded-lg border border-[#F2DE8A] bg-[#FFF8DB] px-3 py-2 text-[13px] leading-[1.45] text-tinta ${className}`}
    >
      <span
        aria-hidden="true"
        className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-acento text-[11px] font-bold"
      >
        !
      </span>
      <span>
        <b>{texto}</b> Los precios que ves son de referencia.
      </span>
    </p>
  );
}
