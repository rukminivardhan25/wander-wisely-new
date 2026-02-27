import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListPlus,
  PlusCircle,
  CalendarCheck,
  Users,
  Star,
  Tag,
  ShieldCheck,
  Wallet,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Add New Listing", icon: PlusCircle, path: "/add-listing" },
  { label: "Verification", icon: ShieldCheck, path: "/verification" },
  { label: "My Listings", icon: ListPlus, path: "/listings" },
  { label: "Bookings", icon: CalendarCheck, path: "/bookings" },
  { label: "Customers", icon: Users, path: "/customers" },
  { label: "Reviews", icon: Star, path: "/reviews" },
  { label: "Promotions", icon: Tag, path: "/promotions" },
  { label: "Payouts", icon: Wallet, path: "/payouts" },
  { label: "Profile Settings", icon: Settings, path: "/settings" },
  { label: "Support", icon: HelpCircle, path: "/support" },
];

export function VendorSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen vendor-gradient flex flex-col transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
              <span className="font-display font-bold text-sm text-accent-foreground">V</span>
            </div>
            <span className="font-display font-bold text-lg text-primary-foreground">
              VendorHub
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center mx-auto">
            <span className="font-display font-bold text-sm text-accent-foreground">V</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-invisible py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("shrink-0", isActive ? "text-sidebar-primary" : "", collapsed ? "mx-auto" : "")} size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
