"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { getApiErrorMessage } from "@/lib/api/client";
import { openInvoicePdf } from "@/lib/api/invoices";
import { lookupSaleUnit, recordCartSale } from "@/lib/api/sales";
import { useCustomers } from "@/lib/customers/customers-context";
import { useInventory } from "@/lib/inventory/inventory-context";
import { useSales } from "@/lib/sales/sales-context";
import type {
  CartLineItem,
  PaymentMode,
  RecordCartSaleResult,
  RecordSaleResult,
  Sale,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  cancelPendingSale,
  confirmSalePayment,
  pollSaleStatus,
} from "@/lib/api/sales";

const UpiPaymentModal = dynamic(
  () => import("@/app/(components)/UpiPaymentModal"),
  { ssr: false },
);

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";
const PAYMENT_MODES: PaymentMode[] = ["Cash", "UPI", "Card"];

export default function SalesPage() {
  const { customers, refresh: refreshCustomers } = useCustomers();
  const { refresh: refreshInventory, markUnitsSold, markUnitsReserved, markUnitsAvailable } =
    useInventory();
  const {
    analytics,
    hydrated,
    loading,
    error,
    refresh: refreshSales,
  } = useSales();

  const [itemCode, setItemCode] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [pendingSale, setPendingSale] = useState<Sale | null>(null);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingItemSummary, setPendingItemSummary] = useState("");
  const [upiQrString, setUpiQrString] = useState("");
  const [upiQrImageUrl, setUpiQrImageUrl] = useState("");
  const [upiAutoCapture, setUpiAutoCapture] = useState(false);
  const [pendingPrimarySaleId, setPendingPrimarySaleId] = useState("");

  const cartTotal = cart.reduce((sum, item) => sum + item.dealPrice, 0);

  const updateCartItem = (code: string, patch: Partial<CartLineItem>) => {
    setCart((prev) =>
      prev.map((item) => (item.itemCode === code ? { ...item, ...patch } : item)),
    );
  };

  const handleLookup = useCallback(async () => {
    const trimmed = itemCode.trim();
    if (!trimmed) return;

    if (cart.some((i) => i.itemCode === trimmed)) {
      setLookupError("This item is already in the cart.");
      return;
    }

    setLookingUp(true);
    setLookupError("");
    try {
      const result = await lookupSaleUnit(trimmed);
      setCart((prev) => [
        ...prev,
        { ...result, discount: 0, dealPrice: result.listPrice },
      ]);
      setItemCode("");
    } catch (err) {
      setLookupError(getApiErrorMessage(err, "Could not find that item code."));
    } finally {
      setLookingUp(false);
    }
  }, [itemCode, cart]);

  const removeFromCart = (code: string) => {
    setCart((prev) => prev.filter((i) => i.itemCode !== code));
  };

  const resetCheckout = () => {
    setCart([]);
    setCustomerId("");
    setPaymentMode("Cash");
    setFormError("");
  };

  const openInvoices = async (invoices: { id: string; invoiceNo: string }[]) => {
    for (const inv of invoices) {
      await openInvoicePdf(inv.id, `${inv.invoiceNo}.pdf`);
    }
  };

  const finishCartSale = async (
    result: RecordCartSaleResult,
    soldItemCodes: string[],
  ) => {
    markUnitsSold(soldItemCodes);
    await refreshInventory({ silent: true });
    await refreshCustomers();
    await refreshSales();
    setUpiModalOpen(false);
    setPendingSale(null);
    setPendingTotal(0);
    setPendingItemSummary("");
    setUpiQrString("");
    setUpiQrImageUrl("");
    setUpiAutoCapture(false);
    setPendingPrimarySaleId("");

    const invoices = result.invoices ?? [];
    if (invoices.length > 0) {
      setSuccessMessage(
        `Sale complete — ${invoices.length} invoice${invoices.length > 1 ? "s" : ""} generated.`,
      );
      await openInvoices(invoices);
    } else {
      setSuccessMessage(`Sold ${result.sales.length} item(s) successfully.`);
    }
    resetCheckout();
    setTimeout(() => setSuccessMessage(""), 6000);
  };

  const finalizeUpiPayment = async (
    result: RecordSaleResult | RecordCartSaleResult,
  ): Promise<boolean> => {
    if ("sales" in result && Array.isArray(result.sales)) {
      if (result.sales.every((s) => s.paymentStatus === "Completed")) {
        await finishCartSale(
          result,
          result.sales.map((sale) => sale.itemCode),
        );
        return true;
      }
      return false;
    }

    if ("sale" in result && result.sale.paymentStatus === "Completed") {
      await finishCartSale(
        {
          sales: [result.sale],
          invoices: result.invoice ? [result.invoice] : [],
          total: result.sale.dealPrice,
          requiresConfirmation: false,
          autoCapture: result.autoCapture,
        },
        [result.sale.itemCode],
      );
      return true;
    }

    return false;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (cart.length === 0) {
      setFormError("Add at least one item to the cart.");
      return;
    }
    if (!customerId) {
      setFormError("Select a customer.");
      return;
    }

    setSubmitting(true);
    const cartItemCodes = cart.map((item) => item.itemCode);
    try {
      const result = await recordCartSale({
        customerId,
        paymentMode,
        items: cart.map((item) => ({
          itemCode: item.itemCode,
          dealPrice: item.dealPrice,
          discount: item.discount,
        })),
      });

      if (
        result.requiresConfirmation &&
        (result.upiQrString || result.upiQrImageUrl)
      ) {
        const primary = result.sales[0];
        setPendingSale(primary);
        setPendingPrimarySaleId(result.primarySaleId ?? primary.id);
        setPendingTotal(result.total);
        setPendingItemSummary(
          result.sales.map((s) => s.itemCode).join(", "),
        );
        setUpiQrString(result.upiQrString ?? "");
        setUpiQrImageUrl(result.upiQrImageUrl ?? "");
        setUpiAutoCapture(result.autoCapture);
        setUpiModalOpen(true);
        markUnitsReserved(cartItemCodes);
        setCart([]);
        setCustomerId("");
        return;
      }

      await finishCartSale(result, cartItemCodes);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpiPaid = async () => {
    const result = await pollSaleStatus(pendingPrimarySaleId);
    await finalizeUpiPayment(result);
  };

  const handleUpiConfirm = async (paymentRef?: string) => {
    if (!pendingPrimarySaleId) {
      throw new Error("No pending sale to confirm.");
    }

    const confirmed = await confirmSalePayment(
      pendingPrimarySaleId,
      paymentRef,
    );
    if (await finalizeUpiPayment(confirmed)) return;

    const polled = await pollSaleStatus(pendingPrimarySaleId);
    if (await finalizeUpiPayment(polled)) return;

    throw new Error("Payment could not be confirmed. Please try again.");
  };

  const handleUpiCancel = async () => {
    if (!pendingPrimarySaleId) return;
    await cancelPendingSale(pendingPrimarySaleId);
    if (pendingItemSummary) {
      markUnitsAvailable(
        pendingItemSummary.split(",").map((code) => code.trim()).filter(Boolean),
      );
    }
    await refreshInventory({ silent: true });
    await refreshSales();
    setUpiModalOpen(false);
    setPendingSale(null);
    setPendingPrimarySaleId("");
  };

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Record Sale"
        subtitle="POS — add items to cart and checkout"
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-emerald-200 bg-emerald-50 text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="surface-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <ShoppingCart size={16} /> Add to Cart
            </h2>
            <div>
              <label className={labelClass}>Item code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={itemCode}
                  onChange={(e) => {
                    setItemCode(e.target.value);
                    setLookupError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLookup();
                    }
                  }}
                  placeholder="e.g. ER-26-0001-001"
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={lookingUp || !itemCode.trim()}
                  className="btn-secondary px-4 py-2 text-sm whitespace-nowrap disabled:opacity-50"
                >
                  {lookingUp ? "Looking…" : "Add"}
                </button>
              </div>
              {lookupError && <p className="text-xs text-red-500 mt-1">{lookupError}</p>}
            </div>
          </div>

          <form onSubmit={handleCheckout} className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">
                Cart ({cart.length})
              </h2>
              {cart.length > 0 && (
                <p className="text-sm font-semibold text-zinc-900">
                  {formatCurrency(cartTotal)}
                </p>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">
                Scan or enter item codes to build the cart.
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.itemCode} className="rounded-lg border border-zinc-200 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{item.productName}</p>
                        <p className="text-xs font-mono text-zinc-500">{item.itemCode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.itemCode)}
                        className="p-1 text-zinc-400 hover:text-red-500"
                        aria-label="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>Discount (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.discount}
                          onChange={(e) => {
                            const discount = parseFloat(e.target.value) || 0;
                            updateCartItem(item.itemCode, {
                              discount,
                              dealPrice: Math.max(0, item.listPrice - discount),
                            });
                          }}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Deal price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.dealPrice}
                          onChange={(e) => {
                            const dealPrice = parseFloat(e.target.value) || 0;
                            updateCartItem(item.itemCode, {
                              dealPrice,
                              discount: Math.max(0, item.listPrice - dealPrice),
                            });
                          }}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className={labelClass}>Customer *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.mobile}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Payment mode *</label>
              <div className="flex gap-2">
                {PAYMENT_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`flex-1 tab-btn ${
                      paymentMode === mode ? "tab-btn-active" : "tab-btn-inactive"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}

            <button
              type="submit"
              disabled={submitting || cart.length === 0 || !customerId}
              className="btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {submitting
                ? "Processing…"
                : paymentMode === "UPI"
                  ? `Pay ${formatCurrency(cartTotal)} via UPI`
                  : `Complete sale · ${formatCurrency(cartTotal)}`}
            </button>
          </form>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200">
            <h2 className="text-sm font-semibold text-zinc-900">Recent sales</h2>
          </div>
          {!analytics?.recentSales.length ? (
            <p className="px-5 py-8 text-sm text-zinc-400 text-center">No sales recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500">
                    <th className="text-left px-5 py-3 font-medium">Item</th>
                    <th className="text-left px-5 py-3 font-medium">Customer</th>
                    <th className="text-left px-5 py-3 font-medium">Deal</th>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentSales.map((sale) => (
                    <tr key={sale.id} className="border-t border-zinc-100 text-zinc-900">
                      <td className="px-5 py-3">
                        <p className="font-mono text-xs">{sale.itemCode}</p>
                        <p className="text-xs text-zinc-500">{sale.productName}</p>
                      </td>
                      <td className="px-5 py-3">{sale.customerName ?? sale.customerPhone}</td>
                      <td className="px-5 py-3 font-medium">{formatCurrency(sale.dealPrice)}</td>
                      <td className="px-5 py-3 text-zinc-500">{formatDate(sale.soldAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {pendingSale && (
        <UpiPaymentModal
          open={upiModalOpen}
          sale={pendingSale}
          totalAmount={pendingTotal}
          itemSummary={pendingItemSummary}
          upiQrString={upiQrString || undefined}
          upiQrImageUrl={upiQrImageUrl || undefined}
          autoCapture={upiAutoCapture}
          pollSaleId={pendingPrimarySaleId}
          onClose={() => setUpiModalOpen(false)}
          onPaid={handleUpiPaid}
          onConfirm={handleUpiConfirm}
          onCancel={handleUpiCancel}
        />
      )}
    </div>
  );
}
