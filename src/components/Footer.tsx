import { Link } from "react-router-dom";
import { Compass, Mail, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-sunset flex items-center justify-center">
                <Compass className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-xl font-display font-bold">Wanderly</span>
            </Link>
            <p className="text-primary-foreground/60 text-sm leading-relaxed">
              Your AI-powered travel companion. Discover, plan, and explore the world with personalized itineraries.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Explore</h4>
            <ul className="space-y-2">
              <li><Link to="/explore" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">Destinations</Link></li>
              <li><Link to="/plan-trip" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">Plan a Trip</Link></li>
              <li><Link to="/community" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">Community</Link></li>
              <li><Link to="/travel-tips" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">Travel Tips</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">About Us</Link></li>
              <li><Link to="/help" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">Help</Link></li>
              <li><Link to="/privacy" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Get in Touch */}
          <div>
            <h4 className="font-display font-semibold mb-4">Get in Touch</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-primary-foreground/60">
                <Mail className="w-4 h-4 text-accent shrink-0" />
                <a href="mailto:hello@wanderly.app" className="hover:text-accent transition-colors">hello@wanderly.app</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <p className="text-sm text-primary-foreground/40">
            © 2026 Wanderly. All rights reserved. Made with ❤️ for travelers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="tel:+15551234567" className="inline-flex items-center gap-2 text-sm text-primary-foreground/60 hover:text-accent transition-colors">
              <Phone className="w-4 h-4 text-accent shrink-0" />
              +1 (555) 123-4567
            </a>
            <Link to="/feedback" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">
              Give feedback
            </Link>
            <Link to="/complaint" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">
              Complaint
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
