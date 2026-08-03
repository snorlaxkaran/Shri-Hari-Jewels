"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { formatStorePrice } from "@/lib/api/storefront";
import { useStorefrontCart } from "@/lib/storefront/cart-context";

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const { items, subtotal, updateQuantity, removeItem } = useStorefrontCart();

  if (items.length === 0) {
    return (
      <div className="sf-empty">
        <p className="sf-empty-title">Your bag is empty</p>
        <p className="sf-empty-desc">Discover hallmarked pieces crafted for every occasion.</p>
        <Link href={`/shop/${slug}/products`} className="sf-btn sf-btn-primary mt-6">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="sf-section">
      <div className="sf-shell max-w-4xl mx-auto">
        <h1 className="sf-display sf-page-title">Shopping bag</h1>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="sf-cart-item">
              <div className="sf-cart-thumb" style={{ backgroundColor: item.imageColor }}>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.name} />
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <Link href={`/shop/${slug}/products/${item.productId}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-sm text-[var(--sf-muted)]">{formatStorePrice(item.price)} each</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="sf-qty-control">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.productId, Math.min(item.maxStock, item.quantity + 1))
                      }
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-24 text-right font-semibold">{formatStorePrice(item.price * item.quantity)}</p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sf-summary-card mt-8">
          <div className="flex justify-between text-lg font-semibold">
            <span>Subtotal</span>
            <span>{formatStorePrice(subtotal)}</span>
          </div>
          <p className="mt-2 text-xs text-[var(--sf-muted)]">Shipping &amp; taxes confirmed at checkout.</p>
          <Link href={`/shop/${slug}/checkout`} className="sf-btn sf-btn-primary sf-btn-block mt-6">
            Proceed to checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
