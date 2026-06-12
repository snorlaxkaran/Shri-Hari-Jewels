type FilterPillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

export default function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-zinc-900 text-white"
          : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      {label}
    </button>
  );
}
