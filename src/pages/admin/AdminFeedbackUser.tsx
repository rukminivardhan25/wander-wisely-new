import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Star, ArrowLeft, MessageSquare } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type Period = "month" | "year" | "all";

type FeedbackItem = {
  id: string;
  rating: number;
  type: string;
  message: string | null;
  createdAt: string;
};

const PERIOD_LABELS: Record<Period, string> = {
  month: "Past month",
  year: "Past year",
  all: "All time",
};

const AdminFeedbackUser = () => {
  const { userId } = useParams<{ userId: string }>();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [period, setPeriod] = useState<Period>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, user, isReady } = useAuth();
  const navigate = useNavigate();

  const displayName =
    userId === "anonymous" || !userId ? "Anonymous" : `User ${userId.slice(0, 8)}…`;

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      navigate("/signin", { replace: true });
      return;
    }
    if (!userId) return;
    load();
  }, [isReady, token, navigate, userId, period]);

  async function load() {
    if (!token || !userId) return;
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ feedback: FeedbackItem[] }>(
      `/api/admin/feedback/users/${encodeURIComponent(userId!)}?period=${period}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 403) {
      setError("Admin access required.");
      setFeedback([]);
    } else if (res.data?.feedback) {
      setFeedback(res.data.feedback);
    } else if (res.error) {
      setError(res.error);
    }
    setLoading(false);
  }

  if (!isReady) return null;

  return (
    <Layout>
      <section className="pt-24 pb-16 bg-sand min-h-screen">
        <div className="container mx-auto px-4 max-w-3xl py-8">
          <Link
            to="/admin/feedback"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to feedback list
          </Link>

          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Feedback from {displayName}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Signed in as {user?.email}. Admin only.
          </p>

          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive border border-destructive/20 p-4 mb-6">
              {error}
            </div>
          )}

          <div className="flex gap-2 mb-6">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : feedback.length === 0 ? (
            <p className="text-muted-foreground">No feedback in this period.</p>
          ) : (
            <ul className="space-y-4">
              {feedback.map((f) => (
                <li
                  key={f.id}
                  className="p-4 rounded-xl bg-card shadow-soft flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1">
                      {f.rating}
                      <Star className="w-4 h-4 text-accent fill-accent" />
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        f.type === "complaint"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {f.type}
                    </span>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Date(f.createdAt).toLocaleString()}
                  </time>
                  {f.message && (
                    <p className="text-sm text-foreground border-l-2 border-accent pl-2">
                      {f.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AdminFeedbackUser;
