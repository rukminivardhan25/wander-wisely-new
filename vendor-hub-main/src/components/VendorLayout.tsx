import { useState } from "react";
import { Outlet } from "react-router-dom";
import { VendorSidebar } from "./VendorSidebar";
import { TopHeader } from "./TopHeader";
import { VendorFooter } from "./VendorFooter";

export function VendorLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <VendorSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="transition-all duration-300 md:ml-[260px] flex flex-col min-h-screen">
        <TopHeader onMenuClick={() => setMobileMenuOpen((o) => !o)} />
        <main className="flex-1 p-4 md:p-6 bg-muted/20 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
        <VendorFooter />
      </div>
    </div>
  );
}
