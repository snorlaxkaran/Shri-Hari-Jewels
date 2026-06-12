"use client";

import { Bell, Menu, Search, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type NavbarProps = {
  onMenuClick: () => void;
};

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className="flex justify-between items-center w-full mb-6">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-2 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search products, collections…"
            className="input-field pl-9 pr-4 py-2 text-sm w-52 md:w-80 transition-all duration-150"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="hidden md:flex items-center gap-1">
          <button
            className="relative p-2 rounded-lg text-zinc-500 hover:bg-white hover:text-zinc-900 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[10px] font-semibold rounded-full bg-zinc-900 text-white">
              3
            </span>
          </button>

          <div className="h-6 w-px bg-zinc-200 mx-2" />

          <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white transition-colors">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-zinc-900 text-white">
              K
            </div>
            <span className="text-sm font-medium text-zinc-900">Karan</span>
          </button>
        </div>

        <Link href="/settings">
          <button
            className="p-2 rounded-lg text-zinc-500 hover:bg-white hover:text-zinc-900 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </Link>

        <button
          className="relative p-2 rounded-lg text-zinc-500 hover:bg-white transition-colors md:hidden"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[10px] font-semibold rounded-full bg-zinc-900 text-white">
            3
          </span>
        </button>
      </div>
    </div>
  );
};

export default Navbar;
