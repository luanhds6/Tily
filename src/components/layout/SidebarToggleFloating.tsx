import React from "react";
import { Menu } from "lucide-react";

export function SidebarToggleFloating() {
  return (
    <div className="fixed z-50 top-4 left-4 lg:hidden">
      <button
        className="rounded-full p-2 bg-background border border-border shadow-soft hover:bg-muted"
        onClick={() => window.dispatchEvent(new Event("tily:toggleSidebar"))}
        aria-label="Alternar menu lateral"
        title="Alternar menu"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>
    </div>
  );
}

export default SidebarToggleFloating;