import { bisCareHuidUrl } from "@/lib/hallmark/bis-care";

type HuidLinkProps = {
  huid: string;
  className?: string;
};

export default function HuidLink({ huid, className }: HuidLinkProps) {
  const trimmed = huid.trim();
  if (!trimmed) {
    return <span className="text-zinc-400">—</span>;
  }

  return (
    <a
      href={bisCareHuidUrl(trimmed)}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "font-mono text-xs text-blue-600 hover:underline"}
    >
      {trimmed} ↗
    </a>
  );
}
