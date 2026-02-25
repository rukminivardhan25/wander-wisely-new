import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Building2, Bed, Plus, Shield, Copy, Check, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { vendorFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Listing {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  verification_status?: string;
}

interface HotelBranch {
  id: string;
  name: string;
  city: string | null;
  full_address: string | null;
  verification_token: string | null;
  verification_status: string | null;
  created_at: string;
}

const branchStatusConfig: Record<string, { label: string; className: string }> = {
  no_request: { label: "No request", className: "bg-slate-200 text-slate-600 border-slate-300 font-medium" },
  pending: { label: "Pending", className: "bg-amber-500/20 text-amber-800 border-amber-300 font-medium" },
  approved: { label: "Approved", className: "bg-emerald-500/20 text-emerald-800 border-emerald-300 font-medium" },
  verified: { label: "Approved", className: "bg-emerald-500/20 text-emerald-800 border-emerald-300 font-medium" },
  rejected: { label: "Rejected", className: "bg-red-500/20 text-red-800 border-red-300 font-medium" },
};

export default function HotelListing() {
  const { listingId } = useParams<{ listingId: string }>();
  const location = useLocation();
  const [listing, setListing] = useState<Listing | null>(null);
  const [branches, setBranches] = useState<HotelBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifyModalBranch, setVerifyModalBranch] = useState<HotelBranch | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const locationState = location.state as { message?: string; success?: boolean } | null;
  const redirectMessage = locationState?.message;
  const isSuccessMessage = !!locationState?.success;

  useEffect(() => {
    if (!listingId) return;
    setError("");
    vendorFetch<Listing>(`/api/listings/${listingId}`)
      .then(setListing)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [listingId]);

  useEffect(() => {
    if (!listingId || (listing?.type || "").toLowerCase() !== "hotel") return;
    vendorFetch<{ branches: HotelBranch[] }>(`/api/listings/${listingId}/hotel-branches`)
      .then((data) => setBranches(data.branches ?? []))
      .catch(() => setBranches([]));
  }, [listingId, listing?.type]);

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

  if ((listing.type || "").toLowerCase() !== "hotel") {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">This listing is not a hotel company. Hotel management is only for hotel type.</p>
        <Link to="/listings" className="text-sm text-primary mt-2 inline-block hover:underline">
          ← Back to My Listings
        </Link>
      </div>
    );
  }

  const isVerified = listing.verification_status === "approved" || listing.verification_status === "verified";

  const openVerifyModal = (branch: HotelBranch) => {
    setVerifyModalBranch(branch);
    setVerifyToken(branch.verification_token ?? null);
    setCopied(false);
  };

  const copyBranchToken = () => {
    const token = verifyToken ?? verifyModalBranch?.verification_token;
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGenerateBranchToken = async () => {
    if (!listingId || !verifyModalBranch) return;
    setGeneratingToken(true);
    try {
      const data = await vendorFetch<{ verification_token: string }>(
        `/api/listings/${listingId}/hotel-branches/${verifyModalBranch.id}/generate-verification-token`,
        { method: "POST" }
      );
      setVerifyToken(data.verification_token);
      setBranches((prev) =>
        prev.map((b) => (b.id === verifyModalBranch.id ? { ...b, verification_token: data.verification_token } : b))
      );
    } catch {
      setVerifyToken(null);
    } finally {
      setGeneratingToken(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/listings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to My Listings
      </Link>

      {redirectMessage && (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm border",
            isSuccessMessage ? "bg-emerald-500/10 text-emerald-800 border-emerald-300" : "bg-destructive/10 text-destructive border-destructive/20"
          )}
        >
          {redirectMessage}
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="h-36 bg-amber-500/20 flex items-center justify-center">
          <Building2 className="h-12 w-12 text-amber-600/80" />
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-display font-bold text-foreground">{listing.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Hotel company</p>
          {listing.description && <p className="text-sm text-foreground/90 mt-3">{listing.description}</p>}
          {isVerified ? (
            <Link
              to={`/listings/${listingId}/hotel/add`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30 transition-colors"
            >
              <Plus size={18} /> Add Hotel
            </Link>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Add Hotel is available after your company is verified. Go to <Link to="/verification" className="text-primary hover:underline">Verification</Link> to submit your request, then return here to add hotels.
            </p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
        <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
          <Bed className="h-5 w-5 text-amber-600" /> Your hotels
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">Each hotel is verified separately. Generate a token, paste it in Verification → Hotel Branch, upload docs and send request.</p>
        {branches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No hotels added yet. Use &quot;Add Hotel&quot; above to add your first branch.</p>
        ) : (
          <ul className="space-y-3">
            {branches.map((branch) => {
              const statusCfg = branchStatusConfig[branch.verification_status ?? "no_request"] ?? branchStatusConfig.no_request;
              return (
                <li
                  key={branch.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{branch.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[branch.city, branch.full_address].filter(Boolean).join(" · ") || "No address"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs", statusCfg.className)}>
                      {statusCfg.label}
                    </span>
                    <Link to={`/listings/${listingId}/hotel/branch/${branch.id}`} title="View & edit details">
                      <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs h-8 gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs h-8 gap-1.5"
                      onClick={() => openVerifyModal(branch)}
                    >
                      <Shield className="h-3.5 w-3.5" /> Verify
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!verifyModalBranch} onOpenChange={(open) => !open && setVerifyModalBranch(null)}>
        <DialogContent className="rounded-2xl max-w-md p-0 overflow-hidden">
          {verifyModalBranch && (
            <>
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-lg">Verify hotel branch</DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Use this token in <strong>Verification</strong> → Company type: <strong>Hotel Branch</strong> to upload documents and send the verification request.
                </p>
                {verifyToken ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 font-mono text-sm break-all">
                    {verifyToken}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8 w-8 p-0"
                      onClick={copyBranchToken}
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Generate a token to paste in Verification.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-lg"
                    disabled={generatingToken}
                    onClick={handleGenerateBranchToken}
                  >
                    {generatingToken ? "Generating…" : verifyToken ? "Regenerate token" : "Generate token"}
                  </Button>
                  <Link to="/verification" onClick={() => setVerifyModalBranch(null)}>
                    <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1.5">
                      <ExternalLink size={14} /> Go to Verification
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
