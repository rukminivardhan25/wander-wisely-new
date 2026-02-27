import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { destinations, EXPLORE_CATEGORIES } from "@/lib/destinations";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Explore = () => {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");

  const filtered = destinations
    .filter((d) => {
      const matchCat = activeCategory === "All" || d.category === activeCategory;
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return (
    <Layout>
      <section className="pt-24 pb-16 bg-sand">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
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
            {EXPLORE_CATEGORIES.map((cat) => (
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
                key={dest.id}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={i}
              >
                <Link
                  to={`/explore/${dest.id}`}
                  className="block group rounded-2xl overflow-hidden bg-card shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={dest.images[0]}
                      alt={dest.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const t = e.currentTarget;
                        if (!t.dataset.fallback) {
                          t.dataset.fallback = "1";
                          t.src = `https://picsum.photos/seed/${encodeURIComponent(dest.id)}/800/600`;
                        } else if (!t.dataset.fallback2) {
                          t.dataset.fallback2 = "1";
                          t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%23e5e7eb' width='800' height='600'/%3E%3Ctext x='50%25' y='50%25' fill='%239ca3af' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='24'%3EPhoto%3C/text%3E%3C/svg%3E";
                        }
                      }}
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-1 text-accent text-sm font-semibold mb-1">
                      <MapPin className="w-3 h-3" />
                      {dest.category}
                    </div>
                    <h3 className="font-display font-semibold text-card-foreground mb-1">
                      {dest.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {dest.shortDescription}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-sm">
                      <span className="text-accent">★</span>
                      <span className="font-medium text-card-foreground">
                        {dest.rating}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-16">
              No destinations found. Try a different search.
            </p>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Explore;
