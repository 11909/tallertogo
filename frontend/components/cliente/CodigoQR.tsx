// Código QR del pago CoDi.
import { QRCodeSVG } from "qrcode.react";
import { Icono } from "@/components/cliente/Piezas";

export default function CodigoQR({
  qrString,
  tamano = 220,
  apagado = false,
}: {
  qrString: string | null;
  tamano?: number;
  apagado?: boolean;
}) {
  if (!qrString) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#D0D0CC] bg-fondo px-6 text-center text-sm text-suave"
        style={{ width: tamano, height: tamano }}
      >
        <Icono nombre="alerta" tamano={22} />
        El código QR no está disponible.
      </div>
    );
  }
  return (
    <QRCodeSVG
      value={qrString}
      size={tamano}
      bgColor="#FFFFFF"
      fgColor="#111214"
      title="Código QR de pago"
      className={apagado ? "opacity-25 grayscale" : ""}
    />
  );
}
