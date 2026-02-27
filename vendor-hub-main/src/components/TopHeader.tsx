import { Bell, ChevronDown, LogOut, Menu, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useVendorAuth } from "@/hooks/useVendorAuth";
import { vendorFetch } from "@/lib/api";

type Ticket = {
  id: string;
  subject: string;
  adminReply: string | null;
  adminRepliedAt: string | null;
};

function formatNotificationDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

type TopHeaderProps = {
  onMenuClick?: () => void;
};

export function TopHeader({ onMenuClick }: TopHeaderProps) {
  const navigate = useNavigate();
  const { vendor, logout } = useVendorAuth();
  const [notifications, setNotifications] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  const initials = vendor?.name
    ? vendor.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "P";

  const repliedTickets = notifications.filter((t) => t.adminReply != null && t.adminReply.trim() !== "");
  const unreadCount = repliedTickets.length;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await vendorFetch<{ tickets: Ticket[] }>("/api/support");
        if (!cancelled && data.tickets) setNotifications(data.tickets);
      } catch {
        if (!cancelled) setNotifications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function handleLogout() {
    logout();
    navigate("/signin", { replace: true });
  }

  return (
    <header className="h-14 md:h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>
      {/* Right */}
      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Notifications">
              <Bell size={20} className="text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-accent text-accent-foreground text-xs font-semibold rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto">
            <div className="px-2 py-1.5 text-sm font-semibold text-foreground border-b">Notifications</div>
            {loading ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">Loading…</div>
            ) : repliedTickets.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">No new replies from support.</div>
            ) : (
              repliedTickets.slice(0, 10).map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  className="flex flex-col items-stretch gap-0.5 py-3 cursor-pointer"
                  onSelect={() => navigate("/support")}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">Admin replied: {t.subject}</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-6">{formatNotificationDate(t.adminRepliedAt ?? t.id)}</span>
                </DropdownMenuItem>
              ))
            )}
            {repliedTickets.length > 10 && (
              <DropdownMenuItem className="text-sm text-muted-foreground justify-center" onSelect={() => navigate("/support")}>
                View all on Support page
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-sm justify-center" onSelect={() => navigate("/support")}>
              Open Support
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 pl-2 rounded-lg hover:bg-muted transition-colors">
              <div className="w-9 h-9 rounded-full vendor-gradient flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-foreground leading-tight">{vendor?.name ?? "Partner"}</p>
                {vendor?.email && <p className="text-xs text-muted-foreground">{vendor.email}</p>}
              </div>
              <ChevronDown size={16} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-2rem)]">
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
