// Lado derecho de la barra superior para el mecánico
import Link from "next/link";

export default function MenuMecanico() {
  return (
    <div className="flex items-center gap-3 text-sm text-suave">
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-tinta text-[13px] font-semibold text-acento">
        TM
      </span>
      <span>
        <span className="block font-semibold text-tinta">Taller Paddock</span>
        <span className="text-xs">Mecánico</span>
      </span>
      <Link
        href="/login"
        className="ml-1 rounded-lg border border-borde bg-tarjeta px-3.5 py-2 font-semibold text-tinta hover:border-tinta"
      >
        Salir
      </Link>
    </div>
  );
}
