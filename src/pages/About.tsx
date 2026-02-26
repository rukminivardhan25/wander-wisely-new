import { motion } from "framer-motion";
import { Globe, Heart, Shield, Sparkles, Users } from "lucide-react";
import Layout from "@/components/Layout";

const values = [
  { icon: Globe, title: "Explore Without Limits", desc: "We believe travel should be accessible to everyone, regardless of budget." },
  { icon: Heart, title: "Community First", desc: "Real travelers sharing real experiences. No spam, no fake reviews." },
  { icon: Shield, title: "Safety & Privacy", desc: "Your data is protected. AI-moderated content keeps the community safe." },
  { icon: Sparkles, title: "AI That Cares", desc: "Our AI learns your preferences to create truly personalized journeys." },
];

const About = () => {
  return (
    <Layout>
      <section className="pt-24 pb-16 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center py-16">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-6">
            About Wanderlust
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-lg text-primary-foreground/70 max-w-xl mx-auto">
            We're on a mission to make travel planning effortless, personal, and inspiring for every adventurer.
          </motion.p>
        </div>
      </section>

      <section className="py-24 bg-sand">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-foreground text-center mb-16">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-8 rounded-2xl bg-card shadow-soft"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-sunset flex items-center justify-center mx-auto mb-5">
                  <v.icon className="w-7 h-7 text-accent-foreground" />
                </div>
                <h3 className="font-display font-semibold text-card-foreground mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <Users className="w-12 h-12 text-accent mx-auto mb-6" />
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">Join 50,000+ Travelers</h2>
          <p className="text-muted-foreground mb-8">
            From solo backpackers to luxury travelers, our community spans the globe. Share your stories, discover hidden gems, and plan your next adventure.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default About;
