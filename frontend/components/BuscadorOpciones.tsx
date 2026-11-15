"use client";

// Combo box con buscador (patrón ARIA "combobox" con lista): el usuario escribe, ve las opciones
// que coinciden y elige una con el mouse o con el teclado (flechas, Enter y Escape).
// Busca sin importar mayúsculas ni acentos, y cada palabra escrita debe aparecer en la opción.
import { useId, useState } from "react";

export type Opcion = { id: string; etiqueta: string; detalle?: string };

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default function BuscadorOpciones(props: {
  id: string;
  etiqueta: string;
  placeholder: string;
  opciones: Opcion[];
  valor: string | null; // id de la opción elegida
  error?: string;
  onChange: (id: string | null) => void;
}) {
  const { id, etiqueta, placeholder, opciones, valor, error, onChange } = props;
  const idLista = useId();
  const elegida = opciones.find((o) => o.id === valor);
  const [texto, setTexto] = useState(elegida?.etiqueta ?? "");
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);

  // Mientras la lista está cerrada, el campo muestra la opción elegida.
  const textoVisible = abierto ? texto : (elegida?.etiqueta ?? texto);
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
  const filtradas =
    abierto && texto === elegida?.etiqueta
      ? opciones
      : opciones.filter((o) => {
          const contenido = normalizar(`${o.etiqueta} ${o.detalle ?? ""}`);
          return palabras.every((p) => contenido.includes(p));
        });

  function elegir(opcion: Opcion) {
    setTexto(opcion.etiqueta);
    setAbierto(false);
    onChange(opcion.id);
  }

  function alTeclear(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAbierto(true);
      setActiva((i) => Math.min(i + 1, Math.max(filtradas.length - 1, 0)));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setActiva((i) => Math.max(i - 1, 0));
    } else if (evento.key === "Enter" && abierto) {
      evento.preventDefault();
      if (filtradas[activa]) elegir(filtradas[activa]);
    } else if (evento.key === "Escape") {
      setAbierto(false);
    }
  }

  const idActiva = abierto && filtradas[activa] ? `${id}-opcion-${filtradas[activa].id}` : undefined;

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-semibold">
        {etiqueta}
      </label>
      <div className="relative mt-1.5">
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-suave"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-activedescendant={idActiva}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={placeholder}
          value={textoVisible}
          onFocus={() => {
            setTexto(elegida?.etiqueta ?? texto);
            setActiva(0);
            setAbierto(true);
          }}
          onBlur={() => setAbierto(false)}
          onChange={(e) => {
            setTexto(e.target.value);
            setActiva(0);
            setAbierto(true);
            if (valor) onChange(null); // al escribir de nuevo se quita la elección anterior
          }}
          onKeyDown={alTeclear}
          className={`h-12 w-full rounded-lg border bg-tarjeta pr-3 pl-9 text-base outline-none placeholder:text-suave/70 focus:border-tinta ${
            error ? "border-error" : "border-borde"
          }`}
        />
      </div>

      {abierto && (
        <ul
          id={idLista}
          role="listbox"
          aria-label={etiqueta}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-borde bg-tarjeta py-1 shadow-[0_8px_24px_rgba(17,18,20,0.08)]"
        >
          {filtradas.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-suave">No encontramos ese modelo. Por ahora solo atendemos los de la lista.</li>
          ) : (
            filtradas.map((o, i) => (
              <li
                key={o.id}
                id={`${id}-opcion-${o.id}`}
                role="option"
                aria-selected={o.id === valor}
                // onMouseDown para elegir antes de que el campo pierda el foco
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(o);
                }}
                onMouseEnter={() => setActiva(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 ${
                  i === activa ? "bg-fondo" : ""
                }`}
              >
                <span>
                  <span className="block font-semibold">{o.etiqueta}</span>
                  {o.detalle && <span className="text-[13px] text-suave">{o.detalle}</span>}
                </span>
                {o.id === valor && (
                  <span className="text-sm font-semibold" aria-hidden="true">
                    ✓
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}

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
