import { useState, useEffect } from "react";
import { MessageSquare, Star, Eye } from "lucide-react";
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

export function FeedbackUsers() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMessage, setViewMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mainAppFetch<{ feedback: FeedbackRow[] }>("/api/admin/feedback");
      const all = data.feedback ?? [];
      setFeedback(all.filter((r) => r.type === "review"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feedback");
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const displayName = (row: FeedbackRow) =>
    row.fullName || row.email || (row.userId ? "User" : "Anonymous");

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Feedback</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Reviews and ratings from app users.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-forest-200 shadow-card overflow-hidden min-w-0">
        <div className="px-4 sm:px-6 py-4 border-b border-forest-200 flex items-center gap-2 min-w-0">
          <MessageSquare size={20} className="text-forest-600" />
          <span className="font-semibold text-foreground">All feedback</span>
        </div>
        {loading ? (
          <div className="px-4 sm:px-6 py-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-forest-50 border-b border-forest-200">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 sm:px-6 py-3.5">User</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 sm:px-6 py-3.5">Rating</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 sm:px-6 py-3.5">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 sm:px-6 py-3.5 w-20">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-200">
                  {feedback.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 sm:px-6 py-8 text-center text-muted-foreground">
                        No feedback yet.
                      </td>
                    </tr>
                  )}
                  {feedback.map((row) => (
                    <tr key={row.id} className="hover:bg-forest-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-3.5">
                        <p className="font-medium text-foreground truncate max-w-[120px] sm:max-w-none">{displayName(row)}</p>
                        {row.email && <p className="text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">{row.email}</p>}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <span className="inline-flex items-center gap-1">
                          {row.rating}
                          <Star size={14} className="text-forest-500 fill-forest-500" />
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <button
                          type="button"
                          onClick={() => setViewMessage(row.message ?? "")}
                          className="p-2 rounded-lg text-forest-600 hover:bg-forest-100 transition-colors"
                          title="View message"
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

      {viewMessage !== null && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setViewMessage(null)}
        >
          <div
            className="bg-card rounded-2xl border border-forest-200 shadow-lg max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-foreground mb-3">Message</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words min-h-[80px]">
              {viewMessage || "—"}
            </p>
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setViewMessage(null)}
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
