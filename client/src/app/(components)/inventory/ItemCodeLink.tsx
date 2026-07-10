import Link from "next/link";

type ItemCodeLinkProps = {
  itemCode: string;
  className?: string;
};

export default function ItemCodeLink({ itemCode, className = "" }: ItemCodeLinkProps) {
  return (
    <Link
      href={`/inventory/item/${encodeURIComponent(itemCode)}`}
      className={`font-mono text-blue-700 hover:text-blue-900 hover:underline ${className}`.trim()}
    >
      {itemCode}
    </Link>
  );
}
