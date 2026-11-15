// QR de ejemplo para la demo (no se puede pagar).
// TODO (conexión con pey): mostrar la imagen que regresa POST /codi/qr (`qrImage`, PNG en base64).
export default function CodigoQR({ semilla, tamano = 220, apagado = false }: { semilla: number; tamano?: number; apagado?: boolean }) {
  const n = 25;
  const celdas: [number, number][] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const enEsquina = (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
      if (enEsquina) continue;
      const v = (x * 31 + y * 17 + x * y * 7 + semilla * 13) % 11;
      if (v < 5) celdas.push([x, y]);
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
