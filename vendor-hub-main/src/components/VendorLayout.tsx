import { useState } from "react";
import { Outlet } from "react-router-dom";
import { VendorSidebar } from "./VendorSidebar";
import { TopHeader } from "./TopHeader";

export function VendorLayout() {
  return (
    <div className="min-h-screen bg-background">
      <VendorSidebar />
      <div className="transition-all duration-300 ml-[260px] peer-collapsed:ml-[72px]">
        <TopHeader />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
