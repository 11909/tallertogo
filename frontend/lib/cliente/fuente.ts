// Elige de dónde leen las pantallas del cliente:
//   NEXT_PUBLIC_DATOS_CLIENTE=supabase → la base real (requiere el paso 9 de docs/base-de-datos.md)
//   cualquier otro valor o vacío       → la demo en memoria (lib/clienteDemo.ts)
import { fuenteDemo } from "@/lib/clienteDemo";
import { fuenteSupabase } from "@/lib/cliente/fuenteSupabase";
import type { FuenteCliente } from "@/lib/cliente/tipos";

export const fuenteCliente: FuenteCliente =
  process.env.NEXT_PUBLIC_DATOS_CLIENTE === "supabase" ? fuenteSupabase : fuenteDemo;
