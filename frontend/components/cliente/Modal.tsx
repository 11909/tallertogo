"use client";

// Ventana flotante sobre la pantalla (confirmaciones, QR y ticket). Se cierra con Esc o tocando el fondo.
import { useEffect, type ReactNode } from "react";
import { Icono } from "@/components/cliente/Piezas";

export default function Modal({
  titulo,
  etiqueta,
  onCerrar,
  ancho = 460,
  children,
}: {
  titulo: string;
  etiqueta?: string;
  onCerrar: () => void;
  ancho?: number;
  children: ReactNode;
}) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 cursor-default bg-tinta/40" />
      <section
        className="relative max-h-[calc(100vh-48px)] w-full overflow-y-auto rounded-xl border border-borde bg-tarjeta p-7 shadow-[0_24px_60px_rgba(17,18,20,0.18)]"
        style={{ maxWidth: ancho }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {etiqueta && <p className="text-xs font-semibold tracking-[0.12em] text-suave uppercase">{etiqueta}</p>}
            <h2 className="mt-1 font-titulo text-2xl leading-tight font-semibold">{titulo}</h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mt-1 -mr-1 cursor-pointer rounded-lg p-2 text-suave hover:bg-fondo hover:text-tinta"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
