// Piezas visuales pequeñas que comparten las pantallas del cliente.
import Image from "next/image";
import { ESTILO_ETAPA, formatoPlaca, type EtapaCliente } from "@/lib/cliente/formato";

// Etiqueta con forma de placa de auto: marco fino, franja superior y texto espaciado.
export function Placa({ placa, tamano = "md" }: { placa: string; tamano?: "sm" | "md" | "lg" }) {
  const texto = { sm: "text-[15px] px-2.5", md: "text-[18px] px-3", lg: "text-[22px] px-4" }[tamano];
  return (
    <span
      className="inline-flex flex-col items-stretch overflow-hidden rounded-[5px] border-[1.5px] border-[#2B2D31] bg-white leading-none shadow-[inset_0_0_0_2px_#fff,inset_0_0_0_3px_#E2E2E0]"
      aria-label={`Placas ${formatoPlaca(placa)}`}
    >
      <span
        aria-hidden="true"
        className="border-b border-borde bg-fondo py-[2px] text-center text-[8px] font-semibold tracking-[0.3em] text-suave"
      >
        MÉXICO
      </span>
      <span
        aria-hidden="true"
        className={`relative flex items-center justify-center py-1 font-titulo font-semibold tracking-[0.12em] whitespace-nowrap text-tinta ${texto}`}
      >
        <span className="absolute top-1/2 left-[5px] h-[3px] w-[3px] -translate-y-1/2 rounded-full bg-borde" />
        {formatoPlaca(placa)}
        <span className="absolute top-1/2 right-[5px] h-[3px] w-[3px] -translate-y-1/2 rounded-full bg-borde" />
      </span>
    </span>
  );
}

export function PastillaEtapa({ etapa }: { etapa: EtapaCliente }) {
  const { etiqueta, clase } = ESTILO_ETAPA[etapa];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${clase}`}>
      {etiqueta}
    </span>
  );
}

// Imagen del Corvette sobre el recuadro gris de siempre
export function FotoAuto({ alto = 160, llenar = false, className = "" }: { alto?: number; llenar?: boolean; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-[#E9E9E6] ${className}`}
      style={llenar ? { minHeight: alto } : { height: alto }}
    >
      <Image
        src="/corvette-z06.png"
        alt="Chevrolet Corvette Z06 2025"
        width={Math.round(alto * 2.4)}
        height={alto}
        className="h-auto w-auto max-w-[86%]"
        style={{ maxHeight: alto * 0.78 }}
      />
    </div>
  );
}

type NombreIcono = "flecha" | "atras" | "chevron" | "basura" | "reloj" | "check" | "alerta" | "cerrar" | "mas" | "llave";

export function Icono({ nombre, tamano = 18, className = "" }: { nombre: NombreIcono; tamano?: number; className?: string }) {
  const trazos: Record<NombreIcono, React.ReactNode> = {
    flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
    atras: <path d="M19 12H5M11 6l-6 6 6 6" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    basura: <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />,
    reloj: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    alerta: (
      <>
        <path d="M12 4 3 20h18L12 4Z" />
        <path d="M12 10v4M12 17h.01" />
      </>
    ),
    cerrar: <path d="m6 6 12 12M18 6 6 18" />,
    mas: <path d="M12 5v14M5 12h14" />,
    llave: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" />,
  };
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {trazos[nombre]}
    </svg>
  );
}

// Clases de botón: el de acento (uno por pantalla) y el de borde
export const BOTON_ACENTO =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-acento px-5 font-titulo text-[17px] font-semibold tracking-wide text-tinta transition hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";
export const BOTON_BORDE =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-borde bg-tarjeta px-4 font-titulo text-[17px] font-semibold tracking-wide text-tinta hover:border-tinta disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-borde";
