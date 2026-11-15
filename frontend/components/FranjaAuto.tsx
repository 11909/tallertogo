// Franja con los datos del auto que se está atendiendo (pantallas del mecánico)
import Image from "next/image";
import Link from "next/link";
import { Muestra } from "@/components/SeguimientoEnVivo";
import { buscarColor } from "@/lib/colores";

export default function FranjaAuto({ placas, colorCodigo, folio, etapa }: { placas: string; colorCodigo: string; folio: string; etapa: string }) {
  const color = buscarColor(colorCodigo);
  return (
    <section className="border-b border-borde bg-tarjeta">
      <div className="mx-auto flex max-w-[1340px] items-center gap-5 px-12 py-3.5">
        <Link
          href="/taller"
          className="rounded-lg border border-borde px-3 py-2 text-sm font-semibold whitespace-nowrap text-suave hover:border-tinta hover:text-tinta"
        >
          ← Autos por atender
        </Link>
        <span className="flex h-[52px] w-24 items-center justify-center rounded-lg bg-[#E9E9E6] p-1">
          <Image src="/corvette-z06.png" alt="" width={88} height={37} className="h-auto w-[88px]" />
        </span>
        <Dato titulo="Auto">{placas} · Corvette Z06 2025</Dato>
        <Separador />
        <Dato titulo="Color">
          <span className="flex items-center gap-1.5">
            <Muestra hex={color?.hex} tamano={11} />
            {color?.nombre}
          </span>
        </Dato>
        <Separador />
        <Dato titulo="Folio">
          <span className="font-mono text-[15px]">{folio}</span>
        </Dato>
        <Separador />
        <div>
          <p className="text-xs text-suave">Etapa</p>
          <span className="inline-block rounded-full border border-borde bg-fondo px-2.5 py-0.5 text-xs font-semibold text-[#3A4250]">
            {etapa}
          </span>
        </div>
      </div>
    </section>
  );
}

function Separador() {
  return <span className="h-9 w-px bg-borde" aria-hidden="true" />;
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-suave">{titulo}</p>
      <div className="text-base font-semibold">{children}</div>
    </div>
  );
}
