import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  Users,
  Building2,
  Calendar,
  IndianRupee,
  HelpCircle,
  Menu,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen">
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      {/* Sidebar: collapsible on all sizes; when closed, main content uses full width */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-forest-800 transition-transform duration-300 ease-out",
          "w-56 max-md:w-[min(280px,85vw)]",
          !sidebarOpen && "translate-x-[-100%] invisible"
        )}
      >
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-forest-800 shrink-0">
          <div>
            <h1 className="font-semibold text-lg">Admin</h1>
            <p className="text-xs text-forest-200 mt-0.5">Wander Wisely</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-2 -mr-2 rounded-lg text-forest-200 hover:bg-forest-800"
            aria-label="Close sidebar"
          >
            <PanelLeftClose size={20} />
          </button>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-primary text-primary-foreground" : "hover:bg-sidebar-hover text-forest-100"
              )
            }
          >
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>
          <NavLink
            to="/verification"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-primary text-primary-foreground" : "hover:bg-sidebar-hover text-forest-100"
              )
            }
          >
            <ShieldCheck size={20} />
            Verification
          </NavLink>
          <NavLink
            to="/feedback-users"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-primary text-primary-foreground" : "hover:bg-sidebar-hover text-forest-100"
              )
            }
          >
            <MessageSquare size={20} />
            Feedback
          </NavLink>
          <NavLink
            to="/complaint-users"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-primary text-primary-foreground" : "hover:bg-sidebar-hover text-forest-100"
              )
            }
          >
            <AlertCircle size={20} />
            Complaints
          </NavLink>
          <NavLink
            to="/users"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-primary text-primary-foreground" : "hover:bg-sidebar-hover text-forest-100"
              )
            }
          >
            <Users size={20} />
            Users
          </NavLink>
          <NavLink
            to="/vendors"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-primary text-primary-foreground" : "hover:bg-sidebar-hover text-forest-100"
              )
            }
          >
            <Building2 size={20} />
            Vendors
          </NavLink>
          <NavLink
            to="/bookings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-primary text-primary-foreground" : "hover:bg-sidebar-hover text-forest-100"
              )
            }
          >
            <Calendar size={20} />
            Bookings
          </NavLink>
          <NavLink
            to="/payouts"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-primary text-primary-foreground" : "hover:bg-sidebar-hover text-forest-100"
              )
            }
          >
            <IndianRupee size={20} />
            Payouts
          </NavLink>
          <NavLink
            to="/support-tickets"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-primary text-primary-foreground" : "hover:bg-sidebar-hover text-forest-100"
              )
            }
          >
            <HelpCircle size={20} />
            Vendor Support
          </NavLink>
        </nav>
      </aside>

      {/* Main: full width when sidebar closed, offset when open */}
      <div className={cn("flex flex-col flex-1 min-w-0 transition-[margin] duration-300", sidebarOpen && "md:ml-56")}>
        {/* Top bar: menu icon toggles sidebar (all screen sizes) */}
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-forest-200 bg-background sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 -ml-2 rounded-lg text-foreground hover:bg-forest-100"
            aria-label={sidebarOpen ? "Close sidebar to see full content" : "Open menu"}
          >
            {sidebarOpen ? <PanelLeftClose size={24} /> : <Menu size={24} />}
          </button>
          <span className="font-semibold text-foreground">Admin</span>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 bg-background min-h-0">
          <div className="min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
