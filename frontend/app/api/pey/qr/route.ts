import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

type OrdenQr = {
  id_orden: number;
  monto_centavos: number;
  estado: string;
  codi_qr_id: string | null;
  qr_string: string | null;
  expira_en: string;
  folio: number;
};

function respuesta(error: string, status: number) {
  return Response.json({ error }, { status });
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuesta("La solicitud no contiene JSON válido.", 400);
  }

  const idOrden = esObjeto(cuerpo) ? cuerpo.idOrden : null;
  if (!Number.isSafeInteger(idOrden) || Number(idOrden) < 1 || Number(idOrden) > 9_999_999) {
    return respuesta("El número de orden no es válido.", 400);
  }

  const supabase = await crearClienteServidor();
  const {
    data: { user },
    error: errorSesion,
  } = await supabase.auth.getUser();
  if (errorSesion || !user) return respuesta("Inicia sesión para generar el QR.", 401);

  const { data: perfil, error: errorPerfil } = await supabase
    .from("perfil")
    .select("rol")
    .eq("id_perfil", user.id)
    .maybeSingle();
  if (errorPerfil) {
    console.error("[pey] No se pudo validar el perfil:", errorPerfil);
    return respuesta("No se pudo validar tu cuenta.", 500);
  }
  if (perfil?.rol !== "cliente") return respuesta("Solo un cliente puede generar un QR de pago.", 403);

  const { data: orden, error: errorOrden } = await supabase
    .from("orden")
    .select("id_orden, monto_centavos, estado, codi_qr_id, qr_string, expira_en, folio")
    .eq("id_orden", Number(idOrden))
    .maybeSingle();
  if (errorOrden) {
    console.error("[pey] No se pudo consultar la orden:", errorOrden);
    return respuesta("No se pudo consultar la orden.", 500);
  }
  if (!orden) return respuesta("No se encontró la orden.", 404);

  const fila = orden as OrdenQr;
  if (fila.codi_qr_id && fila.qr_string) {
    return Response.json({ idOrden: fila.id_orden, expiraEn: fila.expira_en });
  }
  if (fila.codi_qr_id?.startsWith("SOLICITANDO:")) {
    return respuesta("Ya hay una solicitud de QR en curso. No intentes pagar ni generes otra orden todavía.", 409);
  }
  if (fila.codi_qr_id || fila.qr_string) {
    return respuesta("La orden tiene datos de QR incompletos; contacta al taller antes de pagar.", 409);
  }
  if (fila.estado !== "pendiente" || new Date(fila.expira_en).getTime() <= Date.now()) {
    return respuesta("La orden ya no está vigente. Genera un QR nuevo desde Pagos.", 409);
  }
  if (!Number.isSafeInteger(fila.monto_centavos) || fila.monto_centavos <= 0) {
    return respuesta("El importe de la orden no es válido.", 409);
  }
  if (!process.env.PEY_API_KEY) return respuesta("Falta configurar PEY_API_KEY en el servidor.", 503);
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return respuesta("Falta configurar la llave secreta de Supabase en el servidor.", 503);
  }

  const admin = crearClienteAdmin();
  const reserva = `SOLICITANDO:${crypto.randomUUID()}`;
  const { data: ordenReservada, error: errorReserva } = await admin
    .from("orden")
    .update({ codi_qr_id: reserva })
    .eq("id_orden", fila.id_orden)
    .eq("estado", "pendiente")
    .gt("expira_en", new Date().toISOString())
    .is("codi_qr_id", null)
    .is("qr_string", null)
    .select("id_orden")
    .maybeSingle();
  if (errorReserva) {
    console.error("[pey] No se pudo reservar la generación del QR:", errorReserva);
    return respuesta("No se pudo iniciar la generación del QR.", 500);
  }
  if (!ordenReservada) {
    const { data: actual, error: errorActual } = await admin
      .from("orden")
      .select("codi_qr_id, qr_string")
      .eq("id_orden", fila.id_orden)
      .maybeSingle();
    if (errorActual) {
      console.error("[pey] No se pudo comprobar el estado de la orden:", errorActual);
      return respuesta("No se pudo comprobar el estado de la orden.", 500);
    }
    if (actual?.codi_qr_id && actual.qr_string) {
      return Response.json({ idOrden: fila.id_orden, expiraEn: fila.expira_en });
    }
    if (actual?.codi_qr_id?.startsWith("SOLICITANDO:")) {
      return respuesta("Ya hay una solicitud de QR en curso. Espera un momento y vuelve a consultar Pagos.", 409);
    }
    return respuesta("La orden dejó de estar vigente o ya tiene un QR asociado.", 409);
  }

  const liberarReserva = async () => {
    const { error } = await admin
      .from("orden")
      .update({ codi_qr_id: null })
      .eq("id_orden", fila.id_orden)
      .eq("codi_qr_id", reserva)
      .is("qr_string", null);
    if (error) console.error("[pey] No se pudo liberar la solicitud fallida:", error);
  };

  let respuestaPey: Response;
  try {
    respuestaPey = await fetch("https://api.pey.mx/codi/qr", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PEY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: fila.monto_centavos / 100,
        concept: `TallerToGo DG-${String(fila.folio).padStart(5, "0")}`,
        expiration: 600,
        numRef: String(fila.id_orden),
        generateImage: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("[pey] Falló la solicitud de QR:", error);
    await liberarReserva();
    return respuesta("No se pudo conectar con pey para generar el QR.", 502);
  }

  if (respuestaPey.status !== 201) {
    console.error(`[pey] La generación del QR respondió HTTP ${respuestaPey.status}.`);
    await liberarReserva();
    return respuesta(`pey no pudo generar el QR (HTTP ${respuestaPey.status}).`, 502);
  }

  let datosPey: unknown;
  try {
    datosPey = await respuestaPey.json();
  } catch (error) {
    console.error("[pey] La respuesta del QR no contiene JSON válido:", error);
    return respuesta("pey devolvió una respuesta de QR no válida.", 502);
  }

  const qrId = esObjeto(datosPey) ? datosPey.id : null;
  const qrString = esObjeto(datosPey) ? datosPey.qrString : null;
  if (typeof qrId !== "string" || !qrId || qrId.length > 64 || typeof qrString !== "string" || !qrString) {
    console.error("[pey] La respuesta no incluyó el identificador y contenido del QR.");
    return respuesta("pey no devolvió los datos necesarios para guardar el QR.", 502);
  }

  const { data: guardada, error: errorGuardado } = await admin
    .from("orden")
    .update({ codi_qr_id: qrId, qr_string: qrString })
    .eq("id_orden", fila.id_orden)
    .eq("estado", "pendiente")
    .gt("expira_en", new Date().toISOString())
    .eq("codi_qr_id", reserva)
    .is("qr_string", null)
    .select("id_orden")
    .maybeSingle();

  if (errorGuardado) {
    console.error("[pey] No se pudo guardar el QR en la orden:", errorGuardado);
    return respuesta("pey creó el QR, pero no se pudo guardar. No realices el pago y contacta al taller.", 500);
  }
  if (!guardada) {
    return respuesta("La orden dejó de estar vigente mientras se generaba el QR. No realices el pago.", 409);
  }

  return Response.json({ idOrden: fila.id_orden, expiraEn: fila.expira_en });
}
