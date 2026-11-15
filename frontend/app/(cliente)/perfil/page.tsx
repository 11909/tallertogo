"use client";

// Mi perfil (cliente): consulta y edita sus datos de contacto y cambia su contraseña.
// - Campos de la tabla perfil: nombre, apellido_paterno, apellido_materno, correo y telefono.
//   El correo no se edita aquí: es con el que inicia sesión (Supabase Auth).
// - Mismas reglas que el registro: teléfono de 10 dígitos y contraseña de mínimo 8 caracteres.
// - "Cómo pagas" solo explica el pago con CoDi: no se guarda ninguna CLABE ni tarjeta.
// - El perfil del mecánico es de solo lectura (sus datos son del trabajo); esta pantalla es solo del cliente.
// Lee y guarda en Supabase. Para guardar, la base necesita la política perfil_editar_cliente
// (docs/base-de-datos.md, paso 8). Sin conexión con Supabase se muestran los datos de la demo.
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import Aviso, { mensajeDeFallo, type DatosAviso } from "@/components/Aviso";
import { TituloPantalla } from "@/components/cliente/EncabezadoCliente";
import { useCliente } from "@/components/cliente/EstadoCliente";
import { BOTON_ACENTO, BOTON_BORDE, Icono } from "@/components/cliente/Piezas";
import { MINUTOS_QR } from "@/lib/clienteDemo";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

const MIN_CONTRASENA = 8; // igual que en el registro

type Datos = { nombre: string; apellidoPaterno: string; apellidoMaterno: string; telefono: string };
type Perfil = Datos & { correo: string };
type CampoDatos = keyof Datos;

// Datos de la demo cuando no hay sesión de Supabase
const PERFIL_DEMO: Perfil = {
  nombre: "Miguel Ángel",
  apellidoPaterno: "Méndez",
  apellidoMaterno: "",
  correo: "cliente@paddock.mx",
  telefono: "5512345678",
};

