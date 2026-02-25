import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bed, Phone, FileText, Pencil, Wifi, Car, Wind, Utensils, Waves, Dumbbell, ConciergeBell, Coffee, Clock, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { vendorFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type ExtraDetails = {
  facilities?: Record<string, boolean>;
  check_in?: string;
  check_out?: string;
  room_types?: { name: string; maxOccupancy?: string; pricePerNight?: string; totalRooms?: string; amenities?: string; cancellationPolicy?: string }[];
  images?: Record<string, string[]>;
};

const FACILITIES_LIST = [
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "parking", label: "Parking", icon: Car },
  { id: "ac", label: "AC", icon: Wind },
  { id: "restaurant", label: "Restaurant", icon: Utensils },
  { id: "pool", label: "Pool", icon: Waves },
  { id: "gym", label: "Gym", icon: Dumbbell },
  { id: "room_service", label: "Room Service", icon: ConciergeBell },
  { id: "breakfast_included", label: "Breakfast Included", icon: Coffee },
];

const IMAGE_CATEGORIES = [
  { id: "exterior", label: "Exterior Images" },
  { id: "lobby", label: "Lobby Images" },
  { id: "room", label: "Room Images" },
  { id: "washroom", label: "Washroom Images" },
];

interface HotelBranchDetails {
  id: string;
  name: string;
  city: string | null;
  area_locality: string | null;
  full_address: string | null;
  pincode: string | null;
  landmark: string | null;
  contact_number: string | null;
  email: string | null;
  description: string | null;
  verification_token: string | null;
  verification_status: string | null;
  created_at: string;
  updated_at: string;
  extra_details?: ExtraDetails | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  no_request: { label: "No request", className: "bg-slate-200 text-slate-600 border-slate-300" },
  pending: { label: "Pending", className: "bg-amber-500/20 text-amber-800 border-amber-300" },
  approved: { label: "Approved", className: "bg-emerald-500/20 text-emerald-800 border-emerald-300" },
  verified: { label: "Approved", className: "bg-emerald-500/20 text-emerald-800 border-emerald-300" },
  rejected: { label: "Rejected", className: "bg-red-500/20 text-red-800 border-red-300" },
};

