import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Check,
  Wifi,
  Car,
  Wind,
  Utensils,
  Waves,
  Dumbbell,
  ConciergeBell,
  Coffee,
  Clock,
  Bed,
  X,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const BRANCH_STEPS = ["Basic Info", "Facilities", "Room Types", "Hotel Images", "Publish"];

const FACILITIES = [
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "parking", label: "Parking", icon: Car },
  { id: "ac", label: "AC", icon: Wind },
  { id: "restaurant", label: "Restaurant", icon: Utensils },
  { id: "pool", label: "Pool", icon: Waves },
  { id: "gym", label: "Gym", icon: Dumbbell },
  { id: "room_service", label: "Room Service", icon: ConciergeBell },
  { id: "breakfast_included", label: "Breakfast Included", icon: Coffee },
] as const;

type RoomType = {
  name: string;
  maxOccupancy: string;
  pricePerNight: string;
  totalRooms: string;
  amenities: string;
  cancellationPolicy: string;
};

const defaultRoomType = (): RoomType => ({
  name: "",
  maxOccupancy: "2",
  pricePerNight: "",
  totalRooms: "",
  amenities: "",
  cancellationPolicy: "",
});

const IMAGE_CATEGORIES = [
  { id: "exterior", label: "Exterior Images" },
  { id: "lobby", label: "Lobby Images" },
  { id: "room", label: "Room Images" },
  { id: "washroom", label: "Washroom Images" },
];

