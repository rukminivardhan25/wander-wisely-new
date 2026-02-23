import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { vendorFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Listing {
  id: string;
  name: string;
  type: string;
  status: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  registered_address: string | null;
  service_area: string | null;
  cover_image_url: string | null;
}

const statusStyles: Record<string, string> = {
  live: "bg-success/10 text-success",
  pending_approval: "bg-warning/10 text-warning",
  draft: "bg-muted text-muted-foreground",
};

export default function ListingDetail() {
  const { listingId } = useParams<{ listingId: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!listingId) return;
    setError("");
    vendorFetch<Listing>(`/api/listings/${listingId}`)
      .then(setListing)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (error || !listing) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error || "Listing not found."}</p>
        <Link to="/listings" className="text-sm text-primary mt-2 inline-block hover:underline">
          ← Back to My Listings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/listings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to My Listings
      </Link>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="h-48 vendor-gradient flex items-center justify-center">
          <span className="text-primary-foreground/40 text-sm font-medium">Cover Image</span>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">{listing.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5 capitalize">{listing.type.replace("_", " ")}</p>
            </div>
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full",
                statusStyles[listing.status] ?? "bg-muted text-muted-foreground"
              )}
            >
              {listing.status.replace("_", " ")}
            </span>
          </div>
          {listing.tagline && <p className="text-muted-foreground mt-3">{listing.tagline}</p>}
          {listing.description && <p className="text-sm text-foreground/90 mt-2">{listing.description}</p>}
          {(listing.address || listing.city) && (
            <p className="text-sm text-muted-foreground mt-3">
              {[listing.address, listing.city].filter(Boolean).join(", ")}
            </p>
          )}
          {(listing.registered_address || listing.service_area) && (
            <p className="text-sm text-muted-foreground mt-1">
              {[listing.registered_address, listing.service_area].filter(Boolean).join(" · ")}
            </p>
          )}
          {listing.type === "transport" && (
            <Link
              to={`/listings/${listing.id}/transport`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              Manage Fleet (drivers, buses, routes)
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
