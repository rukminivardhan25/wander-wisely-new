import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVendorAuth } from "@/hooks/useVendorAuth";

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp, token } = useVendorAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (token) {
    navigate("/", { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp({ name, email, phone: phone || undefined, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-xl vendor-gradient flex items-center justify-center">
            <span className="font-display font-bold text-lg text-accent-foreground">V</span>
          </div>
        </div>
        <Card className="border-border shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Create vendor account</CardTitle>
            <CardDescription>Register as a vendor to create and manage your listings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  className="rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full rounded-xl vendor-gradient text-primary-foreground hover:opacity-90" disabled={loading}>
                {loading ? "Creating account…" : "Sign up"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/signin" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
