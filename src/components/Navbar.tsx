import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Compass, Users, MapPin, LogOut, Calendar, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { path: "/explore", label: "Explore", icon: Compass },
  { path: "/plan-trip", label: "Plan Trip", icon: MapPin },
  { path: "/my-trip", label: "My Plan", icon: Calendar },
  { path: "/my-trips", label: "My Trips", icon: History },
  { path: "/community", label: "Community", icon: Users },
  { path: "/about", label: "About", icon: null },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = location.pathname === "/";
  const { user, token, signOut } = useAuth();
  const isLoggedIn = Boolean(token && user);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHome ? "bg-primary/80 backdrop-blur-md" : "bg-primary shadow-medium"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-sunset flex items-center justify-center">
            <Compass className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-primary-foreground">
            Wanderlust
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = item.path === "/my-trips" ? location.pathname.startsWith("/my-trips") : location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive ? "text-accent" : "text-primary-foreground/70 hover:text-primary-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <span className="text-sm text-primary-foreground/80 truncate max-w-[120px]">
                {user?.full_name || user?.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/signin">
                <Button variant="ghost" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="hero" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-primary-foreground p-2"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-primary border-t border-primary-foreground/10"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = item.path === "/my-trips" ? location.pathname.startsWith("/my-trips") : location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "text-accent bg-primary-foreground/5" : "text-primary-foreground/70 hover:text-primary-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="flex gap-3 mt-2 pt-2 border-t border-primary-foreground/10">
                {isLoggedIn ? (
                  <>
                    <span className="text-sm text-primary-foreground/80 py-2 truncate flex-1">
                      {user?.full_name || user?.email}
                    </span>
                    <Button variant="ghost" className="flex-1 text-primary-foreground/70" onClick={() => { setMobileOpen(false); signOut(); }}>
                      <LogOut className="w-4 h-4 mr-1" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/signin" className="flex-1" onClick={() => setMobileOpen(false)}>
                      <Button variant="ghost" className="w-full text-primary-foreground/70">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/signup" className="flex-1" onClick={() => setMobileOpen(false)}>
                      <Button variant="hero" className="w-full" size="sm">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
