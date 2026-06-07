interface EmptyStateProps {
  icon?: string;
  message: string;
  colSpan?: number;
}

export default function EmptyState({ icon = "fa-solid fa-inbox", message, colSpan }: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center py-16 text-gray-300">
      <i className={`${icon} text-3xl mb-4`} />
      <p className="text-[13px] font-medium text-gray-400">{message}</p>
    </div>
  );

  if (colSpan) {
    return <tr><td colSpan={colSpan} className="text-center">{content}</td></tr>;
  }

  return content;
}
