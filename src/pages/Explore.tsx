import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import destBeach from "@/assets/dest-beach.jpg";
import destMountains from "@/assets/dest-mountains.jpg";
import destCity from "@/assets/dest-city.jpg";
import destJungle from "@/assets/dest-jungle.jpg";
import destTemple from "@/assets/dest-temple.jpg";

const categories = ["All", "Beaches", "Mountains", "Cities", "Nature", "Spiritual", "Adventure"];

const allDestinations = [
  { name: "Bali, Indonesia", image: destBeach, category: "Beaches", rating: 4.8, desc: "Tropical paradise with stunning temples and beaches." },
  { name: "Swiss Alps", image: destMountains, category: "Mountains", rating: 4.9, desc: "Majestic peaks and world-class skiing." },
  { name: "Prague, Czech Republic", image: destCity, category: "Cities", rating: 4.7, desc: "Gothic architecture and vibrant nightlife." },
  { name: "Amazon Rainforest", image: destJungle, category: "Nature", rating: 4.6, desc: "The world's largest tropical rainforest." },
  { name: "Angkor Wat, Cambodia", image: destTemple, category: "Spiritual", rating: 4.9, desc: "Ancient temple complex and UNESCO World Heritage site." },
  { name: "Maldives", image: destBeach, category: "Beaches", rating: 4.9, desc: "Crystal clear waters and overwater bungalows." },
  { name: "Patagonia, Argentina", image: destMountains, category: "Adventure", rating: 4.8, desc: "Dramatic glaciers and towering granite peaks." },
  { name: "Kyoto, Japan", image: destTemple, category: "Spiritual", rating: 4.8, desc: "Ancient temples, bamboo forests, and tea ceremonies." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Explore = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = allDestinations.filter((d) => {
    const matchCat = activeCategory === "All" || d.category === activeCategory;
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <Layout>
      <section className="pt-24 pb-16 bg-sand">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Explore Destinations
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Discover incredible places around the world, curated just for you.
            </p>
          </motion.div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search destinations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 justify-center mb-12">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "hero" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map((dest, i) => (
              <motion.div
                key={dest.name}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={i}
                className="group rounded-2xl overflow-hidden bg-card shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1 text-accent text-sm font-semibold mb-1">
                    <MapPin className="w-3 h-3" />
                    {dest.category}
                  </div>
                  <h3 className="font-display font-semibold text-card-foreground mb-1">{dest.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{dest.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-sm">
                    <span className="text-accent">★</span>
                    <span className="font-medium text-card-foreground">{dest.rating}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-16">No destinations found. Try a different search.</p>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Explore;
