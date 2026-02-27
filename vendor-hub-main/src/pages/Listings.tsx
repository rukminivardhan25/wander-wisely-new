import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, Bus, Shield, Copy, Check, Compass, PartyPopper, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { vendorFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ListingRow {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  verification_status?: string;
  verification_token?: string | null;
}

const verificationStatusConfig: Record<string, { label: string; className: string }> = {
  no_request: { label: "No request", className: "bg-slate-200 text-slate-600 border-slate-300 font-medium" },
  pending: { label: "Pending request", className: "bg-amber-500/20 text-amber-800 border-amber-300 font-medium" },
  approved: { label: "Approved", className: "bg-emerald-500/20 text-emerald-800 border-emerald-300 font-medium" },
  verified: { label: "Approved", className: "bg-emerald-500/20 text-emerald-800 border-emerald-300 font-medium" },
  rejected: { label: "Rejected", className: "bg-red-500/20 text-red-800 border-red-300 font-medium" },
};

export default function Listings() {
  const location = useLocation();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [verifyModalListing, setVerifyModalListing] = useState<ListingRow | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToken = () => {
    const token = verifyToken ?? verifyModalListing?.verification_token;
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const locationState = location.state as { message?: string; success?: boolean } | null;
  const redirectMessage = locationState?.message;
  const isSuccessMessage = !!locationState?.success;

  const openVerifyModal = (listing: ListingRow) => {
    setVerifyModalListing(listing);
    setVerifyToken(listing.verification_token ?? null);
    setCopied(false);
  };

  const handleGenerateToken = async () => {
    if (!verifyModalListing) return;
    setGeneratingToken(true);
    try {
      const data = await vendorFetch<{ verification_token: string }>(`/api/listings/${verifyModalListing.id}/generate-verification-token`, { method: "POST" });
      setVerifyToken(data.verification_token);
      setListings((prev) => prev.map((l) => (l.id === verifyModalListing.id ? { ...l, verification_token: data.verification_token } : l)));
    } catch {
      setVerifyToken(null);
    } finally {
      setGeneratingToken(false);
    }
  };

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
        <div className={cn(
          "rounded-xl px-4 py-3 text-sm border",
          isSuccessMessage ? "bg-emerald-500/10 text-emerald-800 border-emerald-300" : "bg-destructive/10 text-destructive border-destructive/20"
        )}>
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
        {/* Static company card (demo) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden hover:shadow-card-hover transition-shadow"
        >
          <div className="h-36 bg-amber-500/20 flex items-center justify-center">
            <Building2 className="h-12 w-12 text-amber-600/80" />
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display font-semibold text-foreground">Your Hotel Company</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Company</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs h-8 gap-1.5 shrink-0" disabled>
                <Shield className="h-3.5 w-3.5" /> Verify
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground"
                title="Static demo card"
              >
                <Building2 size={14} /> Manage Hotels (verify first)
              </span>
            </div>
          </div>
        </motion.div>
        {listings.map((l, i) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 1) * 0.08 }}
            className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden hover:shadow-card-hover transition-shadow"
          >
            {l.type === "experience" ? (
              <div className="h-36 bg-emerald-500/20 flex items-center justify-center">
                <Compass className="h-12 w-12 text-emerald-600/80" />
              </div>
            ) : l.type === "event" ? (
              <div className="h-36 bg-violet-500/20 flex items-center justify-center">
                <PartyPopper className="h-12 w-12 text-violet-600/80" />
              </div>
            ) : l.type === "hotel" ? (
              <div className="h-36 bg-amber-500/20 flex items-center justify-center">
                <Building2 className="h-12 w-12 text-amber-600/80" />
              </div>
            ) : (
              <div className="h-36 vendor-gradient flex items-center justify-center">
                <span className="text-primary-foreground/40 text-sm font-medium">Cover Image</span>
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold text-foreground">{l.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{l.type.replace("_", " ")}</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs h-8 gap-1.5 shrink-0" onClick={() => openVerifyModal(l)}>
                  <Shield className="h-3.5 w-3.5" /> Verify
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
                {l.type === "transport" && (
                  (l.verification_status === "approved" || l.verification_status === "verified") ? (
                    <Link
                      to={`/listings/${l.id}/transport`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                    >
                      <Bus size={14} /> Manage Fleet
                    </Link>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground cursor-not-allowed"
                      title="Verify your company first to manage fleet"
                    >
                      <Bus size={14} /> Manage Fleet (verify first)
                    </span>
                  )
                )}
                {l.type === "experience" && (
                  (l.verification_status === "approved" || l.verification_status === "verified") ? (
                    <Link
                      to={`/listings/${l.id}/experience`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Compass size={14} /> Manage
                    </Link>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground"
                      title="Generate token and verify to publish this experience"
                    >
                      <Compass size={14} /> Verify first to publish
                    </span>
                  )
                )}
                {l.type === "event" && (
                  (l.verification_status === "approved" || l.verification_status === "verified") ? (
                    <Link
                      to={`/listings/${l.id}/event`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-500/20 transition-colors"
                    >
                      <PartyPopper size={14} /> Manage
                    </Link>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground"
                      title="Generate token and verify to publish this event"
                    >
                      <PartyPopper size={14} /> Verify first to publish
                    </span>
                  )
                )}
                {l.type === "hotel" && (
                  (l.verification_status === "approved" || l.verification_status === "verified") ? (
                    <Link
                      to={`/listings/${l.id}/hotel`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                      <Building2 size={14} /> Manage Hotels
                    </Link>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground"
                      title="Verify your company first to add hotels"
                    >
                      <Building2 size={14} /> Manage Hotels (verify first)
                    </span>
                  )
                )}
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

      <Dialog open={!!verifyModalListing} onOpenChange={(open) => !open && setVerifyModalListing(null)}>
        <DialogContent className="rounded-2xl max-w-md p-0 overflow-hidden">
          {verifyModalListing && (
            <>
              <div className="bg-sidebar text-sidebar-foreground px-5 py-4">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Company Verification</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-sidebar-foreground/80 mt-0.5">Token and verification status for this listing.</p>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Token</h4>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    {!(verifyToken ?? verifyModalListing.verification_token) ? (
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-lg gap-1.5 shrink-0"
                        onClick={handleGenerateToken}
                        disabled={generatingToken}
                      >
                        {generatingToken ? "Generating…" : "Generate token"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">Token generated (cannot be regenerated)</span>
                    )}
                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                      <span className="font-mono text-sm bg-muted/80 rounded-lg px-3 py-2 border border-border min-h-[2.5rem] inline-flex items-center truncate max-w-[180px]">
                        {verifyToken ?? verifyModalListing.verification_token ?? "—"}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg gap-1.5 shrink-0"
                        onClick={copyToken}
                        disabled={!(verifyToken ?? verifyModalListing.verification_token)}
                        title="Copy token"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Each token is unique and fixed. Share it with admin to get the company verified. You can copy it again anytime after reopening this modal.</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</h4>
                  {(() => {
                    const status = verifyModalListing.verification_status ?? "no_request";
                    const config = verificationStatusConfig[status] ?? verificationStatusConfig.no_request;
                    return (
                      <span className={cn("inline-flex px-3 py-1.5 rounded-lg border text-sm", config.className)}>
                        {config.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
