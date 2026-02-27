import { useState } from "react";
import { Star } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

const Feedback = () => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const { status, error } = await apiFetch<{ ok: boolean }>("/api/feedback", {
      method: "POST",
      body: { rating, type: "review", message: message.trim() || undefined },
      headers,
    });
    setSubmitting(false);
    if (status === 201) {
      toast({
        title: "Thank you",
        description: "Your review has been submitted.",
      });
      setRating(0);
      setHover(0);
      setMessage("");
    } else {
      toast({ title: error || "Failed to submit", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <section className="pt-24 pb-16 bg-sand min-h-screen">
        <div className="container mx-auto px-4 max-w-lg py-12">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Give feedback</h1>
          <p className="text-muted-foreground mb-8">
            Rate your experience. Your feedback reaches our team and helps us improve Wanderly.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-foreground">Rating</Label>
              <div className="flex gap-1 mt-2" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hover || rating) ? "text-accent fill-accent" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="message" className="text-foreground">
                Your message (optional)
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your experience..."
                className="mt-2 min-h-[120px]"
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default Feedback;
