import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Wallet, ArrowRight, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TripRow = {
  id: string;
  origin: string;
  destination: string;
  days: number;
  status: string;
  start_date: string | null;
  budget_amount: number | null;
  spent: number;
  selected_at: string | null;
};

function formatDateRange(startDateStr: string | null, days: number): string {
  if (!startDateStr || !/^\d{4}-\d{2}-\d{2}/.test(startDateStr)) return "—";
  const start = new Date(startDateStr.slice(0, 10) + "T12:00:00");
  if (Number.isNaN(start.getTime())) return "—";
  const end = new Date(start);
  end.setDate(end.getDate() + (days - 1));
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleDateString("en-IN", { month: "short" })} ${d.getFullYear()}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

const MyTrips = () => {
  const { token } = useAuth();
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const loadTrips = useCallback(() => {
    if (!token) return;
    apiFetch<{ trips: TripRow[] }>("/api/trips", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (data?.trips) setTrips(data.trips);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadTrips();
  }, [token, loadTrips]);

  const handleDeleteClick = (e: React.MouseEvent, tripId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTripId(tripId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTripId || !token) return;
    setDeleting(true);
    const { status, error } = await apiFetch(`/api/trips/${deleteTripId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeleting(false);
    setDeleteTripId(null);
    if (status === 204 || status === 200) {
      setTrips((prev) => prev.filter((t) => t.id !== deleteTripId));
    } else if (error) {
      console.error("Delete trip failed:", error);
    }
  };

  const handleDeleteAllConfirm = async () => {
    if (!token) return;
    setDeletingAll(true);
    const { status, error } = await apiFetch("/api/trips/all", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeletingAll(false);
    setDeleteAllOpen(false);
    if (status === 204 || status === 200) {
      setTrips([]);
    } else if (error) {
      console.error("Delete all trips failed:", error);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/80 pt-24 pb-16">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-1">My Trips</h1>
              <p className="text-sm text-muted-foreground">Trips you’ve planned and made active. Open any trip to view details.</p>
            </div>
            {!loading && trips.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteAllOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete all
              </Button>
            )}
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground mb-4">You don’t have any trips yet.</p>
              <Link to="/plan-trip" className="text-accent font-medium hover:underline">
                Plan a trip →
              </Link>
            </div>
          ) : (
            <>
            <ul className="space-y-4">
              {trips.map((trip) => (
                <li key={trip.id}>
                  <div className="flex items-stretch gap-0 rounded-2xl border border-border bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-accent/30 transition-all">
                    <Link
                      to={`/my-trips/${trip.id}`}
                      className="flex items-start justify-between gap-3 flex-1 min-w-0 p-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">
                            {trip.origin} → {trip.destination}
                          </span>
                          {trip.status === "active" && (
                            <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                              Active
                            </span>
                          )}
                          {trip.status === "ready" && trip.selected_at && (
                            <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              Completed
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {trip.days} day{trip.days !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {formatDateRange(trip.start_date, trip.days)}
                          </span>
                        </div>
                        {(trip.budget_amount != null || trip.spent > 0) && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Wallet className="h-3.5 w-3.5" />
                            {trip.budget_amount != null && (
                              <span>Budget ₹{Math.round(trip.budget_amount).toLocaleString("en-IN")}</span>
                            )}
                            {trip.spent > 0 && (
                              <span>
                                {trip.budget_amount != null ? " · " : ""}
                                Spent ₹{Math.round(trip.spent).toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-muted-foreground">
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteClick(e, trip.id)}
                      aria-label="Delete trip"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <AlertDialog open={!!deleteTripId} onOpenChange={(open) => !open && setDeleteTripId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the trip and all its data (itinerary, expenses, activity status). This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteConfirm();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleting}
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all trips?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your trips and their data (itineraries, expenses, activity status). This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingAll}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteAllConfirm();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deletingAll}
                  >
                    {deletingAll ? "Deleting…" : "Delete all"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MyTrips;
