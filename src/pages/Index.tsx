import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Sparkles, Users, Globe, ArrowRight, Star, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import heroImg from "@/assets/hero-travel.jpg";
import destBeach from "@/assets/dest-beach.jpg";
import destMountains from "@/assets/dest-mountains.jpg";
import destCity from "@/assets/dest-city.jpg";
import destJungle from "@/assets/dest-jungle.jpg";
import destTemple from "@/assets/dest-temple.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const destinations = [
  { name: "Tropical Beaches", image: destBeach, tag: "Relaxation", count: "240+ spots" },
  { name: "Mountain Peaks", image: destMountains, tag: "Adventure", count: "180+ trails" },
  { name: "Historic Cities", image: destCity, tag: "Culture", count: "320+ cities" },
  { name: "Jungle Escapes", image: destJungle, tag: "Nature", count: "150+ parks" },
  { name: "Sacred Temples", image: destTemple, tag: "Spiritual", count: "200+ sites" },
];

const features = [
  {
    icon: Sparkles,
    title: "AI Trip Planner",
    desc: "Get personalized day-by-day itineraries powered by AI, tailored to your budget and interests.",
  },
  {
    icon: Globe,
    title: "Smart Maps",
    desc: "Interactive maps with restaurants, hotels, attractions, and real-time navigation.",
  },
  {
    icon: Users,
    title: "Travel Community",
    desc: "Share experiences, tips, and photos with fellow travelers from around the world.",
  },
  {
    icon: Shield,
    title: "Safety First",
    desc: "Real-time safety info, weather alerts, and community-verified travel tips.",
  },
];

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImg})` }}
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-transparent" />

        <div className="relative container mx-auto px-4 pt-24 pb-16">
          <motion.div
            initial="hidden"
            animate="visible"
            className="max-w-2xl"
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 backdrop-blur-sm border border-accent/30 mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent-foreground/90">AI-Powered Travel Planning</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-5xl md:text-7xl font-display font-bold text-primary-foreground leading-tight mb-6"
            >
              Your Next Adventure{" "}
              <span className="text-gradient-sunset">Starts Here</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-primary-foreground/70 mb-8 leading-relaxed max-w-lg"
            >
              Plan unforgettable trips with AI. Discover hidden gems, get personalized itineraries, and connect with travelers worldwide.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
              <Link to="/plan-trip">
                <Button variant="hero" size="lg" className="text-base px-8 py-6">
                  Plan My Trip
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <Link to="/explore">
                <Button variant="heroOutline" size="lg" className="text-base px-8 py-6">
                  Explore Destinations
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} custom={4} className="flex gap-8 mt-12 pt-8 border-t border-primary-foreground/10">
              {[
                { value: "10K+", label: "Destinations" },
                { value: "50K+", label: "Travelers" },
                { value: "4.9", label: "Rating", icon: Star },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <span className="text-2xl font-bold text-primary-foreground">{stat.value}</span>
                    {stat.icon && <Star className="w-4 h-4 text-accent fill-accent" />}
                  </div>
                  <span className="text-xs text-primary-foreground/50 uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-sand">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span variants={fadeUp} custom={0} className="text-sm font-semibold text-accent uppercase tracking-widest">
              Why Wanderlust
            </motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-4xl md:text-5xl font-display font-bold text-foreground mt-3">
              Travel Smarter, Not Harder
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="group p-8 rounded-2xl bg-card shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-sunset flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="text-lg font-display font-semibold text-card-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex items-end justify-between mb-12"
          >
            <div>
              <motion.span variants={fadeUp} custom={0} className="text-sm font-semibold text-accent uppercase tracking-widest">
                Popular Destinations
              </motion.span>
              <motion.h2 variants={fadeUp} custom={1} className="text-4xl md:text-5xl font-display font-bold text-foreground mt-3">
                Where Will You Go?
              </motion.h2>
            </div>
            <motion.div variants={fadeUp} custom={2}>
              <Link to="/explore">
                <Button variant="outline" className="hidden md:flex">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {destinations.map((dest, i) => (
              <motion.div
                key={dest.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className={`group relative rounded-2xl overflow-hidden cursor-pointer ${
                  i === 0 ? "sm:col-span-2 sm:row-span-2" : ""
                }`}
              >
                <div className={`${i === 0 ? "aspect-square" : "aspect-[4/5]"}`}>
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="inline-block px-2 py-1 rounded-md bg-accent/90 text-accent-foreground text-xs font-semibold mb-2">
                    {dest.tag}
                  </span>
                  <h3 className="text-lg font-display font-bold text-primary-foreground">{dest.name}</h3>
                  <p className="text-xs text-primary-foreground/60">{dest.count}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-glow rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-6">
              Ready to Start Your Journey?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-primary-foreground/70 mb-8">
              Let AI craft the perfect itinerary for you. Just tell us where you want to go.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <Link to="/plan-trip">
                <Button variant="hero" size="lg" className="text-base px-10 py-6">
                  <Zap className="w-5 h-5 mr-1" />
                  Plan My Trip Now
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
