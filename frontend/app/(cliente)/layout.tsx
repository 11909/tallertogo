// Layout de las pantallas del cliente (Mis autos, diagnóstico, Carrito y Pagos).
// Comparte la barra superior con pestañas y el estado del carrito y los pagos entre pantallas.
import { Suspense } from "react";
import EncabezadoCliente from "@/components/cliente/EncabezadoCliente";
import EstadoCliente from "@/components/cliente/EstadoCliente";

export default function LayoutCliente({ children }: { children: React.ReactNode }) {
  return (
    <EstadoCliente>
      <div className="flex min-h-screen flex-1 flex-col">
        <Suspense fallback={<div className="h-[128px] border-b border-borde bg-tarjeta" />}>
          <EncabezadoCliente />
        </Suspense>
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-12 pt-10 pb-20">{children}</main>
      </div>
    </EstadoCliente>
  );
}
