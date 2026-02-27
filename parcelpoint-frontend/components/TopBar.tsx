"use client";

import { LogOut } from "lucide-react";

interface TopBarProps {
  onLogout?: () => void;
}

export default function TopBar({ onLogout }: TopBarProps) {
  return (
    <header
      className="w-full sticky top-0 z-50"
      style={{
        backgroundColor: "#1a2332",
        borderBottom: "1px solid #2c3a52",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          
          <span
            className="text-lg font-bold tracking-wide"
            style={{ color: "#f1f5f9", letterSpacing: "0.06em" }}
          >
            PARCEL <span style={{ color: "#f97316" }}>HUB</span>
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80"
          style={{ color: "#94a3b8" }}
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">log out</span>
        </button>
      </div>
    </header>
  );
}