export default function AddHotelBranch() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [basicInfo, setBasicInfo] = useState({
    hotelName: "",
    city: "",
    areaLocality: "",
    fullAddress: "",
    pincode: "",
    landmark: "",
    contactNumber: "",
    email: "",
    description: "",
  });
  const [facilities, setFacilities] = useState<Record<string, boolean>>({
    wifi: false,
    parking: false,
    ac: false,
    restaurant: false,
    pool: false,
    gym: false,
    room_service: false,
    breakfast_included: false,
  });
  const [checkInOut, setCheckInOut] = useState({ checkIn: "14:00", checkOut: "11:00" });
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([defaultRoomType()]);

  const addRoomType = () => setRoomTypes((r) => [...r, defaultRoomType()]);
  const removeRoomType = (i: number) => setRoomTypes((r) => r.filter((_, j) => j !== i));
  const updateRoomType = (i: number, field: keyof RoomType, value: string) =>
    setRoomTypes((r) => r.map((x, j) => (j === i ? { ...x, [field]: value } : x)));

  const next = () => setStep((s) => Math.min(s + 1, BRANCH_STEPS.length - 1));
  const prev = () => (step === 0 ? navigate(`/listings/${listingId}/hotel`) : setStep((s) => s - 1));

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (asDraft: boolean) => {
    if (!listingId) return;
    const name = basicInfo.hotelName?.trim();
    if (!name) {
      setSubmitError("Hotel name is required.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const { vendorFetch } = await import("@/lib/api");
      const extra_details: Record<string, unknown> = {
        facilities: facilities,
        check_in: checkInOut.checkIn || "14:00",
        check_out: checkInOut.checkOut || "11:00",
        room_types: roomTypes.map((r) => ({
          name: r.name,
          maxOccupancy: r.maxOccupancy,
          pricePerNight: r.pricePerNight,
          totalRooms: r.totalRooms,
          amenities: r.amenities,
          cancellationPolicy: r.cancellationPolicy,
        })),
        images: {}, // placeholder; upload can be added later
      };
      await vendorFetch<{ id: string; name: string }>(`/api/listings/${listingId}/hotel-branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          city: basicInfo.city?.trim() || undefined,
          area_locality: basicInfo.areaLocality?.trim() || undefined,
          full_address: basicInfo.fullAddress?.trim() || undefined,
          pincode: basicInfo.pincode?.trim() || undefined,
          landmark: basicInfo.landmark?.trim() || undefined,
          contact_number: basicInfo.contactNumber?.trim() || undefined,
          email: basicInfo.email?.trim() || undefined,
          description: basicInfo.description?.trim() || undefined,
          extra_details,
        }),
      });
      navigate(`/listings/${listingId}/hotel`, {
        state: {
          message: asDraft
            ? "Hotel branch saved. Generate a verification token in Your hotels and complete verification to make it visible."
            : "Hotel branch added. Go to Your hotels → Verify to generate a token, then complete verification in Verification → Hotel Branch.",
          success: true,
        },
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to add hotel branch.");
    } finally {
      setSubmitting(false);
    }
  };

  const backUrl = `/listings/${listingId}/hotel`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <button type="button" onClick={() => navigate(backUrl)} className="hover:text-foreground">
          Hotel company
        </button>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">Add Hotel</span>
      </div>

      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-7 w-7 text-amber-600" />
          Add Hotel (branch)
        </h1>
        <p className="text-muted-foreground mt-1">Each hotel is verified separately. Room types and details help users find and book.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {BRANCH_STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                i === step ? "bg-amber-600 text-white" : i < step ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check size={12} /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < BRANCH_STEPS.length - 1 && <ChevronRight size={14} className="mx-1 text-muted-foreground/50 shrink-0" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Basic Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Hotel Name</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="e.g. Grand Hotel Hyderabad" value={basicInfo.hotelName} onChange={(e) => setBasicInfo((p) => ({ ...p, hotelName: e.target.value }))} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="e.g. Hyderabad" value={basicInfo.city} onChange={(e) => setBasicInfo((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <div>
                  <Label>Area / Locality</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="e.g. Gachibowli" value={basicInfo.areaLocality} onChange={(e) => setBasicInfo((p) => ({ ...p, areaLocality: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Full Address</Label>
                  <Textarea className="mt-1.5 rounded-xl resize-none" rows={2} placeholder="Street, area, city" value={basicInfo.fullAddress} onChange={(e) => setBasicInfo((p) => ({ ...p, fullAddress: e.target.value }))} />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="e.g. 500032" value={basicInfo.pincode} onChange={(e) => setBasicInfo((p) => ({ ...p, pincode: e.target.value }))} />
                </div>
                <div>
                  <Label>Landmark</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="Nearby landmark" value={basicInfo.landmark} onChange={(e) => setBasicInfo((p) => ({ ...p, landmark: e.target.value }))} />
                </div>
                <div>
                  <Label>Contact Number</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="Hotel phone" value={basicInfo.contactNumber} onChange={(e) => setBasicInfo((p) => ({ ...p, contactNumber: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" className="mt-1.5 rounded-xl" placeholder="hotel@example.com" value={basicInfo.email} onChange={(e) => setBasicInfo((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea className="mt-1.5 rounded-xl resize-none" rows={4} placeholder="Describe your hotel, ambiance, highlights..." value={basicInfo.description} onChange={(e) => setBasicInfo((p) => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Hotel Facilities</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {FACILITIES.map((f) => (
                  <label
                    key={f.id}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                      facilities[f.id] ? "border-amber-500/50 bg-amber-500/5" : "border-border hover:border-amber-500/30"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={facilities[f.id] ?? false}
                      onChange={(e) => setFacilities((p) => ({ ...p, [f.id]: e.target.checked }))}
                      className="rounded border-input"
                    />
                    <f.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{f.label}</span>
                  </label>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div>
                    <Label className="text-xs">Check-in time</Label>
                    <Input type="time" className="mt-1 rounded-xl" value={checkInOut.checkIn} onChange={(e) => setCheckInOut((p) => ({ ...p, checkIn: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div>
                    <Label className="text-xs">Check-out time</Label>
                    <Input type="time" className="mt-1 rounded-xl" value={checkInOut.checkOut} onChange={(e) => setCheckInOut((p) => ({ ...p, checkOut: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3 flex items-center gap-2">
                <Bed className="h-5 w-5 text-amber-600" /> Room Types
              </h2>
              <p className="text-sm text-muted-foreground">Add at least one room type. Each has name, capacity, price per night, total rooms, amenities, cancellation policy, and photos.</p>
              <div className="space-y-6">
                {roomTypes.map((room, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Room type {i + 1}</span>
                      {roomTypes.length > 1 && (
                        <button type="button" onClick={() => removeRoomType(i)} className="p-1 rounded text-destructive hover:bg-destructive/10">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">Room Name</Label>
                        <Input className="mt-1 rounded-lg" placeholder="e.g. Deluxe, Suite, Standard" value={room.name} onChange={(e) => updateRoomType(i, "name", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Max Occupancy</Label>
                        <Input type="number" min={1} className="mt-1 rounded-lg" placeholder="2" value={room.maxOccupancy} onChange={(e) => updateRoomType(i, "maxOccupancy", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Price per night (₹)</Label>
                        <Input type="number" min={0} className="mt-1 rounded-lg" placeholder="0" value={room.pricePerNight} onChange={(e) => updateRoomType(i, "pricePerNight", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Total rooms available</Label>
                        <Input type="number" min={1} className="mt-1 rounded-lg" placeholder="10" value={room.totalRooms} onChange={(e) => updateRoomType(i, "totalRooms", e.target.value)} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Amenities</Label>
                        <Input className="mt-1 rounded-lg" placeholder="e.g. King bed, TV, minibar" value={room.amenities} onChange={(e) => updateRoomType(i, "amenities", e.target.value)} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Cancellation policy</Label>
                        <Textarea className="mt-1 rounded-lg resize-none" rows={2} placeholder="Free cancellation until 24h before check-in..." value={room.cancellationPolicy} onChange={(e) => updateRoomType(i, "cancellationPolicy", e.target.value)} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Room photos</Label>
                        <div className="mt-1 border-2 border-dashed border-border rounded-lg p-4 flex items-center gap-2 hover:border-amber-500/50 cursor-pointer">
                          <ImageIcon size={18} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Upload room images</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={addRoomType}>
                  <Bed size={14} /> Add room type
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Hotel Images</h2>
              <p className="text-sm text-muted-foreground">Upload images by category. No videos for now.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {IMAGE_CATEGORIES.map((cat) => (
                  <div key={cat.id} className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-amber-500/50 transition-colors cursor-pointer">
                    <Upload size={28} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">Click or drag & drop</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <Check size={32} className="text-amber-600" />
              </div>
              <h2 className="font-display font-semibold text-lg text-foreground">Ready to publish</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">Hotel branch will be saved. Then generate a verification token in Your hotels and complete verification in Verification → Hotel Branch.</p>
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => handleSubmit(true)} disabled={submitting}>
                  Save as Draft
                </Button>
                <Button type="button" className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleSubmit(false)} disabled={submitting}>
                  {submitting ? "Saving…" : "Add hotel branch"}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" className="rounded-xl gap-2" onClick={prev}>
          <ChevronLeft size={16} /> {step === 0 ? "Back to hotel company" : "Previous"}
        </Button>
        {step < BRANCH_STEPS.length - 1 && (
          <Button type="button" className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white gap-2" onClick={next}>
            Next <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
