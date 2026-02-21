import { motion } from "framer-motion";
import { Heart, MessageCircle, Bookmark, MapPin, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import destBeach from "@/assets/dest-beach.jpg";
import destCity from "@/assets/dest-city.jpg";
import destJungle from "@/assets/dest-jungle.jpg";
import destTemple from "@/assets/dest-temple.jpg";

const posts = [
  {
    id: 1,
    author: "Sarah M.",
    avatar: "S",
    location: "Bali, Indonesia",
    image: destBeach,
    caption: "Found this hidden beach away from the crowds. The water is crystal clear! 🌊",
    tags: ["#bali", "#beach", "#budgettravel"],
    likes: 234,
    comments: 18,
    time: "2h ago",
  },
  {
    id: 2,
    author: "Alex K.",
    avatar: "A",
    location: "Prague, Czech Republic",
    image: destCity,
    caption: "The architecture here is straight out of a fairytale. Every corner is photo-worthy! 📸",
    tags: ["#prague", "#culture", "#europe"],
    likes: 189,
    comments: 12,
    time: "5h ago",
  },
  {
    id: 3,
    author: "Priya R.",
    avatar: "P",
    location: "Coorg, India",
    image: destJungle,
    caption: "Trekking through the Western Ghats. The waterfalls here are unreal! 🏞️",
    tags: ["#india", "#nature", "#adventure"],
    likes: 312,
    comments: 24,
    time: "1d ago",
  },
  {
    id: 4,
    author: "Tom W.",
    avatar: "T",
    location: "Angkor Wat, Cambodia",
    image: destTemple,
    caption: "Sunrise at Angkor Wat is a spiritual experience unlike anything else. 🌅",
    tags: ["#angkorwat", "#spiritual", "#asia"],
    likes: 456,
    comments: 31,
    time: "2d ago",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Community = () => {
  return (
    <Layout>
      <section className="pt-24 pb-8 bg-sand">
        <div className="container mx-auto px-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Travel Community
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-muted-foreground max-w-lg mx-auto mb-8">
            Share your travel stories, tips, and photos with fellow wanderers.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Button variant="hero">
              + Create Post
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">
          {posts.map((post, i) => (
            <motion.article
              key={post.id}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={i}
              className="bg-card rounded-2xl shadow-soft overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-gradient-sunset flex items-center justify-center text-accent-foreground font-bold text-sm">
                  {post.avatar}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-card-foreground">{post.author}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {post.location} · {post.time}
                  </p>
                </div>
              </div>

              {/* Image */}
              <img src={post.image} alt={post.caption} className="w-full aspect-[4/3] object-cover" loading="lazy" />

              {/* Actions */}
              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <button className="flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors">
                    <Heart className="w-5 h-5" />
                    <span className="text-sm">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm">{post.comments}</span>
                  </button>
                  <button className="text-muted-foreground hover:text-accent transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button className="ml-auto text-muted-foreground hover:text-accent transition-colors">
                    <Bookmark className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-card-foreground mb-2">{post.caption}</p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-xs text-accent font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default Community;
