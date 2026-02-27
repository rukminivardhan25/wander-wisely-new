import { useState, useEffect } from "react";
import { Camera, Trash2, CreditCard, IdCard } from "lucide-react";
import { vendorFetch } from "@/lib/api";
import { useVendorAuth } from "@/hooks/useVendorAuth";

interface VendorProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  aadhar_number: string | null;
  aadhar_name: string | null;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  bank_branch: string | null;
}

const emptyProfile: VendorProfile = {
  id: "",
  name: "",
  email: "",
  phone: null,
  aadhar_number: null,
  aadhar_name: null,
  bank_account_holder_name: null,
  bank_account_number: null,
  bank_ifsc: null,
  bank_name: null,
  bank_branch: null,
};

export default function ProfileSettings() {
  const { vendor, updateVendor, logout } = useVendorAuth();
  const [profile, setProfile] = useState<VendorProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    aadhar_number: "",
    aadhar_name: "",
    bank_account_holder_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_name: "",
    bank_branch: "",
  });

  useEffect(() => {
    let cancelled = false;
    vendorFetch<VendorProfile>("/api/profile")
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          aadhar_number: data.aadhar_number ?? "",
          aadhar_name: data.aadhar_name ?? "",
          bank_account_holder_name: data.bank_account_holder_name ?? "",
          bank_account_number: data.bank_account_number ?? "",
          bank_ifsc: data.bank_ifsc ?? "",
          bank_name: data.bank_name ?? "",
          bank_branch: data.bank_branch ?? "",
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
    setSuccess(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      await vendorFetch("/api/profile", { method: "DELETE" });
      setShowDeleteConfirm(false);
      logout();
      window.location.href = "/signin";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await vendorFetch<VendorProfile>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || null,
          aadhar_number: form.aadhar_number.trim() || null,
          aadhar_name: form.aadhar_name.trim() || null,
          bank_account_holder_name: form.bank_account_holder_name.trim() || null,
          bank_account_number: form.bank_account_number.trim() || null,
          bank_ifsc: form.bank_ifsc.trim() || null,
          bank_name: form.bank_name.trim() || null,
          bank_branch: form.bank_branch.trim() || null,
        }),
      });
      setProfile(updated);
      updateVendor({ name: updated.name, email: updated.email, phone: updated.phone });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50";
  const labelClass = "text-sm font-medium text-foreground block mb-1.5";

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your contact details, identity and bank information.</p>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm border bg-destructive/10 text-destructive border-destructive/20">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl px-4 py-3 text-sm border bg-emerald-500/10 text-emerald-800 border-emerald-300">
          Profile saved successfully.
        </div>
      )}

      {/* Cover & Logo placeholder */}
      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="h-40 vendor-gradient relative flex items-center justify-center">
          <span className="text-primary-foreground/40 text-sm">Cover Image</span>
          <button type="button" className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur text-xs font-medium text-foreground hover:bg-card transition-colors flex items-center gap-1.5">
            <Camera size={14} /> Change
          </button>
        </div>
        <div className="p-6 -mt-10 relative">
          <div className="w-20 h-20 rounded-2xl vendor-gradient border-4 border-card flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">
              {vendor?.name?.slice(0, 2).toUpperCase() ?? "V"}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Details: Owner name, Email, Phone */}
        <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
          <h3 className="font-display font-semibold text-foreground">Contact Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Owner name</label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                placeholder="Full name of the owner"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                placeholder="email@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange("phone")}
                placeholder="+91 98765 43210"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Aadhar */}
        <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <IdCard size={20} className="text-accent" />
            Aadhaar details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Aadhaar number</label>
              <input
                type="text"
                value={form.aadhar_number}
                onChange={handleChange("aadhar_number")}
                placeholder="12-digit Aadhaar number"
                maxLength={12}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Name as on Aadhaar</label>
              <input
                type="text"
                value={form.aadhar_name}
                onChange={handleChange("aadhar_name")}
                placeholder="As printed on Aadhaar card"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Bank details */}
        <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <CreditCard size={20} className="text-accent" />
            Bank details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Account holder name</label>
              <input
                type="text"
                value={form.bank_account_holder_name}
                onChange={handleChange("bank_account_holder_name")}
                placeholder="Name as in bank account"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Account number</label>
              <input
                type="text"
                value={form.bank_account_number}
                onChange={handleChange("bank_account_number")}
                placeholder="Bank account number"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>IFSC code</label>
              <input
                type="text"
                value={form.bank_ifsc}
                onChange={handleChange("bank_ifsc")}
                placeholder="e.g. SBIN0001234"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Bank name</label>
              <input
                type="text"
                value={form.bank_name}
                onChange={handleChange("bank_name")}
                placeholder="Name of the bank"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Branch</label>
              <input
                type="text"
                value={form.bank_branch}
                onChange={handleChange("bank_branch")}
                placeholder="Branch name / address"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Delete Account */}
        <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive text-sm">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your vendor account. All data related to your account will be deleted, including listings, bookings, customers, reviews, and profile. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-destructive text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors shrink-0"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Delete account confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
          <div className="bg-card rounded-2xl shadow-xl border border-border max-w-md w-full p-6">
            <h3 className="font-display font-semibold text-foreground text-lg">Delete account?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Your vendor account and all related data will be permanently deleted: listings, bookings, customers, reviews, and profile. This cannot be undone.
            </p>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
