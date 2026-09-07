"use client";


import { useState } from "react";
import { SYMBOLS } from "@/lib/universe";



export default function AddSymbolBar({
  existingSymbols,
  onAdd,
}: {
  existingSymbols: string[];
  onAdd: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);


  const available = SYMBOLS.filter((s) => !existingSymbols.includes(s.symbol));
  const matches = available.filter(
    (s) => s.symbol.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase())
  );


  if (available.length === 0) {
    return <p className="text-xs text-inkMuted">Every symbol in the demo universe is on this list.</p>;
  }


  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search to add..."
        className="text-sm border border-border rounded-pill px-3 py-1.5 bg-surface outline-none focus:border-brand w-44"
      />
      {open && matches.length > 0 && (
        <div className="absolute right-0 mt-1 w-64 bg-surface border border-border rounded-card shadow-row z-10 max-h-56 overflow-y-auto">
          {matches.map((s) => (
            <button
              key={s.symbol}
              onMouseDown={() => {
                onAdd(s.symbol);
                setQuery("");
              }}
              className="w-full text-left px-3 py-2 hover:bg-surfaceMuted text-sm"
            >
              <span className="font-medium text-ink">{s.symbol}</span>
              <span className="text-inkMuted"> · {s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
