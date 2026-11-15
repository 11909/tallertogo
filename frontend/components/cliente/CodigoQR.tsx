// Código QR del pago CoDi.
// TODO (pey): dibujar el QR real a partir de orden.qr_string (o mostrar qrImage, PNG en base64, de POST /codi/qr).
// Por ahora se dibuja un QR de ejemplo que no se puede pagar.
import { Icono } from "@/components/cliente/Piezas";

export default function CodigoQR({
  semilla,
  qrString,
  tamano = 220,
  apagado = false,
}: {
  semilla: number;
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
        <Icono nombre="reloj" tamano={22} />
        Generando el código QR…
      </div>
    );
  }
  const n = 25;
  const celdas: [number, number][] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const enEsquina = (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
      if (!enEsquina && (x * 31 + y * 17 + x * y * 7 + semilla * 13) % 11 < 5) celdas.push([x, y]);
    }
  }
  const esquinas = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ];
  return (
    <svg
      viewBox={`-2 -2 ${n + 4} ${n + 4}`}
      width={tamano}
      height={tamano}
      role="img"
      aria-label="Código QR de pago"
      className={apagado ? "opacity-25 grayscale" : ""}
    >
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      {celdas.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill="#111214" />
      ))}
      {esquinas.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={7} height={7} fill="#111214" />
          <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
          <rect x={x + 2} y={y + 2} width={3} height={3} fill="#111214" />
        </g>
      ))}
    </svg>
  );
}
