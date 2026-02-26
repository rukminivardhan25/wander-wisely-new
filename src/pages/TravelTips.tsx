import { motion } from "framer-motion";
import { BookOpen, MapPin, Wallet, Shield, Sun } from "lucide-react";
import Layout from "@/components/Layout";

const tips = [
  {
    icon: MapPin,
    title: "Plan your route",
    body: "Decide your main stops and how you'll get between them. Mix must-see spots with buffer time for rest and discovery.",
  },
  {
    icon: Wallet,
    title: "Set a daily budget",
    body: "Allocate a rough amount per day for food, transport, and extras. It helps you say yes to experiences without overspending.",
  },
  {
    icon: BookOpen,
    title: "Read a little before you go",
    body: "A short history or culture overview makes places more meaningful. You don't need to be an expert—just curious.",
  },
  {
    icon: Shield,
    title: "Keep copies of important docs",
    body: "Store digital copies of passport, tickets, and insurance. Share your itinerary with someone at home.",
  },
  {
    icon: Sun,
    title: "Pack for the climate",
    body: "Check weather for your dates and pack layers. Comfortable shoes and a reusable water bottle go a long way.",
  },
];

const TravelTips = () => {
  return (
    <Layout>
      <section className="pt-24 pb-16 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center py-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-6"
          >
            Travel Tips
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-primary-foreground/70 max-w-xl mx-auto"
          >
            Practical advice to plan smarter and travel with confidence.
          </motion.p>
        </div>
      </section>

      <section className="py-24 bg-sand">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="text-muted-foreground mb-12 leading-relaxed">
            Whether you're planning your first big trip or your twentieth, a few habits make travel safer, cheaper, and more enjoyable. Use these as a starting point and adjust to your style.
          </p>
          <ul className="space-y-8">
            {tips.map((tip, i) => (
              <motion.li
                key={tip.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4 p-6 rounded-2xl bg-card shadow-soft"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-sunset flex items-center justify-center shrink-0">
                  <tip.icon className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-2">{tip.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{tip.body}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>
    </Layout>
  );
};

export default TravelTips;
