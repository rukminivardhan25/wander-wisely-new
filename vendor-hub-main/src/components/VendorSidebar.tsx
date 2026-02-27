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
  X,
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

type VendorSidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function VendorSidebar({ mobileOpen = false, onMobileClose }: VendorSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const sidebar = (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen vendor-gradient flex flex-col transition-all duration-300 border-r border-sidebar-border",
        "md:translate-x-0",
        collapsed ? "w-[72px] md:w-[72px]" : "w-[260px] md:w-[260px]",
        "max-md:translate-x-0 max-md:w-[min(280px,85vw)]",
        !mobileOpen && "max-md:translate-x-[-100%] max-md:invisible"
      )}
    >
      {/* Logo + close on mobile */}
      <div className="flex items-center justify-between h-14 md:h-16 px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center shrink-0">
            <span className="font-display font-bold text-sm text-accent-foreground">P</span>
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-lg text-primary-foreground truncate">
              Partner Portal
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onMobileClose}
          className="md:hidden p-2 -mr-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
        {collapsed && (
          <div className="hidden md:block w-8" />
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
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("shrink-0", isActive ? "text-sidebar-primary" : "", collapsed ? "md:mx-auto" : "")} size={20} />
              <span className={cn("truncate", collapsed && "md:hidden")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Collapse – desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors shrink-0"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onMobileClose}
        aria-hidden
      />
      {sidebar}
    </>
  );
}
