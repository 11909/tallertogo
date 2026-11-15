// Ruta anterior /carrito/[id] (un carrito por auto). Ahora el carrito es uno solo, agrupado por auto: /carrito.
// Carrito.tsx de esta carpeta ya no se usa; se puede borrar junto con esta carpeta.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/carrito");
}
