import { Link } from "react-router-dom";
import { Compass, Mail, MapPin, Phone } from "lucide-react";

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
              <span className="text-xl font-display font-bold">Wanderlust</span>
            </Link>
            <p className="text-primary-foreground/60 text-sm leading-relaxed">
              Your AI-powered travel companion. Discover, plan, and explore the world with personalized itineraries.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Explore</h4>
            <ul className="space-y-2">
              {["Destinations", "Plan a Trip", "Community", "Travel Tips"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {["About Us", "Privacy Policy", "Terms of Service", "Contact"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-primary-foreground/60 hover:text-accent transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold mb-4">Get in Touch</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-primary-foreground/60">
                <Mail className="w-4 h-4 text-accent" />
                hello@wanderlust.app
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/60">
                <MapPin className="w-4 h-4 text-accent" />
                Global Community
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-12 pt-8 text-center">
          <p className="text-sm text-primary-foreground/40">
            © 2026 Wanderlust. All rights reserved. Made with ❤️ for travelers.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
