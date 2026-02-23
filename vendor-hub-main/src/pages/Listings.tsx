import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, Edit, Trash2, Bus } from "lucide-react";
import { cn } from "@/lib/utils";
import { vendorFetch } from "@/lib/api";

interface ListingRow {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  live: "bg-success/10 text-success",
  pending_approval: "bg-warning/10 text-warning",
  draft: "bg-muted text-muted-foreground",
};

export default function Listings() {
  const location = useLocation();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const redirectMessage = (location.state as { message?: string } | null)?.message;

  const loadListings = () => {
    setLoading(true);
    vendorFetch<{ listings: ListingRow[] }>("/api/listings")
      .then((data) => setListings(data.listings ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleDeleteListing = async (listing: ListingRow) => {
    if (!window.confirm(`Delete "${listing.name}"? This cannot be undone.`)) return;
    setDeletingId(listing.id);
    setError("");
    try {
      await vendorFetch(`/api/listings/${listing.id}`, { method: "DELETE" });
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete listing");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;

  return (
    <div className="space-y-6">
      {redirectMessage && (
        <div className="rounded-xl bg-destructive/10 text-destructive border border-destructive/20 px-4 py-3 text-sm">
          {redirectMessage}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Listings</h1>
          <p className="text-muted-foreground mt-1">Manage all your business listings.</p>
        </div>
        <Link to="/add-listing" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          + Add Listing
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listings.map((l, i) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden hover:shadow-card-hover transition-shadow"
          >
            <div className="h-36 vendor-gradient flex items-center justify-center">
              <span className="text-primary-foreground/40 text-sm font-medium">Cover Image</span>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-foreground">{l.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{l.type.replace("_", " ")}</p>
                </div>
                <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", statusStyles[l.status] ?? "bg-muted text-muted-foreground")}>
                  {l.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
                {l.type === "transport" && (
                  <Link
                    to={`/listings/${l.id}/transport`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  >
                    <Bus size={14} /> Manage Fleet
                  </Link>
                )}
                <Link
                  to={l.type === "transport" ? `/listings/${l.id}/transport?view=1` : `/listings/${l.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Eye size={14} /> View
                </Link>
                <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Edit size={14} /> Edit
                </button>
                <button
                  type="button"
                  disabled={deletingId === l.id}
                  onClick={() => handleDeleteListing(l)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive/60 hover:text-destructive hover:bg-destructive/5 transition-colors ml-auto disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {listings.length === 0 && (
        <p className="text-sm text-muted-foreground">No listings yet. Add one to get started.</p>
      )}
    </div>
  );
}