export default function HotelBranchDetail() {
  const { listingId, branchId } = useParams<{ listingId: string; branchId: string }>();
  const [branch, setBranch] = useState<HotelBranchDetails | null>(null);
  const [listingName, setListingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    area_locality: "",
    full_address: "",
    pincode: "",
    landmark: "",
    contact_number: "",
    email: "",
    description: "",
  });
  const [extraForm, setExtraForm] = useState<ExtraDetails>({
    facilities: {},
    check_in: "14:00",
    check_out: "11:00",
    room_types: [],
    images: {},
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBranch = async () => {
    if (!listingId || !branchId) return;
    try {
      const [b, listing] = await Promise.all([
        vendorFetch<HotelBranchDetails>(`/api/listings/${listingId}/hotel-branches/${branchId}`),
        vendorFetch<{ name?: string }>(`/api/listings/${listingId}`).catch(() => ({ name: "" })),
      ]);
      setBranch(b);
      setListingName(listing?.name ?? "");
      setForm({
        name: b.name ?? "",
        city: b.city ?? "",
        area_locality: b.area_locality ?? "",
        full_address: b.full_address ?? "",
        pincode: b.pincode ?? "",
        landmark: b.landmark ?? "",
        contact_number: b.contact_number ?? "",
        email: b.email ?? "",
        description: b.description ?? "",
      });
      const ed = (b.extra_details || {}) as ExtraDetails;
      setExtraForm({
        facilities: ed.facilities ?? {},
        check_in: ed.check_in ?? "14:00",
        check_out: ed.check_out ?? "11:00",
        room_types: Array.isArray(ed.room_types) ? ed.room_types : [],
        images: ed.images ?? {},
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load hotel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!listingId || !branchId) return;
    setLoading(true);
    setError("");
    fetchBranch();
  }, [listingId, branchId]);

  const handleSave = async () => {
    if (!listingId || !branchId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await vendorFetch(`/api/listings/${listingId}/hotel-branches/${branchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          city: form.city.trim() || undefined,
          area_locality: form.area_locality.trim() || undefined,
          full_address: form.full_address.trim() || undefined,
          pincode: form.pincode.trim() || undefined,
          landmark: form.landmark.trim() || undefined,
          contact_number: form.contact_number.trim() || undefined,
          email: form.email.trim() || undefined,
          description: form.description.trim() || undefined,
          extra_details: extraForm,
        }),
      });
      await fetchBranch();
      setEditing(false);
      setSaveMessage({
        type: "success",
        text: "Details updated. Re-verification is required before this hotel is shown to users. Go to Verification → Hotel Branch, paste your branch token, and send the request again.",
      });
    } catch (e) {
      setSaveMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const isVerified = branch?.verification_status === "approved" || branch?.verification_status === "verified";
  const statusCfg = branch ? (statusConfig[branch.verification_status ?? "no_request"] ?? statusConfig.no_request) : null;

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground p-6">
        Loading…
      </div>
    );
  }
  if (error && !branch) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/listings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <p className="text-destructive">{error}</p>
        <Link to={`/listings/${listingId}/hotel`} className="text-sm text-primary hover:underline">← Back to hotel listing</Link>
      </div>
    );
  }
  if (!branch) return null;

  return (
    <div className="space-y-6 p-6" style={{ background: "#F8FAFC" }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/listings/${listingId}/hotel`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{branch.name}</h1>
            <p className="text-sm text-muted-foreground">
              {listingName && `${listingName} · `}Hotel branch
            </p>
          </div>
          {statusCfg && (
            <span className={cn("text-xs font-medium px-2.5 py-1 rounded-lg border", statusCfg.className)}>
              {statusCfg.label}
            </span>
          )}
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" className="rounded-lg gap-1.5" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" className="rounded-lg" disabled={saving || !form.name.trim()} onClick={handleSave}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {!isVerified && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 px-4 py-3 text-sm">
          <strong>Only verified hotels are shown to users.</strong> Complete verification in Verification → Hotel Branch (paste your branch token, upload documents, and send request). After approval, this hotel will be visible to customers.
        </div>
      )}

      {saveMessage && (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm border",
            saveMessage.type === "success" ? "bg-emerald-500/10 text-emerald-800 border-emerald-300" : "bg-destructive/10 text-destructive border-destructive/20"
          )}
        >
          {saveMessage.text}
        </div>
      )}

      <div className="grid gap-6 max-w-3xl">
        {/* 1. Basic Info */}
        <Card className="rounded-xl border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-muted-foreground font-normal">1</span> <Bed className="h-4 w-4 text-amber-600" /> Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="grid gap-2">
                  <Label>Hotel name</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded-lg" placeholder="Branch name" />
                </div>
                <div className="grid gap-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="rounded-lg" placeholder="City" />
                </div>
                <div className="grid gap-2">
                  <Label>Area / Locality</Label>
                  <Input value={form.area_locality} onChange={(e) => setForm((f) => ({ ...f, area_locality: e.target.value }))} className="rounded-lg" placeholder="Area or locality" />
                </div>
                <div className="grid gap-2">
                  <Label>Full address</Label>
                  <Input value={form.full_address} onChange={(e) => setForm((f) => ({ ...f, full_address: e.target.value }))} className="rounded-lg" placeholder="Full address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Pincode</Label>
                    <Input value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} className="rounded-lg" placeholder="Pincode" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Landmark</Label>
                    <Input value={form.landmark} onChange={(e) => setForm((f) => ({ ...f, landmark: e.target.value }))} className="rounded-lg" placeholder="Landmark" />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><Label>Contact number</Label><Input value={form.contact_number} onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))} className="mt-1 rounded-lg" placeholder="Contact number" /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="mt-1 rounded-lg" placeholder="Email" /></div>
                </div>
                <div className="grid gap-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="rounded-lg min-h-[80px]" placeholder="Description" /></div>
              </>
            ) : (
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Name</span><br />{branch.name || "—"}</p>
                <p><span className="text-muted-foreground">City</span><br />{branch.city || "—"}</p>
                <p><span className="text-muted-foreground">Area / Locality</span><br />{branch.area_locality || "—"}</p>
                <p><span className="text-muted-foreground">Full address</span><br />{branch.full_address || "—"}</p>
                <p><span className="text-muted-foreground">Pincode</span><br />{branch.pincode || "—"}</p>
                <p><span className="text-muted-foreground">Landmark</span><br />{branch.landmark || "—"}</p>
                <p><span className="text-muted-foreground">Contact number</span><br />{branch.contact_number || "—"}</p>
                <p><span className="text-muted-foreground">Email</span><br />{branch.email || "—"}</p>
                <p><span className="text-muted-foreground">Description</span><br /><span className="whitespace-pre-wrap">{branch.description || "—"}</span></p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Facilities */}
        <Card className="rounded-xl border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-muted-foreground font-normal">2</span> Hotel Facilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FACILITIES_LIST.map((f) => (
                    <label key={f.id} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer", extraForm.facilities?.[f.id] ? "border-amber-500/50 bg-amber-500/5" : "border-border")}>
                      <input type="checkbox" checked={!!extraForm.facilities?.[f.id]} onChange={(e) => setExtraForm((x) => ({ ...x, facilities: { ...x.facilities, [f.id]: e.target.checked } }))} className="rounded" />
                      <f.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{f.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-4 pt-2 border-t">
                  <div className="grid gap-1">
                    <Label className="text-xs">Check-in</Label>
                    <Input type="time" value={extraForm.check_in ?? "14:00"} onChange={(e) => setExtraForm((x) => ({ ...x, check_in: e.target.value }))} className="rounded-lg w-32" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Check-out</Label>
                    <Input type="time" value={extraForm.check_out ?? "11:00"} onChange={(e) => setExtraForm((x) => ({ ...x, check_out: e.target.value }))} className="rounded-lg w-32" />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Facilities</span><br />
                  {FACILITIES_LIST.filter((f) => (branch.extra_details as ExtraDetails)?.facilities?.[f.id]).map((f) => f.label).join(", ") || "—"}
                </p>
                <p><span className="text-muted-foreground">Check-in / Check-out</span><br />
                  {(branch.extra_details as ExtraDetails)?.check_in ?? "14:00"} / {(branch.extra_details as ExtraDetails)?.check_out ?? "11:00"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Room Types */}
        <Card className="rounded-xl border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-muted-foreground font-normal">3</span> <Bed className="h-4 w-4 text-amber-600" /> Room Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                {(extraForm.room_types ?? []).map((room, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div><Label className="text-xs">Name</Label><Input value={room.name} onChange={(e) => setExtraForm((x) => ({ ...x, room_types: (x.room_types ?? []).map((r, j) => j === i ? { ...r, name: e.target.value } : r) }))} className="mt-1 rounded-lg" placeholder="e.g. Deluxe" /></div>
                      <div><Label className="text-xs">Max occupancy</Label><Input type="number" value={room.maxOccupancy ?? ""} onChange={(e) => setExtraForm((x) => ({ ...x, room_types: (x.room_types ?? []).map((r, j) => j === i ? { ...r, maxOccupancy: e.target.value } : r) }))} className="mt-1 rounded-lg" /></div>
                      <div><Label className="text-xs">Price/night (₹)</Label><Input type="number" value={room.pricePerNight ?? ""} onChange={(e) => setExtraForm((x) => ({ ...x, room_types: (x.room_types ?? []).map((r, j) => j === i ? { ...r, pricePerNight: e.target.value } : r) }))} className="mt-1 rounded-lg" /></div>
                      <div><Label className="text-xs">Total rooms</Label><Input type="number" value={room.totalRooms ?? ""} onChange={(e) => setExtraForm((x) => ({ ...x, room_types: (x.room_types ?? []).map((r, j) => j === i ? { ...r, totalRooms: e.target.value } : r) }))} className="mt-1 rounded-lg" /></div>
                      <div className="sm:col-span-2"><Label className="text-xs">Amenities</Label><Input value={room.amenities ?? ""} onChange={(e) => setExtraForm((x) => ({ ...x, room_types: (x.room_types ?? []).map((r, j) => j === i ? { ...r, amenities: e.target.value } : r) }))} className="mt-1 rounded-lg" placeholder="e.g. King bed, TV" /></div>
                      <div className="sm:col-span-2"><Label className="text-xs">Cancellation policy</Label><Textarea value={room.cancellationPolicy ?? ""} onChange={(e) => setExtraForm((x) => ({ ...x, room_types: (x.room_types ?? []).map((r, j) => j === i ? { ...r, cancellationPolicy: e.target.value } : r) }))} className="mt-1 rounded-lg resize-none" rows={2} /></div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setExtraForm((x) => ({ ...x, room_types: [...(x.room_types ?? []), { name: "", maxOccupancy: "2", pricePerNight: "", totalRooms: "", amenities: "", cancellationPolicy: "" }] }))}>
                  Add room type
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {((branch.extra_details as ExtraDetails)?.room_types ?? []).length === 0 ? (
                  <p className="text-muted-foreground">No room types added.</p>
                ) : (
                  ((branch.extra_details as ExtraDetails)?.room_types ?? []).map((room, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-muted/20">
                      <p className="font-medium">{room.name || `Room ${i + 1}`}</p>
                      <p className="text-muted-foreground mt-1">Max occupancy: {room.maxOccupancy ?? "—"} · Price/night: ₹{room.pricePerNight ?? "—"} · Total rooms: {room.totalRooms ?? "—"}</p>
                      {room.amenities && <p className="text-muted-foreground">Amenities: {room.amenities}</p>}
                      {room.cancellationPolicy && <p className="text-muted-foreground">Cancellation: {room.cancellationPolicy}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Hotel Images */}
        <Card className="rounded-xl border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-muted-foreground font-normal">4</span> <ImageIcon className="h-4 w-4" /> Hotel Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {IMAGE_CATEGORIES.map((cat) => {
                const urls = (branch.extra_details as ExtraDetails)?.images?.[cat.id];
                return (
                  <div key={cat.id} className="p-4 rounded-lg border border-border bg-muted/20">
                    <p className="text-sm font-medium">{cat.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{urls?.length ? `${urls.length} image(s)` : "No images"}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {!editing && (
          <div className="flex justify-center pt-2">
            <Button type="button" className="rounded-xl gap-2" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Add Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
