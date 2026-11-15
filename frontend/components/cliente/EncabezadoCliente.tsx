"use client";

// Barra superior del cliente + pestañas Mis autos | Carrito | Pagos
import Link from "next/link";
import { usePathname } from "next/navigation";
import BarraSuperior from "@/components/BarraSuperior";
import { useCliente } from "@/components/cliente/EstadoCliente";

export default function EncabezadoCliente() {
  const ruta = usePathname();
  const { usuario, piezasEnCarrito, ordenes, estadoOrden, salir } = useCliente();
  const pendientes = ordenes.filter((o) => estadoOrden(o) !== "pagado").length;

  const pestanas = [
    { href: "/autos", etiqueta: "Mis autos" },
    { href: "/carrito", etiqueta: "Carrito", contador: piezasEnCarrito },
    { href: "/pagos", etiqueta: "Pagos", contador: pendientes },
  ];

  return (
    <>
      <BarraSuperior
        derecha={
          <div className="flex items-center gap-3 text-sm text-suave">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-tinta text-[13px] font-semibold text-acento">
              {usuario.iniciales}
            </span>
            <span className="leading-tight">
              <span className="block font-semibold text-tinta">{usuario.nombre}</span>
              <span className="text-xs">Cliente</span>
            </span>
            <button
              type="button"
              onClick={salir}
              className="ml-1 cursor-pointer rounded-lg border border-borde bg-tarjeta px-3.5 py-2 font-semibold text-tinta hover:border-tinta"
            >
              Salir
            </button>
          </div>
        }
      />
      <nav className="border-b border-borde bg-tarjeta" aria-label="Secciones">
        <div className="mx-auto flex h-14 max-w-[1240px] items-stretch gap-9 px-12">
          {pestanas.map((p) => {
            const activa = ruta === p.href || ruta.startsWith(`${p.href}/`);
            return (
              <Link
                key={p.href}
                href={p.href}
                aria-current={activa ? "page" : undefined}
                className={`flex items-center gap-2 border-b-2 text-[15px] font-semibold ${
                  activa ? "border-tinta text-tinta" : "border-transparent text-suave hover:text-tinta"
                }`}
              >
                {p.etiqueta}
                {p.contador ? (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs ${
                      activa ? "bg-tinta text-acento" : "bg-fondo text-suave"
                    }`}
                  >
                    {p.contador}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// Encabezado de cada pantalla: etiqueta pequeña, título y texto, con una acción opcional a la derecha
export function TituloPantalla({
  etiqueta,
  titulo,
  texto,
  accion,
}: {
  etiqueta?: string;
  titulo: string;
  texto?: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-6">
      <div>
        {etiqueta && <p className="text-xs font-semibold tracking-[0.12em] text-suave uppercase">{etiqueta}</p>}
        <h1 className="mt-1 font-titulo text-[30px] leading-none font-semibold">{titulo}</h1>
        {texto && <p className="mt-2 text-[15px] text-suave">{texto}</p>}
      </div>
      {accion}
    </div>
  );
}
