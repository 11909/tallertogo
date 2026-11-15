// Cliente de Supabase para el navegador (componentes con "use client", como login y registro).
// Usa la llave pública y la sesión del usuario: respeta las políticas RLS.
import { createBrowserClient } from "@supabase/ssr";

export function crearClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Supabase llama "publishable" a la llave pública nueva y "anon" a la anterior; sirve cualquiera.
  const llavePublica =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !llavePublica) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY) en .env.local."
    );
  }

  return createBrowserClient(url, llavePublica);
}
