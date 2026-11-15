// Cliente de Supabase para el servidor que actúa como el usuario con sesión iniciada
// (componentes de servidor, server actions y rutas app/api, por ejemplo para llamar crear_orden).
// Lee la sesión desde las cookies y respeta las políticas RLS.
// Hay que crear uno nuevo en cada petición; no se reutiliza entre peticiones.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function crearClienteServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llavePublica =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !llavePublica) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY) en .env.local."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, llavePublica, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Un componente de servidor no puede escribir cookies. Se ignora: la sesión
          // se refresca en server actions, rutas app/api o en el archivo de sesión de Next.js.
        }
      },
    },
  });
}
