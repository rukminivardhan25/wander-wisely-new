import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, ShieldCheck, MessageSquare, AlertCircle, Users, Building2, Calendar, IndianRupee, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-sidebar text-sidebar-foreground flex flex-col border-r border-forest-800">
        <div className="p-5 border-b border-forest-800">
          <h1 className="font-semibold text-lg">Admin</h1>
          <p className="text-xs text-forest-200 mt-0.5">Wander Wisely</p>
        </div>
        <nav className="p-3 space-y-1">
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
            feedback-users
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
            complaint-users
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
      <main className="flex-1 overflow-auto p-6 bg-background">
        <Outlet />
      </main>
    </div>
  );
}
