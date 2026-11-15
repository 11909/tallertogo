// Ruta /carrito/[id]: carrito del cliente para un auto (el id se lee en el navegador, por eso va en <Suspense>)
import { Suspense } from "react";
import Carrito from "./Carrito";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-12 text-sm text-suave">Cargando carrito…</p>}>
      <Carrito />
    </Suspense>
  );
}
