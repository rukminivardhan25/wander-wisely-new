import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { getDestinationById } from "@/lib/destinations";

const ExploreDetail = () => {
  const { id } = useParams<{ id: string }>();
  const dest = id ? getDestinationById(id) : null;

  if (!dest) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen bg-sand">
          <div className="container max-w-2xl mx-auto px-4 text-center">
            <p className="text-muted-foreground mb-4">Destination not found.</p>
            <Button asChild variant="outline">
              <Link to="/explore">Back to Explore</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const heroImage = dest.images[0] ?? "";

  return (
    <Layout>
      <section className="pt-24 pb-16 min-h-screen bg-sand">
        <div className="container max-w-3xl mx-auto px-4">
          <Button variant="ghost" asChild className="mb-6 gap-2 -ml-2">
            <Link to="/explore">
              <ArrowLeft className="h-4 w-4" />
              Back to Explore
            </Link>
          </Button>

          <article className="bg-card rounded-2xl shadow-medium overflow-hidden border border-border">
            {/* Hero image */}
            <div className="aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={heroImage}
                alt={dest.name}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>

            {/* Name, category, rating */}
            <div className="p-6 sm:p-8 border-b border-border">
              <div className="flex items-center gap-2 text-accent text-sm font-semibold mb-2">
                <MapPin className="w-4 h-4" />
                {dest.category}
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
                {dest.name}
              </h1>
              <p className="text-muted-foreground mb-3">{dest.shortDescription}</p>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-accent fill-accent" />
                <span className="font-medium text-foreground">{dest.rating}</span>
              </div>
            </div>

            {/* About & History (main content) */}
            <div className="p-6 sm:p-8">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                About &amp; History
              </h2>
              <div className="text-foreground leading-relaxed whitespace-pre-line text-[15px] space-y-4">
                {dest.about}
              </div>
            </div>

            {/* Back / CTA */}
            <div className="p-6 sm:p-8 pt-0 border-t border-border">
              <Button variant="outline" asChild>
                <Link to="/explore">Back to Explore</Link>
              </Button>
            </div>
          </article>
        </div>
      </section>
    </Layout>
  );
};

export default ExploreDetail;
