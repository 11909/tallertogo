// Barra superior común: logo a la izquierda y una acción a la derecha.
// Blanca con línea amarilla abajo para separarla del fondo gris de la página.
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function BarraSuperior({ derecha }: { derecha?: ReactNode }) {
  return (
    <header className="flex h-[72px] items-center justify-between border-b border-borde bg-tarjeta px-12 shadow-[inset_0_-3px_0_var(--color-acento)]">
      <Link href="/" aria-label="Paddock, inicio">
        <Image src="/paddock-logo.png" alt="Paddock" width={150} height={45} priority className="h-auto w-[150px]" />
      </Link>
      {derecha}
    </header>
  );
}
