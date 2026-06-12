type FilterPillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

export default function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`tab-btn ${active ? "tab-btn-active" : "tab-btn-inactive"}`}
    >
      {label}
    </button>
  );
}
