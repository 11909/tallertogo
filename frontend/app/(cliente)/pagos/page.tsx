// Ruta /pagos: pagos pendientes (QR CoDi) y pagados (tickets). ?orden=ID abre el QR o el ticket de esa orden.
import { Suspense } from "react";
import Pagos from "./Pagos";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-suave">Cargando pagos…</p>}>
      <Pagos />
    </Suspense>
  );
}
