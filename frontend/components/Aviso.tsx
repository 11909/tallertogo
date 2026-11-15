// Mensaje de confirmación (éxito) o de rechazo (error) para todas las pantallas.
// Los errores llevan ícono y texto claro (CLAUDE.md, sección 11). El éxito usa verde tenue.

export type TipoAviso = "exito" | "error";
export type DatosAviso = { tipo: TipoAviso; texto: string };

export default function Aviso({ tipo, texto, className = "" }: DatosAviso & { className?: string }) {
  const exito = tipo === "exito";
  return (
    <p
      role={exito ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
        exito ? "border-[#BFE3CB] bg-[#E7F5EC] text-[#166534]" : "border-error/40 bg-error/5 text-error"
      } ${className}`}
    >
      <svg viewBox="0 0 20 20" className="mt-px h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        {exito ? (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.86a.75.75 0 0 0-1.06-1.06L9 10.88 7.2 9.08a.75.75 0 1 0-1.06 1.06l2.33 2.33a.75.75 0 0 0 1.06 0l4.33-4.33Z"
            clipRule="evenodd"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4ZM10 14.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        )}
      </svg>
      <span>{texto}</span>
    </p>
  );
}

// Traduce un error inesperado (sin conexión, falta configurar .env.local, etc.) a un mensaje claro.
export function mensajeDeFallo(error: unknown): string {
  const detalle = error instanceof Error ? error.message : String(error);
  console.error("[TallerToGo]", error);
  if (detalle.includes("NEXT_PUBLIC_SUPABASE")) {
    return "Falta configurar la conexión con Supabase en frontend/.env.local. Revisa los nombres de las variables y reinicia npm run dev.";
  }
  if (detalle.toLowerCase().includes("fetch")) {
    return "No se pudo conectar con el servidor. Revisa tu internet e intenta de nuevo.";
  }
  return "Algo salió mal. Intenta de nuevo.";
}
