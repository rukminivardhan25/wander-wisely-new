import { useState, useEffect } from "react";
import { AlertCircle, MessageSquare, Eye } from "lucide-react";
import { mainAppFetch } from "@/lib/api";

type FeedbackRow = {
  id: string;
  userId: string | null;
  rating: number;
  type: string;
  message: string | null;
  createdAt: string;
  email: string | null;
  fullName: string | null;
  adminReply: string | null;
  adminRepliedAt: string | null;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ComplaintUsers() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewRow, setViewRow] = useState<FeedbackRow | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mainAppFetch<{ feedback: FeedbackRow[] }>("/api/admin/feedback");
      const list = data.feedback ?? [];
      setFeedback(list.filter((r) => r.type === "complaint"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load complaints");
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSendReply = async () => {
    if (!replyingId || !replyText.trim()) return;
    setSubmitting(true);
    try {
      await mainAppFetch(`/api/admin/feedback/${replyingId}/reply`, {
        method: "PATCH",
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      setReplyingId(null);
      setReplyText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = (row: FeedbackRow) =>
    row.fullName || row.email || (row.userId ? "User" : "Anonymous");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Complaints</h1>
        <p className="text-muted-foreground mt-1">
          User complaints from the app. Review and send replies so users can see them in My complaints.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-forest-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-forest-200 flex items-center gap-2">
          <AlertCircle size={20} className="text-forest-600" />
          <span className="font-semibold text-foreground">All complaints</span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-forest-50 border-b border-forest-200">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">User</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 w-20">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-200">
                  {feedback.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        No complaints yet.
                      </td>
                    </tr>
                  )}
                  {feedback.map((row) => (
                    <tr key={row.id} className="hover:bg-forest-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-foreground">{displayName(row)}</p>
                        {row.email && <p className="text-sm text-muted-foreground">{row.email}</p>}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-6 py-3.5">
                        {row.adminReply ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-forest-100 text-forest-700">
                            Replied
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <button
                          type="button"
                          onClick={() => setViewRow(row)}
                          className="p-2 rounded-lg text-forest-600 hover:bg-forest-100 transition-colors"
                          title="View message & reply"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {replyingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-forest-200 shadow-lg max-w-md w-full p-6">
            <h3 className="font-semibold text-foreground mb-3">Send reply</h3>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Your reply (user will see this in My complaints)"
              className="w-full min-h-[120px] px-3 py-2 border border-forest-200 rounded-lg text-foreground bg-background resize-y"
              autoFocus
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => { setReplyingId(null); setReplyText(""); }}
                className="px-4 py-2 rounded-lg border border-forest-200 text-foreground hover:bg-forest-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReply}
                disabled={!replyText.trim() || submitting}
                className="px-4 py-2 rounded-lg bg-forest-600 text-white hover:bg-forest-700 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send reply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewRow !== null && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setViewRow(null)}
        >
          <div
            className="bg-card rounded-2xl border border-forest-200 shadow-lg max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-foreground mb-3">Complaint</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words mb-4">
              {viewRow.message || "—"}
            </p>
            {viewRow.adminReply ? (
              <>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Your reply</h4>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words mb-1">
                  {viewRow.adminReply}
                </p>
                {viewRow.adminRepliedAt && (
                  <p className="text-xs text-muted-foreground mb-4">{formatDate(viewRow.adminRepliedAt)}</p>
                )}
              </>
            ) : (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => { setReplyingId(viewRow.id); setViewRow(null); setReplyText(""); }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-600 hover:text-forest-700 hover:underline"
                >
                  <MessageSquare size={14} />
                  Send reply
                </button>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setViewRow(null)}
                className="px-4 py-2 rounded-lg bg-forest-600 text-white hover:bg-forest-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
