"use client";

import { useId, useState, type ComponentProps, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { coincide } from "@/lib/texto";

export type ComboboxOption = { value: string; label: string; detail?: string };

type ComboboxProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  options: ComboboxOption[];
  /** value de la opción elegida; "" si no hay ninguna */
  value: string;
  onChange: (value: string) => void;
  emptyText?: string;
};

/**
 * Campo para escribir, filtrar y elegir una opción de la lista.
 * Se etiqueta con <label htmlFor={id}>; los demás props van al <input>.
 */
export default function Combobox({
  options,
  value,
  onChange,
  emptyText = "Sin resultados",
  id,
  className = "form-input",
  ...rest
}: ComboboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-opciones`;

  // null mientras no se escribe: el campo muestra la opción elegida
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const chosen = options.find((o) => o.value === value);
  const results = query === null ? options : options.filter((o) => coincide(o.label, query));
  const current = open ? results[active] : undefined;
  const chosenIndex = results.findIndex((o) => o.value === value);

  const abrir = (index: number) => {
    setOpen(true);
    setActive(index);
  };
  const cerrar = () => {
    setOpen(false);
    setQuery(null);
  };
  const elegir = (o: ComboboxOption) => {
    onChange(o.value);
    cerrar();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const last = results.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) abrir(chosenIndex >= 0 ? chosenIndex : 0);
        else setActive(Math.min(active + 1, last));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) abrir(chosenIndex >= 0 ? chosenIndex : last);
        else setActive(Math.max(active - 1, 0));
        break;
      case "Enter":
        if (current) {
          e.preventDefault();
          elegir(current);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          cerrar();
        }
        break;
      case "Tab":
        if (current) elegir(current);
        break;
    }
  };

  return (
    <div className="combobox" data-open={open || undefined}>
      <input
        {...rest}
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-activedescendant={current ? `${listId}-${active}` : undefined}
        className={className}
        value={query ?? chosen?.label ?? ""}
        onChange={(e) => {
          const text = e.target.value;
          setQuery(text);
          abrir(text.trim() ? 0 : -1);
          // borrar el texto quita la selección
          if (!text.trim() && value) onChange("");
        }}
        onKeyDown={onKeyDown}
        onMouseDown={() => !open && abrir(chosenIndex)}
        onBlur={cerrar}
      />
      <ChevronDown className="combobox-chevron" aria-hidden="true" />

      {open &&
        (results.length > 0 ? (
          // mousedown sin default: el foco se queda en el campo al hacer clic en la lista
          <ul id={listId} role="listbox" className="combobox-list" onMouseDown={(e) => e.preventDefault()}>
            {results.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                data-chosen={o.value === value || undefined}
                className="combobox-option"
                ref={i === active ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                onMouseMove={() => i !== active && setActive(i)}
                onClick={(e) => {
                  e.preventDefault(); // dentro de un <label> no reenvía el clic al campo
                  elegir(o);
                }}
              >
                <Check aria-hidden="true" />
                <span>{o.label}</span>
                {o.detail && <span className="combobox-detail">{o.detail}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="combobox-empty" role="status">
            {emptyText}
          </p>
        ))}
    </div>
  );
}
