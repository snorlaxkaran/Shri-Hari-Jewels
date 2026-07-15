"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { formatStorePrice } from "@/lib/api/storefront";
import { useStorefrontCart } from "@/lib/storefront/cart-context";
import { useStorefrontConfig } from "../(components)/StorefrontConfigProvider";

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const config = useStorefrontConfig();
  const { items, subtotal, updateQuantity, removeItem } = useStorefrontCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-lg text-zinc-500">Your cart is empty.</p>
        <Link
          href={`/shop/${slug}/products`}
          className="mt-6 inline-block rounded px-6 py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: config.primaryColor }}
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-light" style={{ color: config.accentColor }}>
        Shopping Cart
      </h1>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.productId} className="flex gap-4 rounded-lg border bg-white p-4">
            <div
              className="h-20 w-20 shrink-0 overflow-hidden rounded"
              style={{ backgroundColor: item.imageColor }}
            >
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between sm:flex-row sm:items-center">
              <div>
                <Link
                  href={`/shop/${slug}/products/${item.productId}`}
                  className="font-medium hover:underline"
                  style={{ color: config.accentColor }}
                >
                  {item.name}
                </Link>
                <p className="text-sm text-zinc-500">{formatStorePrice(item.price)} each</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center rounded border text-sm">
                  <button type="button" className="px-2 py-1" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>−</button>
                  <span className="px-3">{item.quantity}</span>
                  <button type="button" className="px-2 py-1" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
                </div>
                <p className="w-24 text-right font-semibold" style={{ color: config.primaryColor }}>
                  {formatStorePrice(item.price * item.quantity)}
                </p>
                <button type="button" onClick={() => removeItem(item.productId)} className="text-xs text-red-500 hover:underline">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border bg-white p-6">
        <div className="flex justify-between text-lg font-semibold">
          <span>Subtotal</span>
          <span style={{ color: config.primaryColor }}>{formatStorePrice(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">Shipping and taxes calculated at checkout.</p>
        <Link
          href={`/shop/${slug}/checkout`}
          className="mt-6 block w-full rounded py-3 text-center text-sm font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: config.primaryColor }}
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
