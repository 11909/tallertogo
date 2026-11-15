"use client";

// Pantalla 2: Registro (diseñada para computadora)
// Por ahora es solo la pantalla. Falta conectar el registro con Supabase Auth.
import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import BarraSuperior from "@/components/BarraSuperior";

type Rol = "cliente" | "trabajador";
type Errores = { nombre?: string; correo?: string; telefono?: string };

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegistroPage() {
  const [rol, setRol] = useState<Rol>("cliente");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviado, setEnviado] = useState(false);

  function validar(): Errores {
    const e: Errores = {};
    if (nombre.trim().split(/\s+/).filter(Boolean).length < 2) e.nombre = "Escribe tu nombre y al menos un apellido.";
    if (!correo.trim()) e.correo = "Escribe tu correo.";
    else if (!CORREO_VALIDO.test(correo.trim())) e.correo = "Ese correo no es válido.";
    const digitos = telefono.replace(/\D/g, "");
    if (!digitos) e.telefono = "Escribe tu número de teléfono.";
    else if (digitos.length !== 10) e.telefono = "El teléfono debe tener 10 dígitos.";
    return e;
  }

  function crearCuenta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    // TODO: registrar en Supabase Auth y guardar nombre, teléfono y rol en profiles.
    setEnviado(true);
  }

  function limpiar(campo: keyof Errores) {
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
    setEnviado(false);
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
                  setEnviado(false);
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
            etiqueta="Nombre completo"
            placeholder="Juan Pérez López"
            autoComplete="name"
            valor={nombre}
            error={errores.nombre}
            onChange={(v) => {
              setNombre(v);
              limpiar("nombre");
            }}
          />
          <Campo
            id="correo"
            etiqueta="Correo"
            tipo="email"
            placeholder="nombre@correo.com"
            autoComplete="email"
            valor={correo}
            error={errores.correo}
            onChange={(v) => {
              setCorreo(v);
              limpiar("correo");
            }}
          />
          <Campo
            id="telefono"
            etiqueta="Número de teléfono"
            tipo="tel"
            placeholder="55 1234 5678"
            autoComplete="tel-national"
            valor={telefono}
            error={errores.telefono}
            onChange={(v) => {
              setTelefono(v);
              limpiar("telefono");
            }}
          />

          {/* Único botón de acento de la pantalla */}
          <button
            type="submit"
            className="mt-7 h-12 w-full cursor-pointer rounded-lg bg-acento font-titulo text-[17px] font-semibold tracking-wide text-tinta transition hover:brightness-95 active:scale-[0.99]"
          >
            Crear cuenta
          </button>
          <p className="mt-2.5 text-center text-[13px] text-suave">
            {rol === "cliente"
              ? "Después registras tu auto."
              : "Tu cuenta queda pendiente hasta que el taller la apruebe."}
          </p>

          {enviado && (
            <p role="status" className="mt-4 rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-suave">
              Datos listos. Falta conectar el registro con Supabase.
            </p>
          )}
        </form>
      </main>
    </div>
  );
}

function Campo(props: {
  id: string;
  etiqueta: string;
  tipo?: string;
  placeholder: string;
  autoComplete: string;
  valor: string;
  error?: string;
  onChange: (valor: string) => void;
}) {
  const { id, etiqueta, tipo = "text", placeholder, autoComplete, valor, error, onChange } = props;
  return (
    <div className="mt-5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {etiqueta}
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
