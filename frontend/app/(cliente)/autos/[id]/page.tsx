// Ruta /autos/[id]: diagnóstico de un auto del cliente (el id se lee en el navegador, por eso va en <Suspense>)
import { Suspense } from "react";
import Diagnostico from "./Diagnostico";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-suave">Cargando diagnóstico…</p>}>
      <Diagnostico />
    </Suspense>
  );
}
