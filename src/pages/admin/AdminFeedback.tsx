import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, MessageSquare, Users, ArrowRight, ShieldAlert } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type Period = "month" | "year" | "all";

type FeedbackUser = {
  userId: string | null;
  email: string | null;
  fullName: string | null;
  feedbackCount: number;
};

type FeedbackItem = {
  id: string;
  userId: string | null;
  rating: number;
  type: string;
  message: string | null;
  createdAt: string;
  email: string | null;
  fullName: string | null;
};

const PERIOD_LABELS: Record<Period, string> = {
  month: "Past month",
  year: "Past year",
  all: "All time",
};

const AdminFeedback = () => {
  const [users, setUsers] = useState<FeedbackUser[]>([]);
  const [allFeedback, setAllFeedback] = useState<FeedbackItem[]>([]);
  const [period, setPeriod] = useState<Period>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "all">("users");
  const { token, user, isReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      navigate("/signin", { replace: true });
      return;
    }
    load();
  }, [isReady, token, navigate, period, activeTab]);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    const headers = { Authorization: `Bearer ${token}` };

    if (activeTab === "users") {
      const res = await apiFetch<{ users: FeedbackUser[] }>("/api/admin/feedback/users", {
        method: "GET",
        headers,
      });
      if (res.status === 403) {
        setError("Admin access required. Only admins can view this page.");
        setUsers([]);
      } else if (res.data?.users) {
        setUsers(res.data.users);
      } else if (res.error) {
        setError(res.error);
      }
    } else {
      const res = await apiFetch<{ feedback: FeedbackItem[] }>(
        `/api/admin/feedback?period=${period}`,
        { method: "GET", headers }
      );
      if (res.status === 403) {
        setError("Admin access required. Only admins can view this page.");
        setAllFeedback([]);
      } else if (res.data?.feedback) {
        setAllFeedback(res.data.feedback);
      } else if (res.error) {
        setError(res.error);
      }
    }
    setLoading(false);
  }

  const displayUserId = (uid: string | null) => (uid === null ? "anonymous" : uid);

  if (!isReady) return null;

  return (
    <Layout>
      <section className="pt-24 pb-16 bg-sand min-h-screen">
        <div className="container mx-auto px-4 max-w-4xl py-8">
          <div className="flex items-center gap-2 mb-6">
            <ShieldAlert className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-display font-bold text-foreground">Admin: App Feedback</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Signed in as {user?.email}. Only admin users can see this page.
          </p>

          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive border border-destructive/20 p-4 mb-6">
              {error}
            </div>
          )}

          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === "users" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("users")}
            >
              <Users className="w-4 h-4 mr-2" />
              By user
            </Button>
            <Button
              variant={activeTab === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("all")}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              All feedback
            </Button>
          </div>

          {activeTab === "all" && (
            <div className="flex gap-2 mb-4">
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
          )}

          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : activeTab === "users" ? (
            <ul className="space-y-3">
              {users.length === 0 && !error && (
                <li className="text-muted-foreground">No users have submitted feedback yet.</li>
              )}
              {users.map((u) => (
                <li key={u.userId ?? "anonymous"}>
                  <Link
                    to={`/admin/feedback/users/${displayUserId(u.userId)}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-card shadow-soft hover:bg-card/80 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-foreground">
                        {u.fullName || u.email || (u.userId ? "User" : "Anonymous")}
                      </span>
                      {u.email && (
                        <span className="text-sm text-muted-foreground ml-2">({u.email})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {u.feedbackCount} feedback{u.feedbackCount !== 1 ? "s" : ""}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {allFeedback.length === 0 && !error && (
                <li className="text-muted-foreground">No feedback in this period.</li>
              )}
              {allFeedback.map((f) => (
                <li
                  key={f.id}
                  className="p-4 rounded-xl bg-card shadow-soft flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">
                      {f.fullName || f.email || (f.userId ? "User" : "Anonymous")}
                      {f.email && ` (${f.email})`}
                    </span>
                    <div className="flex items-center gap-2">
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
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Date(f.createdAt).toLocaleString()}
                  </time>
                  {f.message && (
                    <p className="text-sm text-foreground border-l-2 border-accent pl-2">{f.message}</p>
                  )}
                  <Link
                    to={`/admin/feedback/users/${displayUserId(f.userId)}`}
                    className="text-sm text-accent hover:underline"
                  >
                    View all feedback from this user →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AdminFeedback;
