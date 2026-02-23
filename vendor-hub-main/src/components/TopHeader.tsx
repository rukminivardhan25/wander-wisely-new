import { Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVendorAuth } from "@/hooks/useVendorAuth";

export function TopHeader() {
  const navigate = useNavigate();
  const { vendor, logout } = useVendorAuth();

  const initials = vendor?.name
    ? vendor.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "V";

  function handleLogout() {
    logout();
    navigate("/signin", { replace: true });
  }

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder="Search listings, bookings..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <button type="button" className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell size={20} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 pl-2 rounded-lg hover:bg-muted transition-colors">
              <div className="w-9 h-9 rounded-full vendor-gradient flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-foreground leading-tight">{vendor?.name ?? "Vendor"}</p>
                {vendor?.email && <p className="text-xs text-muted-foreground">{vendor.email}</p>}
              </div>
              <ChevronDown size={16} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
