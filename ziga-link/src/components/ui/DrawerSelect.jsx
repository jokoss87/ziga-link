import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * Remplacement mobile-friendly des <select> natifs.
 * Ouvre un drawer depuis le bas avec les options.
 */
export default function DrawerSelect({ value, onChange, placeholder, options, className = "", hasError = false }) {
  const [open, setOpen] = useState(false);

  const selected = options.find(o => o.value === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full h-10 px-3 pr-8 rounded-md border bg-white text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-amber-300 ${
          hasError ? "border-red-400 bg-red-50 ring-1 ring-red-300" : "border-amber-200"
        } ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "text-stone-800" : "text-stone-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-t-3xl z-10 pb-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-stone-200 rounded-full" />
            </div>
            {placeholder && (
              <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide px-5 pb-2">{placeholder}</p>
            )}
            <div className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-stone-700 active:bg-stone-50 border-b border-stone-50 last:border-0"
                >
                  <span>{opt.label}</span>
                  {value === opt.value && <Check className="w-4 h-4 text-teal-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}