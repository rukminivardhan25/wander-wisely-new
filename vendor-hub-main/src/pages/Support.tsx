import { useState, useEffect } from "react";
import { MessageSquare, Mail, Phone } from "lucide-react";
import { vendorFetch } from "@/lib/api";

const WHATSAPP_NUMBER = "+91 98765 43210"; // Update with your support WhatsApp number

type Ticket = {
  id: string;
  subject: string;
  message: string;
  createdAt: string;
  adminReply: string | null;
  adminRepliedAt: string | null;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function Support() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const data = await vendorFetch<{ tickets: Ticket[] }>("/api/support");
      setTickets(data.tickets ?? []);
    } catch {
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const sub = subject.trim();
    const msg = message.trim();
    if (!sub || !msg) {
      setError("Please fill in both subject and message.");
      return;
    }
    setSubmitting(true);
    try {
      await vendorFetch("/api/support", {
        method: "POST",
        body: JSON.stringify({ subject: sub, message: msg }),
      });
      setSuccess(true);
      setSubject("");
      setMessage("");
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Support</h1>
        <p className="text-muted-foreground mt-1">Need help? We're here for you.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 text-center hover:shadow-card-hover transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={22} className="text-accent" />
          </div>
          <p className="font-medium text-foreground text-sm">Live Chat</p>
          <p className="text-xs text-accent font-medium mt-2">WhatsApp: {WHATSAPP_NUMBER}</p>
        </div>
        {[
          { label: "Email Us", desc: "support@admin.com", icon: Mail },
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
        {success && (
          <p className="text-sm text-success bg-success/10 border border-success/30 rounded-lg px-4 py-2">
            Your ticket has been submitted. We'll get back to you soon.
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="Briefly describe your issue"
              maxLength={500}
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              placeholder="Describe your issue in detail..."
              maxLength={5000}
              disabled={submitting}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Ticket"}
          </button>
        </form>
      </div>

      {/* My tickets – show admin replies */}
      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
        <h3 className="font-display font-semibold text-foreground">My Tickets</h3>
        {ticketsLoading ? (
          <p className="text-sm text-muted-foreground">Loading your tickets…</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven't submitted any tickets yet. Use the form above to submit one.</p>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{t.subject}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(t.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{t.message}</p>
                {t.adminReply ? (
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Reply from support</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">{t.adminReply}</p>
                    {t.adminRepliedAt && (
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(t.adminRepliedAt)}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No reply yet. We'll get back to you soon.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
