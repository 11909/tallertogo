"use client";

// Pantalla 1: Login (cliente y mecánico), diseñada para computadora
// Inicia sesión con Supabase Auth y manda a cada usuario a su parte según su rol:
// cliente con autos → /autos, cliente sin autos → /inicio, mecánico → /taller (tabla perfil, ver docs/base-de-datos.md).
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Aviso, { mensajeDeFallo, type DatosAviso } from "@/components/Aviso";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

type Errores = { correo?: string; contrasena?: string };

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState<DatosAviso | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  function validar(): Errores {
    const e: Errores = {};
    if (!correo.trim()) e.correo = "Escribe tu correo.";
    else if (!CORREO_VALIDO.test(correo.trim())) e.correo = "Ese correo no es válido.";
    if (!contrasena) e.contrasena = "Escribe tu contraseña.";
    return e;
  }

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const e = validar();
    setErrores(e);
    setAviso(null);
    if (Object.keys(e).length > 0) {
      setAviso({ tipo: "error", texto: "Revisa los campos marcados." });
      return;
    }

    setCargando(true);
    try {
      const supabase = crearClienteNavegador();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: correo.trim().toLowerCase(),
        password: contrasena,
      });

      if (error || !data.user) {
        setAviso({
          tipo: "error",
          texto:
            error?.message === "Email not confirmed"
              ? "Tu correo todavía no está confirmado."
              : "El correo o la contraseña no son correctos.",
        });
        return;
      }

      const { data: perfil, error: errorPerfil } = await supabase
        .from("perfil")
        .select("rol, nombre")
        .eq("id_perfil", data.user.id)
        .maybeSingle();

      if (errorPerfil || !perfil) {
        await supabase.auth.signOut();
        setAviso({
          tipo: "error",
          texto: "Tu cuenta no terminó de registrarse. Vuelve a registrarte con el mismo correo y contraseña.",
        });
        return;
      }

      setAviso({ tipo: "exito", texto: `¡Hola, ${perfil.nombre}! Entrando…` });
      if (perfil.rol === "mecanico") {
        router.push("/taller");
        return;
      }
      // Cliente: si ya registró autos va a Mis autos; si no, a registrar su primer auto
      const { count } = await supabase
        .from("carro")
        .select("id_carro", { count: "exact", head: true })
        .eq("id_cliente", data.user.id);
      router.push(count ? "/autos" : "/inicio");
    } catch (fallo) {
      setAviso({ tipo: "error", texto: mensajeDeFallo(fallo) });
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="grid min-h-screen flex-1 lg:grid-cols-[1.15fr_1fr]">
      {/* Panel de marca (computadora) */}
      <section className="hidden flex-col justify-between border-r border-borde bg-tarjeta px-16 py-12 lg:flex">
        <p className="text-sm text-suave">Taller especializado en suspensión</p>

        <div>
          <Image src="/paddock-logo.png" alt="Paddock" width={440} height={133} priority className="h-auto w-[440px]" />
          <p className="mt-10 max-w-lg font-titulo text-[40px] leading-tight font-semibold">
            Tu carro, diagnosticado pieza por pieza.
          </p>
          <ul className="mt-10 grid max-w-xl grid-cols-3 gap-6">
            {[
              ["Diagnóstico", "Cada pieza con su eje y su lado"],
              ["Refacciones", "Eliges OEM o GM"],
              ["Pago", "Con CoDi desde tu banco"],
            ].map(([titulo, texto]) => (
              <li key={titulo}>
                <div className="mb-3 h-1 w-8 rounded-full bg-acento" aria-hidden="true" />
                <p className="font-semibold">{titulo}</p>
                <p className="mt-1 text-sm text-suave">{texto}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-suave">© 2026 Paddock</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          {/* En pantallas chicas el logo va arriba del formulario */}
          <Image src="/paddock-logo.png" alt="Paddock" width={256} height={77} className="mx-auto mb-10 h-auto w-64 lg:hidden" />

          <form onSubmit={entrar} noValidate className="rounded-xl border border-borde bg-tarjeta p-10">
            <h1 className="font-titulo text-[28px] leading-none font-semibold">Entrar</h1>
            <p className="mt-2 text-sm text-suave">Usa la cuenta con la que te registraste.</p>

            <div className="mt-8">
              <label htmlFor="correo" className="block text-sm font-semibold">
                Correo
              </label>
              <input
                id="correo"
                type="email"
                autoComplete="email"
                placeholder="nombre@correo.com"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  setErrores((prev) => ({ ...prev, correo: undefined }));
                  setAviso(null);
                }}
                aria-invalid={Boolean(errores.correo)}
                aria-describedby={errores.correo ? "correo-error" : undefined}
                className={`mt-1.5 h-12 w-full rounded-lg border bg-tarjeta px-3 text-base outline-none placeholder:text-suave/70 focus:border-tinta ${
                  errores.correo ? "border-error" : "border-borde"
                }`}
              />
              {errores.correo && <MensajeError id="correo-error" texto={errores.correo} />}
            </div>

            <div className="mt-5">
              <label htmlFor="contrasena" className="block text-sm font-semibold">
                Contraseña
              </label>
              <div className="relative mt-1.5">
                <input
                  id="contrasena"
                  type={verContrasena ? "text" : "password"}
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={(e) => {
                    setContrasena(e.target.value);
                    setErrores((prev) => ({ ...prev, contrasena: undefined }));
                    setAviso(null);
                  }}
                  aria-invalid={Boolean(errores.contrasena)}
                  aria-describedby={errores.contrasena ? "contrasena-error" : undefined}
                  className={`h-12 w-full rounded-lg border bg-tarjeta pr-20 pl-3 text-base outline-none focus:border-tinta ${
                    errores.contrasena ? "border-error" : "border-borde"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setVerContrasena((v) => !v)}
                  className="absolute inset-y-0 right-1 my-1 rounded-md px-3 text-sm font-semibold text-suave hover:text-tinta"
                  aria-label={verContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verContrasena ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {errores.contrasena && <MensajeError id="contrasena-error" texto={errores.contrasena} />}
            </div>

            {/* Único botón de acento de la pantalla */}
            <button
              type="submit"
              disabled={cargando}
              className="mt-8 h-12 w-full cursor-pointer rounded-lg bg-acento font-titulo text-[17px] font-semibold tracking-wide text-tinta transition hover:brightness-95 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
            >
              {cargando ? "Entrando…" : "Entrar"}
            </button>

            {aviso && <Aviso {...aviso} className="mt-4" />}
          </form>

          <p className="mt-6 text-center text-sm text-suave">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-tinta underline underline-offset-4">
              Crear cuenta
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-suave">Clientes y trabajadores del taller entran aquí.</p>
        </div>
      </section>
    </main>
  );
}

function MensajeError({ id, texto }: { id: string; texto: string }) {
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-sm text-error">
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4ZM10 14.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
      {texto}
    </p>
  );
}
