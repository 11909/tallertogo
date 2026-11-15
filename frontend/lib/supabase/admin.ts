// Cliente de Supabase con la llave secreta (service role). SOLO para el servidor.
// Se salta las políticas RLS: úsalo únicamente en el webhook de pey (registrar_pago)
// y para guardar el QR de la orden. Nunca lo importes en un componente con "use client".
import { createClient } from "@supabase/supabase-js";

export function crearClienteAdmin() {
  if (typeof window !== "undefined") {
    throw new Error("crearClienteAdmin solo puede usarse en el servidor.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Supabase llama "secret" a la llave nueva y "service_role" a la anterior; sirve cualquiera.
  // Nunca le pongas el prefijo NEXT_PUBLIC_: quedaría expuesta en el navegador.
  const llaveSecreta = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !llaveSecreta) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY) en .env.local."
    );
  }

  return createClient(url, llaveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
