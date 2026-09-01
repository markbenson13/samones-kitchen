"use client";

import { useEffect, useRef, useState } from "react";

export function Combobox({
  name,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // If the current value is already an exact match (e.g. a pre-filled
  // default like "Amina", or after picking an option), show every option
  // instead of narrowing to just that one — the user is reconsidering a
  // made choice here, not actively searching.
  const isExactMatch = options.some(
    (option) => option.toLowerCase() === value.trim().toLowerCase()
  );
  const filtered = isExactMatch
    ? options
    : options.filter((option) =>
        option.toLowerCase().includes(value.trim().toLowerCase())
      );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectOption(option: string) {
    onChange(option);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input suppressHydrationWarning
        name={name}
        type="text"
        required={required}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlighted(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && filtered[highlighted]) {
            e.preventDefault();
            selectOption(filtered[highlighted]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-brand-tan bg-white text-sm shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-brand-brown-light">
              No matches — this will be added as new
            </li>
          ) : (
            filtered.map((option, i) => (
              <li key={option}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(option)}
                  className={`block w-full px-3 py-2 text-left ${
                    i === highlighted
                      ? "bg-brand-cream text-brand-red"
                      : "text-brand-brown"
                  } hover:bg-brand-cream hover:text-brand-red`}
                >
                  {option}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
