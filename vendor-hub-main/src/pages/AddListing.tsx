import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed, Building2, ShoppingBag, Bus, Compass, PartyPopper,
  ChevronRight, ChevronLeft, Upload, X, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { vendorFetch } from "@/lib/api";

const businessTypes = [
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { id: "hotel", label: "Hotel", icon: Building2 },
  { id: "shop", label: "Shop", icon: ShoppingBag },
  { id: "transport", label: "Transport", icon: Bus },
  { id: "experience", label: "Experience", icon: Compass },
  { id: "event", label: "Event", icon: PartyPopper },
];

const steps = ["Business Type", "Basic Info", "Photos", "Publish"];

export default function AddListing() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [basicInfo, setBasicInfo] = useState({ name: "", tagline: "", description: "" });
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "error">("idle");
  const [submitError, setSubmitError] = useState("");

  const nextStep = () => {
    if (currentStep === 0 && selectedType === "experience") {
      navigate("/add-listing/experience");
      return;
    }
    if (currentStep === 0 && selectedType === "event") {
      navigate("/add-listing/event");
      return;
    }
    if (currentStep === 0 && selectedType === "hotel") {
      navigate("/add-listing/hotel");
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Add New Listing</h1>
        <p className="text-muted-foreground mt-1">Create a new listing for your business.</p>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {currentStep === 0 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
              <h2 className="font-display font-semibold text-lg text-foreground mb-4">Choose Business Type</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {businessTypes.map((bt) => (
                  <button
                    key={bt.id}
                    onClick={() => setSelectedType(bt.id)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-card",
                      selectedType === bt.id
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <bt.icon size={28} className={selectedType === bt.id ? "text-accent" : "text-muted-foreground"} />
                    <span className={cn("text-sm font-medium", selectedType === bt.id ? "text-foreground" : "text-muted-foreground")}>
                      {bt.label}
                    </span>
                  </button>
                ))}
              </div>
              {selectedType === "transport" && (
                <div className="mt-4 p-4 rounded-xl bg-accent/5 border border-accent/20 flex items-start gap-3">
                  <Bus className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-medium mb-1">Transport selected</p>
                    <p className="text-muted-foreground">After you complete and publish this listing, you’ll set up your fleet, routes, schedules and pricing in <strong>My Listings</strong> → <strong>Manage Fleet</strong> on this listing.</p>
                  </div>
                </div>
              )}
              {selectedType === "experience" && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                  <Compass className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-medium mb-1">Experience selected</p>
                    <p className="text-muted-foreground">Create a bookable experience (tours, workshops, activities). You’ll set dates, time slots, capacity and pricing in the next steps.</p>
                  </div>
                </div>
              )}
              {selectedType === "event" && (
                <div className="mt-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-start gap-3">
                  <PartyPopper className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-medium mb-1">Event selected</p>
                    <p className="text-muted-foreground">Create a ticketed event (concerts, shows, meetups). You’ll set venue, dates and ticket types in the next steps.</p>
                  </div>
                </div>
              )}
              {selectedType === "hotel" && (
                <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-medium mb-1">Hotel selected</p>
                    <p className="text-muted-foreground">Register your hotel company first (one-time), then add individual hotels. Each hotel is verified separately.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Business Name</label>
                  <input className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" placeholder={selectedType === "transport" ? "e.g. City Bus Lines" : "e.g. The Grand Kitchen"} value={basicInfo.name} onChange={(e) => setBasicInfo((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Short Tagline</label>
                  <input className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" placeholder="e.g. Fine dining with a view" value={basicInfo.tagline} onChange={(e) => setBasicInfo((p) => ({ ...p, tagline: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Full Description</label>
                  <textarea rows={4} className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" placeholder="Describe your business..." value={basicInfo.description} onChange={(e) => setBasicInfo((p) => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground">Photo Gallery</h2>
              <p className="text-sm text-muted-foreground">Upload 3–20 high-resolution images. Landscape preferred.</p>
              <div className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center gap-3 hover:border-accent/50 transition-colors cursor-pointer">
                <Upload size={32} className="text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Drag & drop images here</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </div>
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {uploadedImages.map((img, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden bg-muted aspect-video">
                      <button className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <Check size={32} className="text-success" />
              </div>
              <h2 className="font-display font-semibold text-lg text-foreground">Ready to Publish</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {selectedType === "transport"
                  ? "Create your transport listing, then add buses, routes and schedules on the next screen."
                  : "Your listing is ready for review. Once submitted, our team will review it within 24 hours."}
              </p>
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitStatus === "loading"}
                  onClick={async () => {
                    if (!selectedType || !basicInfo.name.trim()) {
                      setSubmitError("Business name is required.");
                      return;
                    }
                    setSubmitStatus("loading");
                    setSubmitError("");
                    try {
                      const res = await vendorFetch<{ id: string; type: string }>("/api/listings", {
                        method: "POST",
                        body: JSON.stringify({
                          name: basicInfo.name.trim(),
                          type: selectedType,
                          status: "draft",
                          description: basicInfo.description.trim() || basicInfo.tagline.trim() || null,
                        }),
                      });
                      if (res.type === "transport") {
                        navigate(`/listings/${res.id}/transport`);
                      } else {
                        navigate("/listings");
                      }
                    } catch (e) {
                      setSubmitError(e instanceof Error ? e.message : "Failed to create listing");
                    } finally {
                      setSubmitStatus("idle");
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={submitStatus === "loading"}
                  onClick={async () => {
                    if (!selectedType || !basicInfo.name.trim()) {
                      setSubmitError("Business name is required.");
                      return;
                    }
                    setSubmitStatus("loading");
                    setSubmitError("");
                    try {
                      const res = await vendorFetch<{ id: string; type: string }>("/api/listings", {
                        method: "POST",
                        body: JSON.stringify({
                          name: basicInfo.name.trim(),
                          type: selectedType,
                          status: "pending_approval",
                          description: basicInfo.description.trim() || basicInfo.tagline.trim() || null,
                        }),
                      });
                      navigate("/listings", { state: { message: "Listing submitted for review. You can add buses and manage fleet after your company is verified.", success: true }, replace: true });
                    } catch (e) {
                      setSubmitError(e instanceof Error ? e.message : "Failed to create listing");
                    } finally {
                      setSubmitStatus("idle");
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl gold-gradient text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Submit for Review
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        {currentStep < steps.length - 1 && (
          <button
            onClick={nextStep}
            disabled={currentStep === 0 && !selectedType}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
