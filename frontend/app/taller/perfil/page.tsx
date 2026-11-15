"use client";

// Mi perfil (mecánico): solo lectura. Sus datos son del trabajo, así que no los puede modificar;
// si algo está mal, lo corrige el encargado del taller. Por eso no hay Guardar ni cambio de contraseña.
// La base también lo impide: la política perfil_editar_cliente solo deja editar a los clientes
// (docs/base-de-datos.md, paso 8). Sin conexión con Supabase se muestran los datos de la demo.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BarraSuperior from "@/components/BarraSuperior";
import MenuMecanico from "@/components/MenuMecanico";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

type Perfil = { nombre: string; apellidoPaterno: string; apellidoMaterno: string; correo: string; telefono: string };

// Datos de la demo cuando no hay sesión de Supabase
const PERFIL_DEMO: Perfil = {
  nombre: "Tomás",
  apellidoPaterno: "Martínez",
  apellidoMaterno: "Ruiz",
  correo: "mecanico@paddock.mx",
  telefono: "5587654321",
};

// 5587654321 → 55 8765 4321
const formatoTelefono = (t: string) => {
  const d = t.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : t;
};

export default function PerfilMecanico() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const supabase = crearClienteNavegador();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("sin sesión");
        const { data } = await supabase
          .from("perfil")
          .select("rol, nombre, apellido_paterno, apellido_materno, correo, telefono")
          .eq("id_perfil", user.id)
          .maybeSingle();
        if (!data) throw new Error("sin perfil");
        if (data.rol === "cliente") {
          router.replace("/perfil"); // el cliente tiene su propio perfil, editable
          return;
        }
        if (vigente) {
          setPerfil({
            nombre: data.nombre,
            apellidoPaterno: data.apellido_paterno,
            apellidoMaterno: data.apellido_materno ?? "",
            correo: data.correo,
            telefono: data.telefono,
          });
        }
      } catch {
        // Sin conexión o sin sesión: datos de la demo
        if (vigente) setPerfil(PERFIL_DEMO);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [router]);

  const cerrarSesion = async () => {
    try {
      await crearClienteNavegador().auth.signOut();
    } catch {
      // Sin conexión: igual se regresa al login
    } finally {
      router.push("/login");
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BarraSuperior derecha={<MenuMecanico />} />

      <main className="mx-auto w-full max-w-[1080px] px-12 pt-7 pb-12">
        <Link href="/taller" className="text-sm font-semibold text-suave hover:text-tinta">
          ← Volver a autos por atender
        </Link>
        <h1 className="mt-2.5 font-titulo text-[32px] leading-tight font-semibold">Mi perfil</h1>
        <p className="mt-1 text-sm text-suave">Tus datos como trabajador del taller.</p>

        {!perfil ? (
          <p className="mt-6 text-sm text-suave">Cargando tu perfil…</p>
        ) : (
          <div className="mt-[22px] grid grid-cols-[320px_minmax(0,1fr)] items-start gap-5">
            <aside className="rounded-xl border border-borde bg-tarjeta px-6 py-7 text-center">
              <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-tinta font-titulo text-[34px] font-semibold text-acento">
                {`${perfil.nombre[0] ?? ""}${perfil.apellidoPaterno[0] ?? ""}`.toUpperCase()}
              </span>
              <h2 className="mt-3.5 font-titulo text-2xl font-semibold">
                {[perfil.nombre, perfil.apellidoPaterno, perfil.apellidoMaterno].filter(Boolean).join(" ")}
              </h2>
              <span className="mt-1.5 inline-block rounded-full bg-tinta px-3 py-0.5 text-xs font-semibold text-acento">
                Mecánico
              </span>
              <p className="mt-2 text-sm text-suave">Taller Paddock</p>
              <button
                type="button"
                onClick={cerrarSesion}
                className="mt-[22px] h-11 w-full cursor-pointer rounded-lg border border-borde bg-tarjeta text-[15px] font-semibold text-tinta hover:border-tinta"
              >
                Cerrar sesión
              </button>
            </aside>

            <section
              className="rounded-xl border border-borde bg-tarjeta px-[26px] py-[22px]"
              aria-labelledby="datos-trabajador"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="datos-trabajador" className="font-titulo text-[22px] font-semibold">
                    Datos del trabajador
                  </h2>
                  <p className="mt-1 text-sm text-suave">Son datos de trabajo: solo se pueden consultar.</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-borde bg-fondo px-2.5 py-1 text-xs font-semibold text-suave">
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M10 2a4 4 0 0 0-4 4v2H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-1V6a4 4 0 0 0-4-4Zm2 6V6a2 2 0 1 0-4 0v2h4Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Solo lectura
                </span>
              </div>

              <dl className="mt-[18px] grid grid-cols-2 gap-x-[18px] gap-y-4">
                <Dato etiqueta="Nombre(s)" valor={perfil.nombre} className="col-span-2" />
                <Dato etiqueta="Apellido paterno" valor={perfil.apellidoPaterno} />
                <Dato etiqueta="Apellido materno" valor={perfil.apellidoMaterno || "—"} />
                <Dato etiqueta="Teléfono" valor={formatoTelefono(perfil.telefono)} />
                <Dato etiqueta="Correo" valor={perfil.correo} />
              </dl>

              <div className="mt-5 flex items-start gap-3 rounded-[10px] border border-[#F2DE8A] bg-[#FFF8DB] px-4 py-3.5 text-sm leading-[1.45]">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-acento font-bold text-tinta">
                  !
                </span>
                <div>
                  <p className="font-semibold">¿Algún dato está mal?</p>
                  <p className="text-suave">
                    Pídele al encargado del taller que lo corrija. Tú no puedes modificar estos datos.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Dato({ etiqueta, valor, className = "" }: { etiqueta: string; valor: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-sm font-semibold">{etiqueta}</dt>
      <dd className="mt-1.5 flex h-12 items-center rounded-lg border border-borde bg-fondo px-3.5 text-[15px] break-all text-[#3a3d42]">
        {valor}
      </dd>
    </div>
  );
}
