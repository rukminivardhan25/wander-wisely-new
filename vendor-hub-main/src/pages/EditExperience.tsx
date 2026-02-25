import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Compass, ArrowLeft, Upload, X } from "lucide-react";
import { vendorFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Experience = {
  id: string;
  listing_id: string;
  name: string;
  category: string;
  city: string;
  location_address: string | null;
  duration_text: string;
  short_description: string | null;
  long_description: string | null;
  age_restriction: string | null;
  max_participants_per_slot: number;
  price_per_person_cents: number;
  tax_included: boolean;
  cancellation_policy: string | null;
  status: string;
  recurring_slots?: { day: string; time: string }[];
  media: { id: string; file_url: string; is_cover: boolean; sort_order: number }[];
};

const CATEGORIES = ["Adventure", "Tour", "Cultural", "Workshop", "Water", "Food & Drink", "Nature", "activity", "Other"];
const DURATIONS = ["1 hour", "2 hours", "3 hours", "4 hours", "Half day", "1 day", "Multi-day"];

export default function EditExperience() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "",
    city: "",
    location_address: "",
    duration_text: "",
    short_description: "",
    long_description: "",
    age_restriction: "",
    max_participants_per_slot: "10",
    price_per_person_cents: "",
    tax_included: true,
    cancellation_policy: "",
  });
  const [mediaItems, setMediaItems] = useState<{ file_url: string; is_cover: boolean; sort_order: number }[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);

  useEffect(() => {
    if (!listingId) return;
    setError("");
    vendorFetch<Experience>(`/api/listings/${listingId}/experience`)
      .then((exp) => {
        setForm({
          name: exp.name || "",
          category: exp.category || "",
          city: exp.city || "",
          location_address: exp.location_address || "",
          duration_text: exp.duration_text || "",
          short_description: exp.short_description || "",
          long_description: exp.long_description || "",
          age_restriction: exp.age_restriction || "",
          max_participants_per_slot: String(exp.max_participants_per_slot ?? 10),
          price_per_person_cents: exp.price_per_person_cents != null ? String(Math.round(exp.price_per_person_cents / 100)) : "",
          tax_included: exp.tax_included ?? true,
          cancellation_policy: exp.cancellation_policy || "",
        });
        const sorted = [...(exp.media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
        setMediaItems(sorted.map((m) => ({ file_url: m.file_url, is_cover: m.is_cover, sort_order: m.sort_order })));
        const cov = sorted.findIndex((m) => m.is_cover);
        setCoverIndex(cov >= 0 ? cov : 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [listingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingId) return;
    const priceCents = Math.round(parseFloat(form.price_per_person_cents || "0") * 100);
    const maxPart = parseInt(form.max_participants_per_slot || "10", 10);

    const mediaUrls: { file_url: string; is_cover: boolean; sort_order: number }[] = [];
    for (let i = 0; i < mediaItems.length; i++) {
      const item = mediaItems[i];
      if (item.file_url.startsWith("data:")) {
        const payload = item.file_url.startsWith("data:application/pdf") ? { file: item.file_url } : { image: item.file_url };
        const { url } = await vendorFetch<{ url: string }>("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        mediaUrls.push({ file_url: url, is_cover: i === coverIndex, sort_order: i });
      } else {
        mediaUrls.push({ file_url: item.file_url, is_cover: i === coverIndex, sort_order: i });
      }
    }

    setSaving(true);
    setError("");
    try {
      await vendorFetch<{ verification_required?: boolean }>(`/api/listings/${listingId}/experience`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          category: form.category.trim() || undefined,
          city: form.city.trim() || undefined,
          location_address: form.location_address.trim() || null,
          duration_text: form.duration_text.trim() || undefined,
          short_description: form.short_description.trim() || null,
          long_description: form.long_description.trim() || null,
          age_restriction: form.age_restriction.trim() || null,
          max_participants_per_slot: isNaN(maxPart) ? undefined : maxPart,
          price_per_person_cents: isNaN(priceCents) ? undefined : priceCents,
          tax_included: form.tax_included,
          cancellation_policy: form.cancellation_policy.trim() || null,
          media: mediaUrls.length ? mediaUrls : undefined,
        }),
      });
      navigate(`/listings/${listingId}/experience`, {
        state: {
          message: "Details updated. Verification may be required — check Verification page if your listing is set to pending.",
          success: true,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (error && !form.name) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
        <Link to="/listings" className="text-sm text-primary mt-2 inline-block hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to My Listings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Link to={`/listings/${listingId}/experience`} className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft size={14} /> Manage
        </Link>
        <span className="text-foreground font-medium">Edit experience</span>
      </div>

      <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
        <Compass className="h-7 w-7 text-emerald-600" />
        Edit Experience
      </h1>
      <p className="text-muted-foreground text-sm">All details you gave when creating this experience are shown below: <strong>Basic info</strong> (name, category, city, location, duration, descriptions), <strong>Pricing</strong> (price per person, tax, cancellation policy), and <strong>Media</strong>. Manage schedule from the Manage page. Change any field and save. Updating may require re-verification from the Verification page.</p>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-2 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Name</Label>
            <Input className="mt-1.5 rounded-xl" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Category</Label>
            <select
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">Select</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>City</Label>
            <Input className="mt-1.5 rounded-xl" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Location address</Label>
            <Input className="mt-1.5 rounded-xl" placeholder="Full address" value={form.location_address} onChange={(e) => setForm((f) => ({ ...f, location_address: e.target.value }))} />
          </div>
          <div>
            <Label>Duration</Label>
            <select
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              value={form.duration_text}
              onChange={(e) => setForm((f) => ({ ...f, duration_text: e.target.value }))}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Max participants per slot</Label>
            <Input type="number" min={1} max={200} className="mt-1.5 rounded-xl" value={form.max_participants_per_slot} onChange={(e) => setForm((f) => ({ ...f, max_participants_per_slot: e.target.value }))} />
          </div>
          <div>
            <Label>Price per person (₹)</Label>
            <Input type="number" min={0} className="mt-1.5 rounded-xl" value={form.price_per_person_cents} onChange={(e) => setForm((f) => ({ ...f, price_per_person_cents: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input type="checkbox" id="taxIncluded" checked={form.tax_included} onChange={(e) => setForm((f) => ({ ...f, tax_included: e.target.checked }))} className="rounded border-input" />
            <Label htmlFor="taxIncluded">Tax included in price</Label>
          </div>
          <div className="sm:col-span-2">
            <Label>Short description</Label>
            <Textarea rows={2} className="mt-1.5 rounded-xl resize-none" value={form.short_description} onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Long description</Label>
            <Textarea rows={4} className="mt-1.5 rounded-xl resize-none" value={form.long_description} onChange={(e) => setForm((f) => ({ ...f, long_description: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Age restriction (optional)</Label>
            <Input className="mt-1.5 rounded-xl" placeholder="e.g. 18+" value={form.age_restriction} onChange={(e) => setForm((f) => ({ ...f, age_restriction: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Cancellation policy</Label>
            <Textarea rows={2} className="mt-1.5 rounded-xl resize-none" placeholder="e.g. Free cancellation 24h before." value={form.cancellation_policy} onChange={(e) => setForm((f) => ({ ...f, cancellation_policy: e.target.value }))} />
          </div>
        </div>

        <div className="border-t border-border/50 pt-6 space-y-4">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Upload size={18} className="text-emerald-600" /> Media
          </h3>
          <p className="text-sm text-muted-foreground">Add or replace images. One will be the cover.</p>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="edit-experience-media"
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (!files?.length) return;
              Array.from(files).forEach((file) => {
                if (!file.type.startsWith("image/")) return;
                const reader = new FileReader();
                reader.onload = () => setMediaItems((prev) => [...prev, { file_url: reader.result as string, is_cover: prev.length === 0, sort_order: prev.length }]);
                reader.readAsDataURL(file);
              });
              e.target.value = "";
            }}
          />
          <label htmlFor="edit-experience-media" className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-emerald-500/50 cursor-pointer bg-muted/20 block">
            <Upload size={28} className="text-muted-foreground" />
            <span className="text-sm font-medium">Add images</span>
          </label>
          {mediaItems.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {mediaItems.map((item, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden bg-muted aspect-video border border-border">
                  <img src={item.file_url.startsWith("http") ? item.file_url : item.file_url.startsWith("data:") ? item.file_url : `/${item.file_url}`} alt="" className="w-full h-full object-cover" />
                  {i === coverIndex && <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-600 text-white">Cover</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setMediaItems((prev) => prev.filter((_, idx) => idx !== i));
                      if (i === coverIndex) setCoverIndex(0);
                      else if (i < coverIndex) setCoverIndex((c) => Math.max(0, c - 1));
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-destructive/90 text-white opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                  <button type="button" onClick={() => setCoverIndex(i)} className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white bg-black/40 opacity-0 group-hover:opacity-100">
                    Set as cover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Link to={`/listings/${listingId}/experience`}>
            <Button type="button" variant="outline" className="rounded-xl">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
