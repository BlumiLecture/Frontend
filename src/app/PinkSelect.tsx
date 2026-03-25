import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type PinkSelectOption<T extends string> = { value: T; label: string };

export function PinkSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className = "",
}: {
  value: T | null;
  onChange: (v: T) => void;
  options: Array<PinkSelectOption<T>>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options.find((o) => o.value === value) || null, [options, value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2.5 rounded-2xl border-2 border-blumi-light-pink focus:border-blumi-pink bg-white text-gray-700 font-semibold outline-none cursor-pointer hover:bg-blumi-light-pink/40 transition-colors flex items-center justify-between gap-3 disabled:opacity-60"
        aria-label="Seleccionar opción"
      >
        <span className={selected ? "text-gray-700" : "text-slate-400"}>{selected?.label || placeholder || "Seleccionar"}</span>
        <ChevronDown className={`w-5 h-5 text-blumi-pink transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-white border-2 border-blumi-light-pink rounded-2xl soft-shadow overflow-hidden z-50">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 font-semibold transition-colors cursor-pointer ${
                  active ? "bg-blumi-pink/15 text-blumi-dark-pink" : "hover:bg-blumi-pink/10 text-slate-700"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

