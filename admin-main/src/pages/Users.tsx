import { useState, useEffect } from "react";
import { Users as UsersIcon } from "lucide-react";
import { mainAppFetch } from "@/lib/api";

type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  joinedAt: string;
  totalBookings: number;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return iso.slice(0, 10);
  }
}

function cell(value: string | null | undefined): string {
  return value != null && String(value).trim() !== "" ? String(value).trim() : "—";
}

export function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    mainAppFetch<{ users: UserRow[] }>("/api/admin/users")
      .then((data) => setUsers(data.users ?? []))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load users");
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">
          Users from the main app. Vendors are managed on the Vendors page (vendor side).
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-forest-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-forest-200 flex items-center gap-2">
          <UsersIcon size={20} className="text-forest-600" />
          <span className="font-semibold text-foreground">All users</span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-forest-50 border-b border-forest-200">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Joined</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Total bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-forest-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground">{cell(u.fullName)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{u.email}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatDate(u.joinedAt)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{u.totalBookings}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
