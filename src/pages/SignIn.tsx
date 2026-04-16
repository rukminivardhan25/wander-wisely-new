import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, warmApi } from "@/lib/api";

const SignIn = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  useEffect(() => {
    void warmApi();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Error", description: "Email and password are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error, status, networkError } = await apiFetch<{ user: { id: string; email: string; full_name: string | null }; token: string }>(
        "/api/auth/signin",
        {
          method: "POST",
          body: { email: email.trim().toLowerCase(), password },
          timeoutMs: 30000,
          retries: 1,
        }
      );
      if (networkError || error) {
        const msg = status === 401
          ? "Invalid email or password."
          : error ?? "Something went wrong. The server may still be waking up, so please try again in a moment.";
        toast({ title: networkError ? "Connection failed" : "Sign in failed", description: msg, variant: "destructive" });
        return;
      }
      if (data?.user && data?.token) {
        signIn(data.user, data.token);
        toast({ title: "Welcome back!", description: "You are signed in." });
        navigate(from, { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-sunset flex items-center justify-center">
              <Compass className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">Wanderly</span>
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground mb-8">Sign in to access your trips and plans.</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="you@example.com"
                  className="pl-10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="text-right">
              <a href="#" className="text-sm text-accent hover:underline">Forgot password?</a>
            </div>
            <Button variant="hero" className="w-full" size="lg" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-accent font-medium hover:underline">Sign Up</Link>
          </p>
        </motion.div>
      </div>

      {/* Right - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-hero items-center justify-center p-12">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-sunset flex items-center justify-center mx-auto mb-6 animate-float">
            <Compass className="w-10 h-10 text-accent-foreground" />
          </div>
          <h2 className="text-3xl font-display font-bold text-primary-foreground mb-4">
            Your Journey Awaits
          </h2>
          <p className="text-primary-foreground/60 max-w-xs mx-auto">
            Plan trips, discover destinations, and connect with travelers from around the world.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SignIn;
