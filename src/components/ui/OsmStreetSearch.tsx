import { useEffect, useRef, useState } from "react";

interface OsmStreetSearchProps {
  value?: string | null;
  onChange: (value: string) => void;
  onCoordinates?: (lat: number, lon: number) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

interface OsmSuggestion {
  lat: string;
  lon: string;
  display_name: string;
}

export default function OsmStreetSearch({
  value,
  onChange,
  onCoordinates,
  placeholder = "Rechercher une adresse…",
  className,
  debounceMs = 350,
}: OsmStreetSearchProps) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<OsmSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || "");
    if (value) setSelected(value);
  }, [value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (!q || q === selected) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=cm&limit=6`
        );
        const data = (await res.json()) as OsmSuggestion[];
        if (Array.isArray(data)) {
          setResults(data);
          setOpen(true);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, selected, debounceMs]);

  const pick = (s: OsmSuggestion) => {
    setSelected(s.display_name);
    setQuery(s.display_name);
    setOpen(false);
    onChange(s.display_name);
    onCoordinates?.(Number(s.lat), Number(s.lon));
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value !== selected) setSelected(null);
        }}
        onFocus={() => {
          if (results.length > 0 && query.trim() !== selected) setOpen(true);
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <i className="ph ph-spinner animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400" />
      )}
      {open && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-3 text-[12px] text-gray-400 italic">Aucun résultat pour « {query.trim()} »</div>
          ) : (
            results.map((s, i) => (
              <button
                type="button"
                key={i}
                onClick={() => pick(s)}
                className="w-full text-left px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-orange-50 transition-colors"
              >
                <div className="text-[12.5px] font-semibold text-gray-800 truncate">{s.display_name.split(",")[0]}</div>
                <div className="text-[11px] text-gray-400 truncate">{s.display_name.split(",").slice(1).join(",")}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}