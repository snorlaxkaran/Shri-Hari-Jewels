"use client";

import { Gem, Minus, Plus } from "lucide-react";
import type { DesignElementType } from "@/lib/types";

const TYPE_COLORS: Record<DesignElementType, string> = {
  Motif: "#6366f1",
  Stone: "#ec4899",
  Casting: "#f59e0b",
};

type MotifCardProps = {
  name: string;
  type?: DesignElementType;
  price?: number;
  imageUrl?: string;
  subtitle?: string;
  quantity?: number;
  onQuantityChange?: (qty: number) => void;
  disabled?: boolean;
};

export default function MotifCard({
  name,
  type = "Motif",
  price,
  imageUrl,
  subtitle,
  quantity = 0,
  onQuantityChange,
  disabled = false,
}: MotifCardProps) {
  const color = TYPE_COLORS[type];
  const selected = quantity > 0;

  const changeQty = (delta: number) => {
    if (disabled || !onQuantityChange) return;
    onQuantityChange(Math.max(0, quantity + delta));
  };

  return (
    <div
      className={`surface-card flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all w-full max-w-[200px] ${
        selected
          ? "border-blue-500 ring-2 ring-blue-100"
          : "border-zinc-200"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <div
        className="aspect-[4/3] flex items-center justify-center relative bg-zinc-100"
        style={
          imageUrl
            ? undefined
            : {
                background: `linear-gradient(135deg, ${color}18 0%, ${color}30 100%)`,
              }
        }
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Gem size={32} strokeWidth={1.2} style={{ color }} />
        )}
        {selected && (
          <span className="absolute top-2 right-2 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
            {quantity}
          </span>
        )}
      </div>
      <div className="px-3 py-3 border-t border-zinc-100">
        <p className="text-sm font-medium text-zinc-900 truncate">{name}</p>
        {subtitle && (
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{subtitle}</p>
        )}
        <p className="text-xs text-zinc-500 mt-0.5">
          {price != null ? `₹${price.toLocaleString("en-IN")}` : "Price"}
          {price != null && quantity > 1 && (
            <span className="text-zinc-400">
              {" "}
              · ₹{(price * quantity).toLocaleString("en-IN")} total
            </span>
          )}
        </p>

        {onQuantityChange && (
          <div className="flex items-center gap-2 mt-2.5">
            <button
              type="button"
              disabled={disabled || quantity === 0}
              onClick={() => changeQty(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={`Decrease ${name} quantity`}
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              min={0}
              value={quantity}
              disabled={disabled}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                onQuantityChange(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
              }}
              className="input-field h-7 w-12 px-1 text-center text-sm"
              aria-label={`${name} quantity`}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeQty(1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={`Increase ${name} quantity`}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
