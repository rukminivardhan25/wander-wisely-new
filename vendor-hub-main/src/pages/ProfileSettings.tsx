import { Camera, Globe, Pause, Trash2 } from "lucide-react";

export default function ProfileSettings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business profile.</p>
      </div>

      {/* Cover & Logo */}
      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="h-40 vendor-gradient relative flex items-center justify-center">
          <span className="text-primary-foreground/40 text-sm">Cover Image</span>
          <button className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur text-xs font-medium text-foreground hover:bg-card transition-colors flex items-center gap-1.5">
            <Camera size={14} /> Change
          </button>
        </div>
        <div className="p-6 -mt-10 relative">
          <div className="w-20 h-20 rounded-2xl vendor-gradient border-4 border-card flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">JB</span>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
        <h3 className="font-display font-semibold text-foreground">Contact Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Business Name</label>
            <input defaultValue="John's Bistro" className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
            <input defaultValue="john@bistro.com" className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Phone</label>
            <input defaultValue="+1 (555) 123-4567" className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Website</label>
            <input defaultValue="https://johnsbistro.com" className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
        </div>
      </div>

      {/* Social */}
      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
        <h3 className="font-display font-semibold text-foreground">Social Links</h3>
        <div className="space-y-3">
          {["Instagram", "Facebook", "Twitter"].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <Globe size={16} className="text-muted-foreground" />
              <input placeholder={`${s} URL`} className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground text-sm">Pause All Listings</p>
            <p className="text-xs text-muted-foreground">Temporarily hide all your listings from customers.</p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Pause size={14} /> Pause
          </button>
        </div>
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-destructive text-sm">Delete Account</p>
            <p className="text-xs text-muted-foreground">Permanently delete your vendor account and all data.</p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-destructive text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <button className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
        Save Changes
      </button>
    </div>
  );
}
