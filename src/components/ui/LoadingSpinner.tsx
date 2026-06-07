export default function LoadingSpinner({ minHeight = "60vh" }: { minHeight?: string }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      <div className="w-11 h-11 rounded-full border-[3px] border-gray-200 border-t-primary animate-spin" />
    </div>
  );
}
