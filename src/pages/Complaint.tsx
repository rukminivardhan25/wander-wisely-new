import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

const COMPLAINT_TYPES = [
  "Technical issue (app, login, or bugs)",
  "Billing or payment",
  "Content or community post",
  "Account or security",
  "Safety or abuse",
  "Other",
];

const Complaint = () => {
  const [complaintType, setComplaintType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintType) {
      toast({ title: "Please select a type of complaint", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Please describe your complaint", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const message = `[${complaintType}] ${description.trim()}`;
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const { error, networkError } = await apiFetch<{ ok: boolean }>("/api/feedback", {
      method: "POST",
      body: { rating: 1, type: "complaint", message },
      headers,
    });
    setSubmitting(false);
    if (networkError || error) {
      toast({
        title: "Could not submit complaint",
        description: "Make sure the backend is running (e.g. npm run dev in the backend folder).",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Complaint received",
      description: "We've received your complaint and will look into it. We'll get back to you if needed.",
    });
    setComplaintType("");
    setDescription("");
  };

  return (
    <Layout>
      <section className="pt-24 pb-16 bg-sand min-h-screen">
        <div className="container mx-auto px-4 max-w-lg py-12">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Submit a complaint</h1>
          <p className="text-muted-foreground mb-8">
            Select the type of complaint and describe the issue. We'll review and take appropriate action.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="complaint-type" className="text-foreground">
                Type of complaint
              </Label>
              <Select value={complaintType} onValueChange={setComplaintType} required>
                <SelectTrigger id="complaint-type" className="mt-2">
                  <SelectValue placeholder="Select type of complaint" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description" className="text-foreground">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened and any relevant details..."
                className="mt-2 min-h-[140px]"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit complaint"}
            </Button>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default Complaint;
