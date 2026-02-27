import { useState } from "react";
import { Outlet } from "react-router-dom";
import { VendorSidebar } from "./VendorSidebar";
import { TopHeader } from "./TopHeader";

export function VendorLayout() {
  return (
    <div className="min-h-screen bg-background">
      <VendorSidebar />
      <div className="transition-all duration-300 ml-[260px] peer-collapsed:ml-[72px] flex flex-col min-h-screen">
        <TopHeader />
        <main className="flex-1 p-6 bg-muted/20 min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
