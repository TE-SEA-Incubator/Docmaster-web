interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
  bgColor?: string;
}

export default function StatCard({ icon, label, value, color = "#F5A64B", bgColor = "#FEF0DC" }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ background: bgColor, color }}
        >
          <i className={`fa-solid ${icon}`} />
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-black text-gray-900 mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}
