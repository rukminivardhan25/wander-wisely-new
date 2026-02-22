import { MessageSquare, Mail, Phone } from "lucide-react";

export default function Support() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Support</h1>
        <p className="text-muted-foreground mt-1">Need help? We're here for you.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Live Chat", desc: "Chat with our team", icon: MessageSquare },
          { label: "Email Us", desc: "support@vendorhub.com", icon: Mail },
          { label: "Call Us", desc: "+1 (800) 555-0199", icon: Phone },
        ].map((c) => (
          <div key={c.label} className="bg-card rounded-2xl shadow-card border border-border/50 p-6 text-center hover:shadow-card-hover transition-shadow cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <c.icon size={22} className="text-accent" />
            </div>
            <p className="font-medium text-foreground text-sm">{c.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
        <h3 className="font-display font-semibold text-foreground">Submit a Ticket</h3>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Subject</label>
          <input className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" placeholder="Briefly describe your issue" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Message</label>
          <textarea rows={5} className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" placeholder="Describe your issue in detail..." />
        </div>
        <button className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Submit Ticket
        </button>
      </div>
    </div>
  );
}
