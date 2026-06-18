"use client";

import { Plus } from "lucide-react";

type AddMotifCardProps = {
  onClick: () => void;
  label?: string;
};

export default function AddMotifCard({
  onClick,
  label = "New motif",
}: AddMotifCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-xl border-2 border-dashed border-zinc-300 overflow-hidden text-left transition-all w-full max-w-[200px] hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer"
    >
      <div className="aspect-[4/3] flex items-center justify-center bg-zinc-50">
        <Plus size={32} strokeWidth={1.5} className="text-zinc-400" />
      </div>
      <div className="px-3 py-3 border-t border-zinc-200 bg-white">
        <p className="text-sm font-medium text-zinc-600">{label}</p>
        <p className="text-xs text-zinc-400 mt-0.5">Add to library</p>
      </div>
    </button>
  );
}
