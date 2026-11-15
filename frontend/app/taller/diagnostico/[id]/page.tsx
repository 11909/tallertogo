// Ruta /taller/diagnostico/[id]: el id del auto se lee en el navegador,
// por eso la pantalla va dentro de <Suspense> (requisito de Next.js 16).
import { Suspense } from "react";
import Diagnosticar from "./Diagnosticar";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-12 text-sm text-suave">Cargando diagnóstico…</p>}>
      <Diagnosticar />
    </Suspense>
  );
}
