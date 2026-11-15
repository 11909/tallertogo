import { Webhook } from "standardwebhooks";
import { crearClienteAdmin } from "@/lib/supabase/admin";

type PagoRecibido = {
  type?: string;
  amount: number;
  codiQrId: string;
  numRef: string;
  transactionId: string;
  datePaid: number;
};

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

function esPagoRecibido(valor: unknown): valor is PagoRecibido {
  if (!esObjeto(valor)) return false;
  return (
    (valor.type === undefined || valor.type === "codi.qr.payment_received") &&
    typeof valor.amount === "number" &&
    Number.isFinite(valor.amount) &&
    valor.amount > 0 &&
    typeof valor.codiQrId === "string" &&
    valor.codiQrId.length > 0 &&
    valor.codiQrId.length <= 64 &&
    typeof valor.numRef === "string" &&
    /^[0-9]{1,7}$/.test(valor.numRef) &&
    typeof valor.transactionId === "string" &&
    valor.transactionId.length > 0 &&
    valor.transactionId.length <= 64 &&
    typeof valor.datePaid === "number" &&
    Number.isSafeInteger(valor.datePaid) &&
    valor.datePaid > 0 &&
    Number.isFinite(new Date(valor.datePaid * 1000).getTime())
  );
}

function esCentavosExactos(monto: number) {
  const centavos = monto * 100;
  const redondeados = Math.round(centavos);
  return Number.isSafeInteger(redondeados) && redondeados <= 2_147_483_647 && Math.abs(centavos - redondeados) < 0.000001;
}

export async function POST(request: Request) {
  const secreto = process.env.PEY_WEBHOOK_SECRET;
  if (!secreto) {
    console.error("[pey] Falta configurar PEY_WEBHOOK_SECRET.");
    return Response.json({ error: "Webhook no configurado." }, { status: 503 });
  }

  let webhook: Webhook;
  try {
    webhook = new Webhook(secreto);
  } catch (error) {
    console.error("[pey] El secreto del webhook no tiene un formato válido:", error);
    return Response.json({ error: "Webhook no configurado correctamente." }, { status: 503 });
  }
  const cuerpo = await request.text();
  if (cuerpo.length > 65_536) return Response.json({ error: "El cuerpo es demasiado grande." }, { status: 413 });

  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };
  let evento: unknown;
  try {
    evento = webhook.verify(cuerpo, headers);
  } catch (error) {
    console.error("[pey] Firma del webhook inválida:", error);
    return Response.json({ error: "Firma del webhook inválida." }, { status: 401 });
  }

  if (esObjeto(evento) && evento.type !== undefined && evento.type !== "codi.qr.payment_received") {
    return new Response(null, { status: 204 });
  }
  if (!esPagoRecibido(evento)) {
    return Response.json({ error: "El webhook no contiene los datos de pago requeridos." }, { status: 400 });
  }
  if (!esCentavosExactos(evento.amount)) {
    return Response.json({ error: "El monto del webhook no está expresado en centavos exactos." }, { status: 400 });
  }
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[pey] Falta configurar la llave secreta de Supabase.");
    return Response.json({ error: "Webhook no configurado." }, { status: 503 });
  }

  const { data: resultado, error } = await crearClienteAdmin().rpc("registrar_pago", {
    p_codi_qr_id: evento.codiQrId,
    p_transaction_id: evento.transactionId,
    p_monto_centavos: Math.round(evento.amount * 100),
    p_fecha_pago: new Date(evento.datePaid * 1000).toISOString(),
  });
  if (error) {
    console.error("[pey] No se pudo registrar el pago confirmado:", error);
    return Response.json({ error: "No se pudo registrar el pago." }, { status: 500 });
  }

  return Response.json({ resultado });
}
