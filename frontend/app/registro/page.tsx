"use client";

// Pantalla 2: Registro de clientes y trabajadores (diseñada para computadora)
// Los campos coinciden con la tabla perfil de docs/base-de-datos.md:
//   rol, nombre, apellido_paterno, apellido_materno, correo, telefono.
// La contraseña NO va en perfil: la guarda cifrada Supabase Auth (auth.users), igual que el login la valida.
// "Trabajador" se guarda como rol = 'mecanico'.
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Aviso, { mensajeDeFallo, type DatosAviso } from "@/components/Aviso";
import BarraSuperior from "@/components/BarraSuperior";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

type Rol = "cliente" | "trabajador";
type CampoForm = "nombre" | "apellidoPaterno" | "apellidoMaterno" | "correo" | "telefono" | "contrasena";
type Errores = Partial<Record<CampoForm, string>>;

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_CONTRASENA = 8;
const DESTINO: Record<Rol, string> = { cliente: "/inicio", trabajador: "/taller" };

export default function RegistroPage() {
  const router = useRouter();
  const [rol, setRol] = useState<Rol>("cliente");
  const [datos, setDatos] = useState<Record<CampoForm, string>>({
    nombre: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    correo: "",
    telefono: "",
    contrasena: "",
  });
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState<DatosAviso | null>(null);
  const [cargando, setCargando] = useState(false);

  function cambiar(campo: CampoForm, valor: string) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
    setAviso(null);
  }

  function validar(): Errores {
    const e: Errores = {};
    if (!datos.nombre.trim()) e.nombre = "Escribe tu nombre.";
    if (!datos.apellidoPaterno.trim()) e.apellidoPaterno = "Escribe tu apellido paterno.";
    const correo = datos.correo.trim();
    if (!correo) e.correo = "Escribe tu correo.";
    else if (!CORREO_VALIDO.test(correo)) e.correo = "Ese correo no es válido.";
    const digitos = datos.telefono.replace(/\D/g, "");
    if (!digitos) e.telefono = "Escribe tu número de teléfono.";
    else if (digitos.length !== 10) e.telefono = "El teléfono debe tener 10 dígitos.";
    if (!datos.contrasena) e.contrasena = "Escribe una contraseña.";
    else if (datos.contrasena.length < MIN_CONTRASENA) e.contrasena = `Usa al menos ${MIN_CONTRASENA} caracteres.`;
    return e;
  }

  async function crearCuenta(evento: FormEvent<HTMLFormElement>) {
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
      const correo = datos.correo.trim().toLowerCase();

      // 1) Cuenta en Supabase Auth: aquí se guarda la contraseña (cifrada).
      let { data, error } = await supabase.auth.signUp({ email: correo, password: datos.contrasena });

      // Si el correo ya existe (por ejemplo, un registro anterior que no terminó de guardar el perfil),
      // se intenta entrar con la misma contraseña para completarlo.
      if (error?.message.toLowerCase().includes("already registered")) {
        const entrada = await supabase.auth.signInWithPassword({ email: correo, password: datos.contrasena });
        if (entrada.error || !entrada.data.user) {
          setErrores({ correo: "Ya hay una cuenta con este correo." });
          setAviso({ tipo: "error", texto: "Ese correo ya está registrado. Entra desde la pantalla de login." });
          return;
        }
        const { data: perfilExistente } = await supabase
          .from("perfil")
          .select("rol")
          .eq("id_perfil", entrada.data.user.id)
          .maybeSingle();
        if (perfilExistente) {
          setAviso({ tipo: "exito", texto: "Ya tenías cuenta. Te llevamos a tu sección…" });
          router.push(perfilExistente.rol === "mecanico" ? DESTINO.trabajador : DESTINO.cliente);
          return;
        }
        data = { user: entrada.data.user, session: entrada.data.session };
        error = null;
      }

      if (error || !data.user) {
        if (error?.message.toLowerCase().includes("password")) {
          setErrores({ contrasena: "Esa contraseña no es válida. Prueba con otra más larga." });
          setAviso({ tipo: "error", texto: "La contraseña no cumple los requisitos." });
        } else {
          console.error("[TallerToGo] signUp:", error);
          setAviso({ tipo: "error", texto: "No se pudo crear la cuenta. Intenta de nuevo." });
        }
        return;
      }

      if (!data.session) {
        // Sin sesión, RLS no deja guardar el perfil. Pasa si en Supabase está activa la confirmación de correo.
        console.error(
          "[TallerToGo] signUp sin sesión: desactiva 'Confirm email' en Supabase (Authentication → Sign In / Providers → Email)."
        );
        setAviso({
          tipo: "error",
          texto: "Se creó la cuenta, pero Supabase pide confirmar el correo antes de entrar. Avisa al equipo del taller.",
        });
        return;
      }

      // 2) Perfil con el rol y los datos de contacto (tabla perfil).
      const { error: errorPerfil } = await supabase.from("perfil").insert({
        id_perfil: data.user.id,
        rol: rol === "trabajador" ? "mecanico" : "cliente",
        nombre: datos.nombre.trim(),
        apellido_paterno: datos.apellidoPaterno.trim(),
        apellido_materno: datos.apellidoMaterno.trim() || null,
        correo,
        telefono: datos.telefono.replace(/\D/g, ""),
      });
      if (errorPerfil) {
        console.error("[TallerToGo] insert perfil:", errorPerfil);
        await supabase.auth.signOut();
        setAviso({
          tipo: "error",
          texto:
            errorPerfil.code === "23505"
              ? "Ya hay un perfil con este correo."
              : "Se creó la cuenta, pero no se pudieron guardar tus datos. Vuelve a intentarlo con el mismo correo y contraseña.",
        });
        return;
      }

      setAviso({
        tipo: "exito",
        texto: rol === "cliente" ? "¡Cuenta creada! Te llevamos a registrar tu auto…" : "¡Cuenta creada! Te llevamos al taller…",
      });
      router.push(DESTINO[rol]);
    } catch (fallo) {
      setAviso({ tipo: "error", texto: mensajeDeFallo(fallo) });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BarraSuperior
        derecha={
          <p className="text-sm text-suave">
            ¿Ya tienes cuenta?
            <Link
              href="/login"
              className="ml-2 rounded-lg border border-borde bg-tarjeta px-3.5 py-2 font-semibold text-tinta hover:border-tinta"
            >
              Entrar
            </Link>
          </p>
        }
      />

      <main className="mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-14 px-12 py-12 lg:grid-cols-[1.1fr_1fr]">
        {/* Imagen y mensaje */}
        <section className="hidden lg:block">
          <Image src="/f1-auto.png" alt="" width={620} height={265} priority className="h-auto w-full max-w-[620px]" />
          <p className="mt-8 max-w-[520px] font-titulo text-[40px] leading-tight font-semibold">
            Tu carro, diagnosticado pieza por pieza.
          </p>
          <p className="mt-3 text-suave">Crea tu cuenta para ver el diagnóstico de tu auto y pagar con CoDi.</p>
        </section>

        {/* Formulario */}
        <form
          onSubmit={crearCuenta}
          noValidate
          className="mx-auto w-full max-w-[460px] rounded-xl border border-borde bg-tarjeta p-10"
        >
          <h1 className="font-titulo text-[28px] leading-none font-semibold">Crear cuenta</h1>
          <p className="mt-2 text-sm text-suave">Te toma menos de un minuto.</p>

          <p id="rol-label" className="mt-6 text-sm font-semibold">
            ¿Qué eres?
          </p>
          <div role="radiogroup" aria-labelledby="rol-label" className="mt-1.5 grid grid-cols-2 gap-2">
            {(
              [
                ["cliente", "Cliente"],
                ["trabajador", "Trabajador"],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={rol === valor}
                onClick={() => {
                  setRol(valor);
                  setAviso(null);
                }}
                className={`h-11 cursor-pointer rounded-lg border font-semibold transition ${
                  rol === valor ? "border-tinta bg-tinta text-acento" : "border-borde bg-tarjeta text-suave hover:text-tinta"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>

          <Campo
            id="nombre"
            etiqueta="Nombre(s)"
            placeholder="Juan"
            autoComplete="given-name"
            valor={datos.nombre}
            error={errores.nombre}
            onChange={(v) => cambiar("nombre", v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Campo
              id="apellido-paterno"
              etiqueta="Apellido paterno"
              placeholder="Pérez"
              autoComplete="family-name"
              valor={datos.apellidoPaterno}
              error={errores.apellidoPaterno}
              onChange={(v) => cambiar("apellidoPaterno", v)}
            />
            <Campo
              id="apellido-materno"
              etiqueta="Apellido materno"
              opcional
              placeholder="López"
              autoComplete="additional-name"
              valor={datos.apellidoMaterno}
              error={errores.apellidoMaterno}
              onChange={(v) => cambiar("apellidoMaterno", v)}
            />
          </div>
          <Campo
            id="correo"
            etiqueta="Correo"
            tipo="email"
            placeholder="nombre@correo.com"
            autoComplete="email"
            valor={datos.correo}
            error={errores.correo}
            onChange={(v) => cambiar("correo", v)}
          />
          <Campo
            id="telefono"
            etiqueta="Número de teléfono"
            tipo="tel"
            placeholder="55 1234 5678"
            autoComplete="tel-national"
            valor={datos.telefono}
            error={errores.telefono}
            onChange={(v) => cambiar("telefono", v)}
          />
          <Campo
            id="contrasena"
            etiqueta="Contraseña"
            tipo="password"
            placeholder={`Mínimo ${MIN_CONTRASENA} caracteres`}
            autoComplete="new-password"
            valor={datos.contrasena}
            error={errores.contrasena}
            onChange={(v) => cambiar("contrasena", v)}
          />

          {/* Único botón de acento de la pantalla */}
          <button
            type="submit"
            disabled={cargando}
            className="mt-7 h-12 w-full cursor-pointer rounded-lg bg-acento font-titulo text-[17px] font-semibold tracking-wide text-tinta transition hover:brightness-95 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
          >
            {cargando ? "Creando cuenta…" : "Crear cuenta"}
          </button>
          <p className="mt-2.5 text-center text-[13px] text-suave">
            {rol === "cliente" ? "Después registras tu auto." : "Entrarás a la lista de autos del taller."}
          </p>

          {aviso && <Aviso {...aviso} className="mt-4" />}
        </form>
      </main>
    </div>
  );
}

function Campo(props: {
  id: string;
  etiqueta: string;
  opcional?: boolean;
  tipo?: string;
  placeholder: string;
  autoComplete: string;
  valor: string;
  error?: string;
  onChange: (valor: string) => void;
}) {
  const { id, etiqueta, opcional, tipo = "text", placeholder, autoComplete, valor, error, onChange } = props;
  return (
    <div className="mt-5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {etiqueta}
        {opcional && <span className="font-normal text-suave"> (opcional)</span>}
      </label>
      <input
        id={id}
        type={tipo}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1.5 h-12 w-full rounded-lg border bg-tarjeta px-3 text-base outline-none placeholder:text-suave/70 focus:border-tinta ${
          error ? "border-error" : "border-borde"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-sm text-error">
          <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4ZM10 14.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
