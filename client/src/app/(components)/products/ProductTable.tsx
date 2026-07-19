"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import StatusBadge from "@/app/(components)/StatusBadge";
import { getActiveUnitCount } from "@/lib/inventory/metal-stats";
import { getProductCoverFromItem } from "@/lib/inventory/product-images";
import type { InventoryItem, ProductCollection } from "@/lib/types";

const fieldClass = "input-field w-full px-2 py-1.5 text-sm min-w-[8rem]";

type ProductTableProps = {
  products: InventoryItem[];
  collections: ProductCollection[];
  canWrite: boolean;
  assigningProductId?: string | null;
  onCollectionChange?: (productId: string, collectionId: string | null) => void;
};

function ProductThumb({ product }: { product: InventoryItem }) {
  const coverUrl = getProductCoverFromItem(product);
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt=""
        className="h-10 w-10 rounded-md object-cover border border-zinc-200"
      />
    );
  }
  return (
    <div
      className="h-10 w-10 rounded-md border border-zinc-200"
      style={{ backgroundColor: product.imageColor }}
      aria-hidden
    />
  );
}

export default function ProductTable({
  products,
  collections,
  canWrite,
  assigningProductId,
  onCollectionChange,
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-zinc-500">No products found.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500">
            <th className="p-3 w-14" />
            <th className="p-3">SKU</th>
            <th className="p-3">Name</th>
            <th className="p-3">Category</th>
            <th className="p-3">Collection</th>
            <th className="p-3">Metal</th>
            <th className="p-3">Purity</th>
            <th className="p-3">Units</th>
            <th className="p-3">Status</th>
            {canWrite && <th className="p-3 w-16" />}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const unitCount = getActiveUnitCount(product);
            const isAssigning = assigningProductId === product.id;

            return (
              <tr key={product.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="p-3">
                  <ProductThumb product={product} />
                </td>
                <td className="p-3 font-mono text-xs text-zinc-500">{product.sku}</td>
                <td className="p-3 font-medium text-zinc-900">{product.name}</td>
                <td className="p-3 text-zinc-600">{product.category}</td>
                <td className="p-3">
                  {canWrite && onCollectionChange ? (
                    <select
                      className={fieldClass}
                      value={product.productCollectionId ?? ""}
                      disabled={isAssigning}
                      onChange={(e) =>
                        onCollectionChange(
                          product.id,
                          e.target.value ? e.target.value : null,
                        )
                      }
                    >
                      <option value="">No collection</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-zinc-600">
                      {product.productCollectionName ?? "—"}
                    </span>
                  )}
                </td>
                <td className="p-3 text-zinc-600">{product.metal}</td>
                <td className="p-3 text-zinc-600">{product.purity}</td>
                <td className="p-3 text-zinc-600">{unitCount}</td>
                <td className="p-3">
                  <StatusBadge status={product.status} />
                </td>
                {canWrite && (
                  <td className="p-3">
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="inline-flex items-center justify-center rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                      aria-label={`Edit ${product.name}`}
                    >
                      <Pencil size={15} />
                    </Link>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
