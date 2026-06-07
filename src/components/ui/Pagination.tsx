interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export default function Pagination({ current, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(totalPages, current + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <span className="text-[11px] font-medium text-gray-400">
        {total} résultat{total > 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={current === 1}
          onClick={() => onChange(current - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <i className="fa-solid fa-chevron-left text-[10px]" />
        </button>
        {start > 1 && (
          <>
            <button onClick={() => onChange(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all">1</button>
            {start > 2 && <span className="px-1 text-gray-300 text-xs">...</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
              p === current
                ? "bg-primary text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-gray-300 text-xs">...</span>}
            <button onClick={() => onChange(totalPages)} className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all">{totalPages}</button>
          </>
        )}
        <button
          disabled={current === totalPages}
          onClick={() => onChange(current + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <i className="fa-solid fa-chevron-right text-[10px]" />
        </button>
      </div>
    </div>
  );
}
