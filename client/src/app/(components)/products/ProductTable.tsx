"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import StatusBadge from "@/app/(components)/StatusBadge";
import ViewOnWebsiteLink from "@/app/(components)/products/ViewOnWebsiteLink";
import { getActiveUnitCount } from "@/lib/inventory/metal-stats";
import { getProductCoverFromItem } from "@/lib/inventory/product-images";
import type { InventoryItem } from "@/lib/types";

type ProductTableProps = {
  products: InventoryItem[];
  canWrite: boolean;
  canToggleStorefront?: boolean;
  storeSlug?: string | null;
  isPublished?: (productId: string) => boolean;
  onTogglePublished?: (productId: string, published: boolean) => void | Promise<void>;
  publishingProductId?: string | null;
};

function ProductThumb({ product }: { product: InventoryItem }) {
  const coverUrl = getProductCoverFromItem(product);
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={coverUrl} alt="" className="product-thumb-img" />
    );
  }
  return (
    <div
      className="product-thumb-placeholder"
      style={{ backgroundColor: product.imageColor }}
      aria-hidden
    />
  );
}

export default function ProductTable({
  products,
  canWrite,
  canToggleStorefront = false,
  storeSlug,
  isPublished,
  onTogglePublished,
  publishingProductId,
}: ProductTableProps) {
  if (products.length === 0) {
    return <p className="list-empty-state">No products found.</p>;
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="col-photo" aria-label="Photo" />
            <th>SKU</th>
            <th>Name</th>
            <th>Category</th>
            <th>Collection</th>
            <th>Metal</th>
            <th>Purity</th>
            <th>Units</th>
            <th>Status</th>
            {canToggleStorefront && <th>Storefront</th>}
            <th>Website</th>
            {canWrite && <th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const unitCount = getActiveUnitCount(product);
            return (
              <tr key={product.id}>
                <td className="col-photo">
                  <ProductThumb product={product} />
                </td>
                <td className="tabular-nums text-muted">{product.sku}</td>
                <td className="font-medium">{product.name}</td>
                <td>{product.category}</td>
                <td>{product.productCollectionName ?? "—"}</td>
                <td>{product.metal}</td>
                <td>{product.purity}</td>
                <td className="tabular-nums">{unitCount}</td>
                <td>
                  <StatusBadge status={product.status} />
                </td>
                {canToggleStorefront && onTogglePublished && isPublished && (
                  <td>
                    <button
                      type="button"
                      disabled={publishingProductId === product.id}
                      onClick={() =>
                        void onTogglePublished(product.id, !isPublished(product.id))
                      }
                      className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                        isPublished(product.id)
                          ? "bg-green-100 text-green-800"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {publishingProductId === product.id
                        ? "Saving…"
                        : isPublished(product.id)
                          ? "Live"
                          : "Draft"}
                    </button>
                  </td>
                )}
                <td>
                  {isPublished ? (
                    <ViewOnWebsiteLink
                      productId={product.id}
                      slug={storeSlug}
                      published={isPublished(product.id)}
                    />
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
                {canWrite && (
                  <td>
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="table-action-link"
                      aria-label={`Edit ${product.name}`}
                    >
                      <Pencil size={14} />
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
