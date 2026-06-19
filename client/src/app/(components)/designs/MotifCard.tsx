"use client";

import { Gem } from "lucide-react";
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
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

export default function MotifCard({
  name,
  type = "Motif",
  price,
  imageUrl,
  subtitle,
  selected = false,
  onClick,
  disabled = false,
}: MotifCardProps) {
  const color = TYPE_COLORS[type];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`surface-card flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all w-full max-w-[200px] ${
        selected
          ? "border-blue-500 ring-2 ring-blue-100"
          : "border-zinc-200 hover:border-zinc-300"
      } ${disabled ? "opacity-60 cursor-default" : "cursor-pointer"}`}
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
      </div>
      <div className="px-3 py-3 border-t border-zinc-100">
        <p className="text-sm font-medium text-zinc-900 truncate">{name}</p>
        {subtitle && (
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{subtitle}</p>
        )}
        <p className="text-xs text-zinc-500 mt-0.5">
          {price != null ? `₹${price.toLocaleString("en-IN")}` : "Price"}
        </p>
      </div>
    </button>
  );
}