const soloDigitos = (t: string) => t.replace(/\D/g, "");
// 5512345678 → 55 1234 5678
const formatoTelefono = (t: string) => {
  const d = soloDigitos(t);
  return d.length === 10 ? `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : t;
};

function validar(d: Datos) {
  const e: Partial<Record<CampoDatos, string>> = {};
  if (!d.nombre.trim()) e.nombre = "Escribe tu nombre.";
  if (!d.apellidoPaterno.trim()) e.apellidoPaterno = "Escribe tu apellido paterno.";
  const digitos = soloDigitos(d.telefono);
  if (!digitos) e.telefono = "Escribe tu número de teléfono.";
  else if (digitos.length !== 10) e.telefono = "El teléfono debe tener 10 dígitos.";
  return e;
}

export default function MiPerfil() {
  const router = useRouter();
  const { salir } = useCliente();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [idUsuario, setIdUsuario] = useState<string | null>(null); // null = demo sin sesión
  const [datos, setDatos] = useState<Datos>({ nombre: "", apellidoPaterno: "", apellidoMaterno: "", telefono: "" });
  const [errores, setErrores] = useState<Partial<Record<CampoDatos, string>>>({});
  const [aviso, setAviso] = useState<DatosAviso | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [contrasena, setContrasena] = useState({ nueva: "", confirmar: "" });
  const [errorContrasena, setErrorContrasena] = useState<{ nueva?: string; confirmar?: string }>({});
  const [avisoContrasena, setAvisoContrasena] = useState<DatosAviso | null>(null);
  const [cambiando, setCambiando] = useState(false);

  const cargarEnFormulario = (p: Perfil) => {
    setPerfil(p);
    setDatos({
      nombre: p.nombre,
      apellidoPaterno: p.apellidoPaterno,
      apellidoMaterno: p.apellidoMaterno,
      telefono: formatoTelefono(p.telefono),
    });
  };

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
        if (data.rol === "mecanico") {
          router.replace("/taller");
          return;
        }
        if (!vigente) return;
        setIdUsuario(user.id);
        cargarEnFormulario({
          nombre: data.nombre,
          apellidoPaterno: data.apellido_paterno,
          apellidoMaterno: data.apellido_materno ?? "",
          correo: data.correo,
          telefono: data.telefono,
        });
      } catch {
        // Sin conexión o sin sesión: datos de la demo
        if (vigente) cargarEnFormulario(PERFIL_DEMO);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [router]);

  const cambiar = (campo: CampoDatos, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setAviso(null);
  };

  const sinCambios =
    !perfil ||
    (datos.nombre.trim() === perfil.nombre &&
      datos.apellidoPaterno.trim() === perfil.apellidoPaterno &&
      datos.apellidoMaterno.trim() === perfil.apellidoMaterno &&
      soloDigitos(datos.telefono) === soloDigitos(perfil.telefono));

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!perfil) return;
    const e = validar(datos);
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    const nuevo: Perfil = {
      correo: perfil.correo,
      nombre: datos.nombre.trim(),
      apellidoPaterno: datos.apellidoPaterno.trim(),
      apellidoMaterno: datos.apellidoMaterno.trim(),
      telefono: soloDigitos(datos.telefono),
    };

    setGuardando(true);
    try {
      if (idUsuario) {
        const { data, error } = await crearClienteNavegador()
          .from("perfil")
          .update({
            nombre: nuevo.nombre,
            apellido_paterno: nuevo.apellidoPaterno,
            apellido_materno: nuevo.apellidoMaterno || null,
            telefono: nuevo.telefono,
          })
          .eq("id_perfil", idUsuario)
          .select("id_perfil");
        if (error) throw error;
        // Sin la política perfil_editar_cliente, la base no actualiza nada (y no marca error)
        if (!data?.length) {
          setAviso({
            tipo: "error",
            texto: "La base todavía no permite editar el perfil. Falta correr el paso 8 de docs/base-de-datos.md.",
          });
          return;
        }
      }
      cargarEnFormulario(nuevo);
      setAviso({ tipo: "exito", texto: "Guardamos tus cambios." });
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeDeFallo(err) });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarContrasena = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: { nueva?: string; confirmar?: string } = {};
    if (contrasena.nueva.length < MIN_CONTRASENA) e.nueva = `Usa al menos ${MIN_CONTRASENA} caracteres.`;
    if (!e.nueva && contrasena.confirmar !== contrasena.nueva) e.confirmar = "Las contraseñas no coinciden.";
    setErrorContrasena(e);
    setAvisoContrasena(null);
    if (Object.keys(e).length > 0) return;

    setCambiando(true);
    try {
      if (idUsuario) {
        const { error } = await crearClienteNavegador().auth.updateUser({ password: contrasena.nueva });
        if (error) throw error;
      }
      setContrasena({ nueva: "", confirmar: "" });
      setAvisoContrasena({ tipo: "exito", texto: "Cambiamos tu contraseña." });
    } catch (err) {
      const texto =
        err instanceof Error && /different|same/i.test(err.message)
          ? "La nueva contraseña debe ser distinta a la actual."
          : mensajeDeFallo(err);
      setAvisoContrasena({ tipo: "error", texto });
    } finally {
      setCambiando(false);
    }
  };

  if (!perfil) return <p className="text-sm text-suave">Cargando tu perfil…</p>;

  const nombreCompleto = [perfil.nombre, perfil.apellidoPaterno, perfil.apellidoMaterno].filter(Boolean).join(" ");
  const iniciales = `${perfil.nombre[0] ?? ""}${perfil.apellidoPaterno[0] ?? ""}`.toUpperCase();

  return (
    <>
      <Link
        href="/autos"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-suave hover:text-tinta"
      >
        <Icono nombre="atras" tamano={16} />
        Volver a mis autos
      </Link>
      <TituloPantalla
        etiqueta="Tu cuenta"
        titulo="Mi perfil"
        texto="Tus datos de contacto. El taller los usa para avisarte del avance de tus autos."
      />

      <div className="grid grid-cols-[320px_minmax(0,1fr)] items-start gap-5">
        {/* Izquierda: resumen del cliente y cómo paga */}
        <div className="flex flex-col gap-5">
          <aside className="rounded-xl border border-borde bg-tarjeta px-6 py-7 text-center">
            <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-tinta font-titulo text-[34px] font-semibold text-acento">
              {iniciales}
            </span>
            <h2 className="mt-3.5 font-titulo text-2xl font-semibold">{nombreCompleto}</h2>
            <span className="mt-1.5 inline-block rounded-full bg-tinta px-3 py-0.5 text-xs font-semibold text-acento">
              Cliente
            </span>
            <dl className="mt-5 border-t border-[#EFEFED] text-left">
              <div className="border-b border-[#EFEFED] py-3">
                <dt className="text-xs text-suave">Correo</dt>
                <dd className="text-[15px] font-semibold break-all">{perfil.correo}</dd>
              </div>
              <div className="border-b border-[#EFEFED] py-3">
                <dt className="text-xs text-suave">Teléfono</dt>
                <dd className="text-[15px] font-semibold">{formatoTelefono(perfil.telefono)}</dd>
              </div>
            </dl>
            <button type="button" onClick={salir} className={`${BOTON_BORDE} mt-[18px] w-full`}>
              Cerrar sesión
            </button>
          </aside>

          <section className="rounded-xl border border-borde bg-tarjeta px-[22px] py-5" aria-labelledby="como-pagas">
            <h2 id="como-pagas" className="flex items-center gap-2.5 font-titulo text-xl font-semibold">
              <Image src="/codi-logo.png" alt="CoDi" width={34} height={34} />
              Cómo pagas
            </h2>
            <ol className="mt-3.5 flex flex-col gap-3 text-sm leading-snug">
              {[
                <>
                  En el carrito da clic en <b>Pagar con CoDi</b>.
                </>,
                <>Escanea el código QR con la app de tu banco. Vence en {MINUTOS_QR} minutos.</>,
                <>El pago se confirma solo y ves tu ticket.</>,
              ].map((paso, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-borde text-xs font-semibold text-suave">
                    {i + 1}
                  </span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3.5 rounded-lg border border-borde bg-fondo px-3 py-2.5 text-[13px] leading-[1.45] text-suave">
              <b className="text-tinta">No necesitas registrar tarjeta ni CLABE.</b> El dinero sale directo de tu cuenta
              desde la app de tu banco, y Paddock no guarda tus datos bancarios.
            </p>
          </section>
        </div>

        {/* Derecha: formularios */}
        <div className="flex flex-col gap-5">
          <form onSubmit={guardar} noValidate className="rounded-xl border border-borde bg-tarjeta px-[26px] py-[22px]">
            <h2 className="font-titulo text-[22px] font-semibold">Datos personales</h2>
            <p className="mt-1 text-sm text-suave">Revisa que tu nombre y teléfono estén bien.</p>

            <div className="mt-4 grid grid-cols-2 gap-x-[18px] gap-y-4">
              <Campo
                id="nombre"
                etiqueta="Nombre(s)"
                autoComplete="given-name"
                valor={datos.nombre}
                error={errores.nombre}
                onChange={(v) => cambiar("nombre", v)}
                className="col-span-2"
              />
              <Campo
                id="apellido-paterno"
                etiqueta="Apellido paterno"
                autoComplete="family-name"
                valor={datos.apellidoPaterno}
                error={errores.apellidoPaterno}
                onChange={(v) => cambiar("apellidoPaterno", v)}
              />
              <Campo
                id="apellido-materno"
                etiqueta="Apellido materno"
                opcional
                autoComplete="additional-name"
                valor={datos.apellidoMaterno}
                onChange={(v) => cambiar("apellidoMaterno", v)}
              />
              <Campo
                id="telefono"
                etiqueta="Teléfono"
                tipo="tel"
                autoComplete="tel-national"
                valor={datos.telefono}
                error={errores.telefono}
                ayuda="10 dígitos, sin lada internacional."
                onChange={(v) => cambiar("telefono", v)}
              />
              <div>
                <label htmlFor="correo" className="block text-sm font-semibold">
                  Correo
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="correo"
                    type="email"
                    value={perfil.correo}
                    readOnly
                    aria-describedby="correo-ayuda"
                    className="h-12 w-full rounded-lg border border-borde bg-fondo pr-28 pl-3 text-base text-suave outline-none"
                  />
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-borde bg-tarjeta px-2 py-0.5 text-xs text-suave">
                    No editable
                  </span>
                </div>
                <p id="correo-ayuda" className="mt-1.5 text-xs text-suave">
                  Es con el que inicias sesión.
                </p>
              </div>
            </div>

            {aviso && <Aviso {...aviso} className="mt-4" />}

            <div className="mt-5 flex justify-end gap-2.5 border-t border-[#EFEFED] pt-[18px]">
              <button
                type="button"
                onClick={() => {
                  cargarEnFormulario(perfil);
                  setErrores({});
                  setAviso(null);
                }}
                disabled={sinCambios || guardando}
                className={BOTON_BORDE}
              >
                Cancelar
              </button>
              <button type="submit" disabled={sinCambios || guardando} className={BOTON_ACENTO}>
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>

          <form
            onSubmit={cambiarContrasena}
            noValidate
            className="rounded-xl border border-borde bg-tarjeta px-[26px] py-[22px]"
          >
            <h2 className="font-titulo text-[22px] font-semibold">Contraseña</h2>
            <p className="mt-1 text-sm text-suave">Usa al menos {MIN_CONTRASENA} caracteres.</p>
            <div className="mt-4 grid grid-cols-2 gap-x-[18px] gap-y-4">
              <Campo
                id="contrasena-nueva"
                etiqueta="Nueva contraseña"
                tipo="password"
                autoComplete="new-password"
                valor={contrasena.nueva}
                error={errorContrasena.nueva}
                onChange={(v) => {
                  setContrasena((c) => ({ ...c, nueva: v }));
                  setErrorContrasena({});
                  setAvisoContrasena(null);
                }}
              />
              <Campo
                id="contrasena-confirmar"
                etiqueta="Confirmar contraseña"
                tipo="password"
                autoComplete="new-password"
                valor={contrasena.confirmar}
                error={errorContrasena.confirmar}
                onChange={(v) => {
                  setContrasena((c) => ({ ...c, confirmar: v }));
                  setErrorContrasena({});
                  setAvisoContrasena(null);
                }}
              />
            </div>

            {avisoContrasena && <Aviso {...avisoContrasena} className="mt-4" />}

            <div className="mt-5 flex justify-end border-t border-[#EFEFED] pt-[18px]">
              <button
                type="submit"
                disabled={cambiando || !contrasena.nueva || !contrasena.confirmar}
                className={BOTON_BORDE}
              >
                {cambiando ? "Cambiando…" : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function Campo(props: {
  id: string;
  etiqueta: string;
  opcional?: boolean;
  tipo?: string;
  autoComplete: string;
  valor: string;
  error?: string;
  ayuda?: string;
  className?: string;
  onChange: (valor: string) => void;
}) {
  const { id, etiqueta, opcional, tipo = "text", autoComplete, valor, error, ayuda, className = "", onChange } = props;
  const descripcion = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold">
        {etiqueta}
        {opcional && <span className="font-normal text-suave"> (opcional)</span>}
      </label>
      <input
        id={id}
        type={tipo}
        autoComplete={autoComplete}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={descripcion}
        className={`mt-1.5 h-12 w-full rounded-lg border bg-tarjeta px-3 text-base outline-none focus:border-tinta focus:shadow-[0_0_0_3px_rgba(242,183,5,0.35)] ${
          error ? "border-error" : "border-borde"
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="mt-1.5 text-xs text-suave">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}
