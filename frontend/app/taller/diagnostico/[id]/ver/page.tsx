// Ruta /taller/diagnostico/[id]/ver (el id se lee en el navegador, por eso va en <Suspense>)
import { Suspense } from "react";
import VerDiagnostico from "./VerDiagnostico";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-12 text-sm text-suave">Cargando diagnóstico…</p>}>
      <VerDiagnostico />
    </Suspense>
  );
}
