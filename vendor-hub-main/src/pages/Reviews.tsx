import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, MessageSquare, Flag, ChevronRight, Building2 } from "lucide-react";
import { vendorFetch } from "@/lib/api";

type ListingRow = { id: string; name: string; type: string };
type ReviewRow = {
  id: string;
  user_id: string;
  user_name: string | null;
  listing_id: string;
  scope_entity_type: string | null;
  scope_entity_id: string | null;
  booking_type: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};
type SubEntity = { id: string; name: string; scopeType: string | null; scopeId: string | null };

const COMPANY_SCOPE_ID = "company";
const HAS_SUB_SCOPES = ["transport", "rental", "hotel"] as const;

function formatReviewDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function Reviews() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"companies" | "company_overview" | "listing_reviews">("companies");
  const [selectedCompany, setSelectedCompany] = useState<ListingRow | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  const [selectedScopeName, setSelectedScopeName] = useState<string | null>(null);
  const [subEntities, setSubEntities] = useState<SubEntity[]>([]);
  const [subEntitiesLoading, setSubEntitiesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [listRes, revRes] = await Promise.all([
          vendorFetch<{ listings: ListingRow[] }>("/api/listings"),
          vendorFetch<{ reviews: ReviewRow[] }>("/api/booking-reviews").catch((e) => ({ reviews: [] as ReviewRow[] })),
        ]);
        if (cancelled) return;
        setListings(listRes.listings ?? []);
        setReviews(revRes.reviews ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
        setListings([]);
        setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedCompany) {
      setSubEntities([]);
      return;
    }
    const type = (selectedCompany.type || "").toLowerCase();
    if (!HAS_SUB_SCOPES.includes(type as (typeof HAS_SUB_SCOPES)[number])) {
      setSubEntities([]);
      return;
    }
    let cancelled = false;
    setSubEntitiesLoading(true);
    (async () => {
      const list: SubEntity[] = [{ id: COMPANY_SCOPE_ID, name: "Company overall", scopeType: null, scopeId: null }];
      try {
        if (type === "transport" || type === "rental") {
          const [busesRes, carsRes, flightsRes] = await Promise.all([
            vendorFetch<{ buses: { id: string; name: string }[] }>(`/api/listings/${selectedCompany.id}/buses`).catch(() => ({ buses: [] })),
            vendorFetch<{ cars: { id: string; name: string }[] }>(`/api/listings/${selectedCompany.id}/cars`).catch(() => ({ cars: [] })),
            vendorFetch<{ flights: { id: string; flightNumber: string; airlineName: string }[] }>(`/api/listings/${selectedCompany.id}/flights`).catch(() => ({ flights: [] })),
          ]);
          if (cancelled) return;
          (busesRes.buses ?? []).forEach((b) => list.push({ id: b.id, name: b.name, scopeType: "bus", scopeId: b.id }));
          (carsRes.cars ?? []).forEach((c) => list.push({ id: c.id, name: c.name, scopeType: "car", scopeId: c.id }));
          (flightsRes.flights ?? []).forEach((f) => list.push({ id: f.id, name: `${f.flightNumber} · ${f.airlineName}`, scopeType: "flight", scopeId: f.id }));
        } else if (type === "hotel") {
          const branchesRes = await vendorFetch<{ branches: { id: string; name: string }[] }>(`/api/listings/${selectedCompany.id}/hotel-branches`).catch(() => ({ branches: [] }));
          if (cancelled) return;
          (branchesRes.branches ?? []).forEach((b) => list.push({ id: b.id, name: b.name, scopeType: "hotel_branch", scopeId: b.id }));
        }
        if (!cancelled) setSubEntities(list);
      } finally {
        if (!cancelled) setSubEntitiesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCompany?.id, selectedCompany?.type]);

  const companyReviews = (listingId: string) => reviews.filter((r) => r.listing_id === listingId);
  const scopeReviews = (listingId: string, scopeId: string | null, scopeType: string | null) => {
    return reviews.filter((r) => {
      if (r.listing_id !== listingId) return false;
      if (scopeId === COMPANY_SCOPE_ID || scopeId == null) return !r.scope_entity_type && !r.scope_entity_id;
      return r.scope_entity_id === scopeId && r.scope_entity_type === scopeType;
    });
  };

  const companiesWithStats = listings.map((l) => {
    const revs = companyReviews(l.id);
    const total = revs.length;
    const avg = total > 0 ? revs.reduce((a, r) => a + r.rating, 0) / total : 0;
    return { ...l, totalReviews: total, overallRating: total > 0 ? Math.round(avg * 10) / 10 : 0 };
  });

  const hasSubListings = selectedCompany && subEntities.length > 1;
  const companyOnlyReviews = selectedCompany && !hasSubListings ? companyReviews(selectedCompany.id) : [];
  const selectedScopeReviews =
    selectedCompany && selectedScopeId
      ? selectedScopeId === COMPANY_SCOPE_ID
        ? scopeReviews(selectedCompany.id, null, null)
        : (() => {
            const se = subEntities.find((e) => e.id === selectedScopeId);
            return se ? scopeReviews(selectedCompany.id, se.scopeId, se.scopeType) : [];
          })()
      : [];
  const selectedListing = selectedScopeId ? subEntities.find((e) => e.id === selectedScopeId) : null;
  const avgRatingForListing =
    selectedScopeReviews.length > 0
      ? (selectedScopeReviews.reduce((acc, r) => acc + r.rating, 0) / selectedScopeReviews.length).toFixed(1)
      : null;

  const openCompany = (company: ListingRow) => {
    setSelectedCompany(company);
    setSelectedScopeId(null);
    setSelectedScopeName(null);
    setView("company_overview");
  };

  const openScopeReviews = (scopeId: string, scopeName: string) => {
    setSelectedScopeId(scopeId);
    setSelectedScopeName(scopeName);
    setView("listing_reviews");
  };

  const backToCompanies = () => {
    setView("companies");
    setSelectedCompany(null);
    setSelectedScopeId(null);
    setSelectedScopeName(null);
  };

  const backToCompanyOverview = () => {
    setView("company_overview");
    setSelectedScopeId(null);
    setSelectedScopeName(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Reviews</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Reviews</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Reviews</h1>
        <p className="text-muted-foreground mt-1">
          {view === "companies" && "Select a company to see its overall rating. For transport/hotel, open a listing for detailed reviews; for experience/event, reviews are under the company."}
          {view === "company_overview" && selectedCompany && (hasSubListings ? `Overall rating for ${selectedCompany.name}. Click a listing to see detailed reviews.` : `Reviews for ${selectedCompany.name} (no sub-listings).`)}
          {view === "listing_reviews" && selectedCompany && selectedScopeName && `Reviews for ${selectedScopeName} (${selectedCompany.name}).`}
        </p>
      </div>

      {(view === "company_overview" || view === "listing_reviews") && selectedCompany && (
        <nav className="flex items-center gap-2 text-sm">
          <button type="button" onClick={backToCompanies} className="text-muted-foreground hover:text-foreground transition-colors">
            All companies
          </button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <button
            type="button"
            onClick={view === "listing_reviews" ? backToCompanyOverview : undefined}
            className={view === "listing_reviews" ? "text-muted-foreground hover:text-foreground transition-colors" : "font-medium text-foreground"}
          >
            {selectedCompany.name}
          </button>
          {view === "listing_reviews" && selectedScopeName && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{selectedScopeName}</span>
            </>
          )}
        </nav>
      )}

      {view === "companies" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {companiesWithStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 col-span-full text-center rounded-2xl border border-dashed border-border">
              No companies yet. Add a listing to see reviews here.
            </p>
          ) : (
            companiesWithStats.map((company) => (
              <motion.button
                key={company.id}
                type="button"
                onClick={() => openCompany(company)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-card hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{company.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium text-foreground">{company.overallRating || "—"}</span>
                    <span className="text-xs text-muted-foreground">· {company.totalReviews} review{company.totalReviews !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{company.type}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </motion.button>
            ))
          )}
        </div>
      )}

      {view === "company_overview" && selectedCompany && (
        <>
          <div className="bg-card rounded-2xl shadow-card border border-border/50 p-8 flex flex-col sm:flex-row items-center gap-8">
            <div className="text-center sm:text-left">
              <p className="text-4xl font-display font-bold text-foreground">
                {companyReviews(selectedCompany.id).length > 0
                  ? (companyReviews(selectedCompany.id).reduce((a, r) => a + r.rating, 0) / companyReviews(selectedCompany.id).length).toFixed(1)
                  : "—"}
              </p>
              <div className="flex items-center gap-0.5 mt-1 justify-center sm:justify-start">
                {[1, 2, 3, 4, 5].map((s) => {
                  const avg = companyReviews(selectedCompany.id).length > 0 ? companyReviews(selectedCompany.id).reduce((a, r) => a + r.rating, 0) / companyReviews(selectedCompany.id).length : 0;
                  return <Star key={s} size={18} className={s <= Math.round(avg) ? "text-amber-500 fill-amber-500" : "text-muted-foreground"} />;
                })}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {companyReviews(selectedCompany.id).length} review{companyReviews(selectedCompany.id).length !== 1 ? "s" : ""} · {selectedCompany.name} overall
              </p>
            </div>
            <p className="text-sm text-muted-foreground flex-1">
              {hasSubListings ? (
                <>This is the overall rating for <strong className="text-foreground">{selectedCompany.name}</strong>. Click a listing below to see individual customer reviews.</>
              ) : (
                <>Reviews for <strong className="text-foreground">{selectedCompany.name}</strong> are shown below (no sub-listings).</>
              )}
            </p>
          </div>

          {hasSubListings ? (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Reviews by listing</h2>
              <p className="text-sm text-muted-foreground mb-4">Click a listing to see detailed reviews from customers.</p>
              {subEntitiesLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading…</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {subEntities.map((ent) => {
                    const revs = ent.id === COMPANY_SCOPE_ID ? scopeReviews(selectedCompany.id, null, null) : scopeReviews(selectedCompany.id, ent.scopeId, ent.scopeType);
                    const count = revs.length;
                    const avg = count > 0 ? (revs.reduce((a, r) => a + r.rating, 0) / count).toFixed(1) : "—";
                    return (
                      <motion.button
                        key={ent.id}
                        type="button"
                        onClick={() => openScopeReviews(ent.id, ent.name)}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary/30 hover:shadow transition-all"
                      >
                        <div>
                          <p className="font-medium text-foreground">{ent.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{count} review{count !== 1 ? "s" : ""} · {avg} avg</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Customer reviews</h2>
              {companyOnlyReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center rounded-2xl border border-dashed border-border">No reviews for this company yet.</p>
              ) : (
                companyOnlyReviews.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl shadow-card border border-border/50 p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm">{(r.user_name || "U").charAt(0)}</div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{r.user_name || "Guest"}</p>
                          <p className="text-xs text-muted-foreground">{selectedCompany.name} · {formatReviewDate(r.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={14} className={s <= r.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="mt-3 text-sm text-foreground leading-relaxed">{r.comment}</p>}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <MessageSquare size={14} /> Reply
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                        <Flag size={14} /> Report
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {view === "listing_reviews" && selectedCompany && selectedScopeName && (
        <>
          {avgRatingForListing != null && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-display font-bold text-foreground">{avgRatingForListing}</p>
                <div className="flex items-center gap-0.5 mt-1 justify-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} className={s <= Math.round(Number(avgRatingForListing)) ? "text-amber-500 fill-amber-500" : "text-muted-foreground"} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedScopeReviews.length} review{selectedScopeReviews.length !== 1 ? "s" : ""} · {selectedScopeName}
                </p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = selectedScopeReviews.filter((r) => r.rating === star).length;
                  const pct = selectedScopeReviews.length > 0 ? (count / selectedScopeReviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-muted-foreground">{star}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-muted-foreground text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Customer reviews</h2>
            {selectedScopeReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center rounded-2xl border border-dashed border-border">No reviews for this listing yet.</p>
            ) : (
              selectedScopeReviews.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl shadow-card border border-border/50 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm">{(r.user_name || "U").charAt(0)}</div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{r.user_name || "Guest"}</p>
                        <p className="text-xs text-muted-foreground">{selectedScopeName} · {formatReviewDate(r.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={14} className={s <= r.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="mt-3 text-sm text-foreground leading-relaxed">{r.comment}</p>}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <MessageSquare size={14} /> Reply
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                      <Flag size={14} /> Report
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
