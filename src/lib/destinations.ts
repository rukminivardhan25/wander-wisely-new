/**
 * Explore destinations – curated list with history-focused places.
 * Images: location-relevant photos from Wikimedia Commons (Wikipedia REST API).
 * Fallback: Picsum for destinations without a curated image.
 */

export type DestinationCategory =
  | "History"
  | "Spiritual"
  | "Cities"
  | "Nature"
  | "Mountains"
  | "Beaches"
  | "Adventure";

export type Destination = {
  id: string;
  name: string;
  category: DestinationCategory;
  rating: number;
  shortDescription: string;
  about: string;
  /** First image used as hero/card; all used in gallery */
  images: string[];
};

/** Location-relevant images from Wikimedia Commons (one primary, repeated for gallery). */
const DESTINATION_IMAGES: Record<string, string[]> = {
  "angkor-wat": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276188/wander-wisely/explore/angkor-wat-ec79a650.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276188/wander-wisely/explore/angkor-wat-ec79a650.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276188/wander-wisely/explore/angkor-wat-ec79a650.jpg",
  ],
  "machu-picchu": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288231/wander-wisely/explore/wander-wisely/explore/machu-picchu-7828143c.webp",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288231/wander-wisely/explore/wander-wisely/explore/machu-picchu-7828143c.webp",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288231/wander-wisely/explore/wander-wisely/explore/machu-picchu-7828143c.webp",
  ],
  petra: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288239/wander-wisely/explore/wander-wisely/explore/petra-a36e8f86.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288239/wander-wisely/explore/wander-wisely/explore/petra-a36e8f86.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288239/wander-wisely/explore/wander-wisely/explore/petra-a36e8f86.jpg",
  ],
  colosseum: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288249/wander-wisely/explore/wander-wisely/explore/colosseum-bc488da0.webp",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288249/wander-wisely/explore/wander-wisely/explore/colosseum-bc488da0.webp",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288249/wander-wisely/explore/wander-wisely/explore/colosseum-bc488da0.webp",
  ],
  acropolis: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288258/wander-wisely/explore/wander-wisely/explore/acropolis-a607e48d.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288258/wander-wisely/explore/wander-wisely/explore/acropolis-a607e48d.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288258/wander-wisely/explore/wander-wisely/explore/acropolis-a607e48d.jpg",
  ],
  pompeii: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276270/wander-wisely/explore/pompeii-d000851e.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276270/wander-wisely/explore/pompeii-d000851e.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276270/wander-wisely/explore/pompeii-d000851e.jpg",
  ],
  kyoto: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276271/wander-wisely/explore/kyoto-b5f263be.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276271/wander-wisely/explore/kyoto-b5f263be.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276271/wander-wisely/explore/kyoto-b5f263be.jpg",
  ],
  varanasi: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276274/wander-wisely/explore/varanasi-c3824a4f.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276274/wander-wisely/explore/varanasi-c3824a4f.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276274/wander-wisely/explore/varanasi-c3824a4f.jpg",
  ],
  rome: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276276/wander-wisely/explore/rome-5eb95db1.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276276/wander-wisely/explore/rome-5eb95db1.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276276/wander-wisely/explore/rome-5eb95db1.jpg",
  ],
  prague: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288361/wander-wisely/explore/wander-wisely/explore/prague-7596a977.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288361/wander-wisely/explore/wander-wisely/explore/prague-7596a977.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288361/wander-wisely/explore/wander-wisely/explore/prague-7596a977.jpg",
  ],
  cairo: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276294/wander-wisely/explore/cairo-7dae2318.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276294/wander-wisely/explore/cairo-7dae2318.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276294/wander-wisely/explore/cairo-7dae2318.jpg",
  ],
  "taj-mahal": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288380/wander-wisely/explore/wander-wisely/explore/taj-mahal-484a905d.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288380/wander-wisely/explore/wander-wisely/explore/taj-mahal-484a905d.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288380/wander-wisely/explore/wander-wisely/explore/taj-mahal-484a905d.jpg",
  ],
  jaipur: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276303/wander-wisely/explore/jaipur-af2f7399.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276303/wander-wisely/explore/jaipur-af2f7399.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276303/wander-wisely/explore/jaipur-af2f7399.jpg",
  ],
  udaipur: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288400/wander-wisely/explore/wander-wisely/explore/udaipur-9f9486d4.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288400/wander-wisely/explore/wander-wisely/explore/udaipur-9f9486d4.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288400/wander-wisely/explore/wander-wisely/explore/udaipur-9f9486d4.jpg",
  ],
  goa: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288411/wander-wisely/explore/wander-wisely/explore/goa-425b8a48.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288411/wander-wisely/explore/wander-wisely/explore/goa-425b8a48.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288411/wander-wisely/explore/wander-wisely/explore/goa-425b8a48.jpg",
  ],
  amritsar: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323120/wander-wisely/explore/amritsar-de5bbd43.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323120/wander-wisely/explore/amritsar-de5bbd43.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323120/wander-wisely/explore/amritsar-de5bbd43.jpg",
  ],
  paris: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288441/wander-wisely/explore/wander-wisely/explore/paris-8652ee1f.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288441/wander-wisely/explore/wander-wisely/explore/paris-8652ee1f.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288441/wander-wisely/explore/wander-wisely/explore/paris-8652ee1f.jpg",
  ],
  london: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323132/wander-wisely/explore/london-b9669145.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323132/wander-wisely/explore/london-b9669145.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323132/wander-wisely/explore/london-b9669145.jpg",
  ],
  delhi: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288653/wander-wisely/explore/wander-wisely/explore/delhi-3b58f9fb.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288653/wander-wisely/explore/wander-wisely/explore/delhi-3b58f9fb.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288653/wander-wisely/explore/wander-wisely/explore/delhi-3b58f9fb.jpg",
  ],
  mumbai: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276348/wander-wisely/explore/mumbai-322c779f.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276348/wander-wisely/explore/mumbai-322c779f.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276348/wander-wisely/explore/mumbai-322c779f.jpg",
  ],
  istanbul: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288467/wander-wisely/explore/wander-wisely/explore/istanbul-c824987c.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288467/wander-wisely/explore/wander-wisely/explore/istanbul-c824987c.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288467/wander-wisely/explore/wander-wisely/explore/istanbul-c824987c.jpg",
  ],
  barcelona: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288476/wander-wisely/explore/wander-wisely/explore/barcelona-582e4e6a.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288476/wander-wisely/explore/wander-wisely/explore/barcelona-582e4e6a.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288476/wander-wisely/explore/wander-wisely/explore/barcelona-582e4e6a.jpg",
  ],
  tokyo: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276367/wander-wisely/explore/tokyo-4ea76710.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276367/wander-wisely/explore/tokyo-4ea76710.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276367/wander-wisely/explore/tokyo-4ea76710.jpg",
  ],
  "new-york": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288488/wander-wisely/explore/wander-wisely/explore/new-york-ebc7b408.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288488/wander-wisely/explore/wander-wisely/explore/new-york-ebc7b408.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288488/wander-wisely/explore/wander-wisely/explore/new-york-ebc7b408.jpg",
  ],
  fez: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288491/wander-wisely/explore/wander-wisely/explore/fez-147ed4ac.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288491/wander-wisely/explore/wander-wisely/explore/fez-147ed4ac.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288491/wander-wisely/explore/wander-wisely/explore/fez-147ed4ac.jpg",
  ],
  vatican: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323175/wander-wisely/explore/vatican-22e637e3.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323175/wander-wisely/explore/vatican-22e637e3.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323175/wander-wisely/explore/vatican-22e637e3.png",
  ],
  jerusalem: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288499/wander-wisely/explore/wander-wisely/explore/jerusalem-30cb18ef.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288499/wander-wisely/explore/wander-wisely/explore/jerusalem-30cb18ef.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288499/wander-wisely/explore/wander-wisely/explore/jerusalem-30cb18ef.jpg",
  ],
  bali: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323186/wander-wisely/explore/bali-71c676df.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323186/wander-wisely/explore/bali-71c676df.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323186/wander-wisely/explore/bali-71c676df.png",
  ],
  mecca: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288667/wander-wisely/explore/wander-wisely/explore/mecca-56993cd3.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288667/wander-wisely/explore/wander-wisely/explore/mecca-56993cd3.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288667/wander-wisely/explore/wander-wisely/explore/mecca-56993cd3.jpg",
  ],
  maldives: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323196/wander-wisely/explore/maldives-cce7d7a0.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323196/wander-wisely/explore/maldives-cce7d7a0.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323196/wander-wisely/explore/maldives-cce7d7a0.png",
  ],
  santorini: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288514/wander-wisely/explore/wander-wisely/explore/santorini-8577f113.webp",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288514/wander-wisely/explore/wander-wisely/explore/santorini-8577f113.webp",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288514/wander-wisely/explore/wander-wisely/explore/santorini-8577f113.webp",
  ],
  phuket: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288672/wander-wisely/explore/wander-wisely/explore/phuket-243464b9.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288672/wander-wisely/explore/wander-wisely/explore/phuket-243464b9.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288672/wander-wisely/explore/wander-wisely/explore/phuket-243464b9.jpg",
  ],
  "swiss-alps": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288531/wander-wisely/explore/wander-wisely/explore/swiss-alps-addf694f.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288531/wander-wisely/explore/wander-wisely/explore/swiss-alps-addf694f.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288531/wander-wisely/explore/wander-wisely/explore/swiss-alps-addf694f.jpg",
  ],
  patagonia: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288540/wander-wisely/explore/wander-wisely/explore/patagonia-5e3778ea.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288540/wander-wisely/explore/wander-wisely/explore/patagonia-5e3778ea.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288540/wander-wisely/explore/wander-wisely/explore/patagonia-5e3778ea.jpg",
  ],
  "nepal-himalaya": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276421/wander-wisely/explore/nepal-himalaya-3a76efc0.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276421/wander-wisely/explore/nepal-himalaya-3a76efc0.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276421/wander-wisely/explore/nepal-himalaya-3a76efc0.jpg",
  ],
  amazon: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288554/wander-wisely/explore/wander-wisely/explore/amazon-a9d613ba.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288554/wander-wisely/explore/wander-wisely/explore/amazon-a9d613ba.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288554/wander-wisely/explore/wander-wisely/explore/amazon-a9d613ba.jpg",
  ],
  serengeti: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288563/wander-wisely/explore/wander-wisely/explore/serengeti-1af72d22.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288563/wander-wisely/explore/wander-wisely/explore/serengeti-1af72d22.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288563/wander-wisely/explore/wander-wisely/explore/serengeti-1af72d22.jpg",
  ],
  "great-barrier-reef": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288571/wander-wisely/explore/wander-wisely/explore/great-barrier-reef-55be382c.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288571/wander-wisely/explore/wander-wisely/explore/great-barrier-reef-55be382c.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288571/wander-wisely/explore/wander-wisely/explore/great-barrier-reef-55be382c.jpg",
  ],
  iceland: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323245/wander-wisely/explore/iceland-035a1f11.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323245/wander-wisely/explore/iceland-035a1f11.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323245/wander-wisely/explore/iceland-035a1f11.png",
  ],
  "new-zealand": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323247/wander-wisely/explore/new-zealand-3cf0251b.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323247/wander-wisely/explore/new-zealand-3cf0251b.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323247/wander-wisely/explore/new-zealand-3cf0251b.png",
  ],
  "costa-rica": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323248/wander-wisely/explore/costa-rica-56b3ef4f.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323248/wander-wisely/explore/costa-rica-56b3ef4f.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323248/wander-wisely/explore/costa-rica-56b3ef4f.png",
  ],
  queenstown: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288599/wander-wisely/explore/wander-wisely/explore/queenstown-d6331916.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288599/wander-wisely/explore/wander-wisely/explore/queenstown-d6331916.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288599/wander-wisely/explore/wander-wisely/explore/queenstown-d6331916.jpg",
  ],
  hampi: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288689/wander-wisely/explore/wander-wisely/explore/hampi-2e36db26.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288689/wander-wisely/explore/wander-wisely/explore/hampi-2e36db26.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288689/wander-wisely/explore/wander-wisely/explore/hampi-2e36db26.jpg",
  ],
  khajuraho: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276460/wander-wisely/explore/khajuraho-62386f7c.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276460/wander-wisely/explore/khajuraho-62386f7c.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276460/wander-wisely/explore/khajuraho-62386f7c.jpg",
  ],
  "kerala-backwaters": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288624/wander-wisely/explore/wander-wisely/explore/kerala-backwaters-66d49eca.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288624/wander-wisely/explore/wander-wisely/explore/kerala-backwaters-66d49eca.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288624/wander-wisely/explore/wander-wisely/explore/kerala-backwaters-66d49eca.jpg",
  ],
  munnar: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288633/wander-wisely/explore/wander-wisely/explore/munnar-f719d7a7.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288633/wander-wisely/explore/wander-wisely/explore/munnar-f719d7a7.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288633/wander-wisely/explore/wander-wisely/explore/munnar-f719d7a7.jpg",
  ],
  rishikesh: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288637/wander-wisely/explore/wander-wisely/explore/rishikesh-cac448cb.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288637/wander-wisely/explore/wander-wisely/explore/rishikesh-cac448cb.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288637/wander-wisely/explore/wander-wisely/explore/rishikesh-cac448cb.jpg",
  ],
  haridwar: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/Temple%2C%20Haridwar.jpg?width=1600",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Temple%2C%20Haridwar.jpg?width=1600",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Temple%2C%20Haridwar.jpg?width=1600",
  ],
  "ajanta-ellora": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288702/wander-wisely/explore/wander-wisely/explore/ajanta-ellora-868fa70b.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288702/wander-wisely/explore/wander-wisely/explore/ajanta-ellora-868fa70b.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288702/wander-wisely/explore/wander-wisely/explore/ajanta-ellora-868fa70b.jpg",
  ],
  "leh-ladakh": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288660/wander-wisely/explore/wander-wisely/explore/leh-ladakh-c88537a9.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288660/wander-wisely/explore/wander-wisely/explore/leh-ladakh-c88537a9.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288660/wander-wisely/explore/wander-wisely/explore/leh-ladakh-c88537a9.jpg",
  ],
  shimla: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288705/wander-wisely/explore/wander-wisely/explore/shimla-19b1f8f8.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288705/wander-wisely/explore/wander-wisely/explore/shimla-19b1f8f8.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288705/wander-wisely/explore/wander-wisely/explore/shimla-19b1f8f8.jpg",
  ],
  manali: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288706/wander-wisely/explore/wander-wisely/explore/manali-ae325c80.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288706/wander-wisely/explore/wander-wisely/explore/manali-ae325c80.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288706/wander-wisely/explore/wander-wisely/explore/manali-ae325c80.jpg",
  ],
  darjeeling: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776284058/wander-wisely/explore/darjeeling-44a1b6a7.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776284058/wander-wisely/explore/darjeeling-44a1b6a7.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776284058/wander-wisely/explore/darjeeling-44a1b6a7.jpg",
  ],
  bangalore: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323308/wander-wisely/explore/bangalore-63156411.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323308/wander-wisely/explore/bangalore-63156411.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323308/wander-wisely/explore/bangalore-63156411.jpg",
  ],
  madurai: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/Meenakshi%20Amman%20Temple%2C%20Madurai.jpg?width=1600",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Meenakshi%20Amman%20Temple%2C%20Madurai.jpg?width=1600",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Meenakshi%20Amman%20Temple%2C%20Madurai.jpg?width=1600",
  ],
  konark: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288693/wander-wisely/explore/wander-wisely/explore/konark-49dac3e4.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288693/wander-wisely/explore/wander-wisely/explore/konark-49dac3e4.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288693/wander-wisely/explore/wander-wisely/explore/konark-49dac3e4.jpg",
  ],
  "fatehpur-sikri": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288712/wander-wisely/explore/wander-wisely/explore/fatehpur-sikri-92a83303.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288712/wander-wisely/explore/wander-wisely/explore/fatehpur-sikri-92a83303.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288712/wander-wisely/explore/wander-wisely/explore/fatehpur-sikri-92a83303.jpg",
  ],
  coorg: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323336/wander-wisely/explore/coorg-9ab2ed0c.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323336/wander-wisely/explore/coorg-9ab2ed0c.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776323336/wander-wisely/explore/coorg-9ab2ed0c.jpg",
  ],
  andaman: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/Radhanagar%20Beach.jpg?width=1600",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Radhanagar%20Beach.jpg?width=1600",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Radhanagar%20Beach.jpg?width=1600",
  ],
  meghalaya: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Living%20Root%20Bridge%2C%20Meghalaya.jpg?width=1600",
    "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Living%20Root%20Bridge%2C%20Meghalaya.jpg?width=1600",
    "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Living%20Root%20Bridge%2C%20Meghalaya.jpg?width=1600",
  ],
  tirupati: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276544/wander-wisely/explore/tirupati-8c592708.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276544/wander-wisely/explore/tirupati-8c592708.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276544/wander-wisely/explore/tirupati-8c592708.jpg",
  ],
  jaisalmer: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288714/wander-wisely/explore/wander-wisely/explore/jaisalmer-733d7b52.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288714/wander-wisely/explore/wander-wisely/explore/jaisalmer-733d7b52.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288714/wander-wisely/explore/wander-wisely/explore/jaisalmer-733d7b52.jpg",
  ],
  jodhpur: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276556/wander-wisely/explore/jodhpur-b519fe3e.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276556/wander-wisely/explore/jodhpur-b519fe3e.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276556/wander-wisely/explore/jodhpur-b519fe3e.jpg",
  ],
  "valley-of-flowers": [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288720/wander-wisely/explore/wander-wisely/explore/valley-of-flowers-6fbe952f.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288720/wander-wisely/explore/wander-wisely/explore/valley-of-flowers-6fbe952f.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776288720/wander-wisely/explore/wander-wisely/explore/valley-of-flowers-6fbe952f.jpg",
  ],
  kolkata: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276569/wander-wisely/explore/kolkata-2d1c1b10.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276569/wander-wisely/explore/kolkata-2d1c1b10.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276569/wander-wisely/explore/kolkata-2d1c1b10.jpg",
  ],
  chennai: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276571/wander-wisely/explore/chennai-12908018.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276571/wander-wisely/explore/chennai-12908018.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276571/wander-wisely/explore/chennai-12908018.jpg",
  ],
  hyderabad: [
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276574/wander-wisely/explore/hyderabad-8a8b781e.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276574/wander-wisely/explore/hyderabad-8a8b781e.png",
    "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776276574/wander-wisely/explore/hyderabad-8a8b781e.png",
  ],
};

/** Fallback image when a destination-specific source fails. */
const CLOUD_FALLBACK = "https://res.cloudinary.com/dihhuyjjt/image/upload/v1776286794/wander-wisely/explore/wander-wisely/explore/angkor-wat-8f0f9f8f.jpg";

/** Helper: 3 images for a destination (card + gallery). */
const imgs = (id: string): string[] =>
  DESTINATION_IMAGES[id] ?? [CLOUD_FALLBACK, CLOUD_FALLBACK, CLOUD_FALLBACK];

export const destinations: Destination[] = [
  // —— History (15–20) ——
  {
    id: "angkor-wat",
    name: "Angkor Wat, Cambodia",
    category: "History",
    rating: 4.9,
    shortDescription: "The world's largest religious monument and a masterpiece of Khmer architecture.",
    about:
      "Angkor Wat was built in the early 12th century by the Khmer king Suryavarman II. Originally dedicated to the Hindu god Vishnu, it later became a Buddhist temple. It symbolises Mount Meru, the sacred centre of the universe in Hindu and Buddhist cosmology. Today it is a UNESCO World Heritage Site and a powerful symbol of Cambodia's history.",
    images: imgs("angkor-wat"),
  },
  {
    id: "machu-picchu",
    name: "Machu Picchu, Peru",
    category: "History",
    rating: 4.9,
    shortDescription: "Inca citadel high in the Andes and one of the New Seven Wonders of the World.",
    about:
      "Machu Picchu was built in the 15th century under the Inca emperor Pachacuti. It was an estate and ceremonial site, abandoned during the Spanish conquest and unknown to the outside world until 1911. Its precise purpose remains debated, but it reflects the Inca's advanced engineering and reverence for the landscape. It became a UNESCO World Heritage Site in 1983.",
    images: imgs("machu-picchu"),
  },
  {
    id: "petra",
    name: "Petra, Jordan",
    category: "History",
    rating: 4.9,
    shortDescription: "Ancient Nabataean city famous for its rock-cut architecture and the Treasury.",
    about:
      "Petra was the capital of the Nabataean kingdom from around the 4th century BCE. The city was carved into red sandstone cliffs and controlled important trade routes. The Romans annexed it in 106 CE. It was largely forgotten in the West until the 19th century. Today it is a UNESCO World Heritage Site and one of the New Seven Wonders of the World.",
    images: imgs("petra"),
  },
  {
    id: "colosseum",
    name: "Colosseum, Italy",
    category: "History",
    rating: 4.8,
    shortDescription: "Iconic Roman amphitheatre and symbol of ancient Rome.",
    about:
      "The Colosseum (or Flavian Amphitheatre) was completed in 80 CE under the emperor Titus, after construction began under his father Vespasian around 72 CE. It could hold an estimated 50,000 to 80,000 spectators, who gathered for gladiatorial contests, animal hunts (venationes), mock sea battles, and public executions. The building is elliptical, with a complex system of vaults and arches that allowed quick entry and exit. It is the largest ancient amphitheatre ever built and remains one of the finest examples of Roman engineering and power.\n\n" +
      "The exterior had three tiers of arches, with columns in the Doric, Ionic, and Corinthian orders. Much of the outer wall and the original marble seating are now lost due to earthquakes and later reuse of the stone for other buildings in Rome. Despite this, the Colosseum is still an iconic symbol of the city and of ancient Rome. It has been a UNESCO World Heritage Site since 1980 and is one of the New Seven Wonders of the World. Today it is one of the most visited tourist sites in Italy and is used as a powerful symbol of the endurance of Roman culture and history.",
    images: imgs("colosseum"),
  },
  {
    id: "acropolis",
    name: "Acropolis, Greece",
    category: "History",
    rating: 4.9,
    shortDescription: "Ancient citadel in Athens dominated by the Parthenon.",
    about:
      "The Acropolis has been inhabited since prehistoric times. In the 5th century BCE, under Pericles, it was rebuilt with the Parthenon and other temples dedicated to Athena. It represents the peak of classical Greek art and democracy. Damaged and repurposed over the centuries, it is now a UNESCO World Heritage Site and a symbol of Western civilisation.",
    images: imgs("acropolis"),
  },
  {
    id: "pompeii",
    name: "Pompeii, Italy",
    category: "History",
    rating: 4.8,
    shortDescription: "Roman city preserved by the eruption of Mount Vesuvius in 79 CE.",
    about:
      "Pompeii was a prosperous Roman town until it was buried under volcanic ash and pumice when Vesuvius erupted in 79 CE. The site lay largely undisturbed for centuries, preserving buildings, art, and everyday objects. Excavations began in the 18th century and continue today. Pompeii offers an unparalleled glimpse into Roman life.",
    images: imgs("pompeii"),
  },
  {
    id: "kyoto",
    name: "Kyoto, Japan",
    category: "History",
    rating: 4.8,
    shortDescription: "Ancient capital with temples, bamboo forests, and tea ceremonies.",
    about:
      "Kyoto was the imperial capital of Japan from 794 until 1868. It is home to hundreds of temples and shrines, including Kinkaku-ji and Fushimi Inari. Its historic monuments are collectively a UNESCO World Heritage Site. Kyoto remains the heart of traditional Japanese culture, from geisha districts to tea houses and gardens.",
    images: imgs("kyoto"),
  },
  {
    id: "varanasi",
    name: "Varanasi, India",
    category: "History",
    rating: 4.7,
    shortDescription: "One of the world's oldest continually inhabited cities and a sacred Hindu site.",
    about:
      "Varanasi, on the banks of the Ganges, has been a centre of pilgrimage and learning for over three millennia. It is sacred to Shiva and is believed to grant liberation from the cycle of rebirth. The ghats, temples, and narrow lanes reflect layers of history. It remains a living symbol of Hindu spiritual and cultural tradition.",
    images: imgs("varanasi"),
  },
  {
    id: "rome",
    name: "Rome, Italy",
    category: "History",
    rating: 4.8,
    shortDescription: "Eternal City with ancient ruins, Renaissance art, and the Vatican.",
    about:
      "Rome was the capital of the Roman Republic and Empire and later the heart of the Renaissance and the Catholic Church. From the Forum and Colosseum to St Peter's and the Sistine Chapel, its layers of history span over two and a half millennia. The historic centre is a UNESCO World Heritage Site.",
    images: imgs("rome"),
  },
  {
    id: "istanbul",
    name: "Istanbul, Turkey",
    category: "History",
    rating: 4.8,
    shortDescription: "Former Byzantium and Constantinople; where Europe meets Asia.",
    about:
      "Istanbul has been a major city for over two millennia, serving as capital of the Roman, Byzantine, and Ottoman empires. Hagia Sophia, the Blue Mosque, and the Topkapi Palace reflect its layered past. The historic areas are a UNESCO World Heritage Site. The city remains a cultural and economic bridge between continents.",
    images: imgs("istanbul"),
  },
  {
    id: "prague",
    name: "Prague, Czech Republic",
    category: "History",
    rating: 4.7,
    shortDescription: "Medieval Old Town, castle, and Gothic architecture.",
    about:
      "Prague's historic centre has been a political and cultural hub since the Middle Ages. The Prague Castle, Charles Bridge, and Old Town Square survived wars and modernisation. The city was the seat of Holy Roman emperors and the heart of the Bohemian Reformation. Its monuments are a UNESCO World Heritage Site.",
    images: imgs("prague"),
  },
  {
    id: "cairo",
    name: "Cairo, Egypt",
    category: "History",
    rating: 4.7,
    shortDescription: "Home to the Pyramids of Giza and the Egyptian Museum.",
    about:
      "Cairo has been the political and cultural centre of Egypt for over a thousand years. Nearby Giza is home to the Great Pyramid and the Sphinx, built in the 26th century BCE. Islamic Cairo preserves medieval mosques and bazaars. The city sits at the crossroads of African, Mediterranean, and Islamic history.",
    images: imgs("cairo"),
  },
  {
    id: "fez",
    name: "Fez, Morocco",
    category: "History",
    rating: 4.7,
    shortDescription: "Medina, madrasas, and one of the world's oldest universities.",
    about:
      "Fez was founded in the 8th century and became a centre of learning and trade. Its medina, Fes el-Bali, is one of the largest car-free urban areas in the world and a UNESCO World Heritage Site. The University of al-Qarawiyyin is often cited as the oldest degree-granting university. The city preserves centuries of Islamic and Andalusian culture.",
    images: imgs("fez"),
  },
  {
    id: "vatican",
    name: "Vatican City",
    category: "History",
    rating: 4.9,
    shortDescription: "Smallest sovereign state and heart of the Catholic Church.",
    about:
      "Vatican City is the seat of the Pope and the centre of the Roman Catholic Church. St Peter's Basilica and the Vatican Museums, including the Sistine Chapel, hold some of the world's most important art and architecture. The state was established in 1929. Its cultural and religious significance draws millions of visitors each year.",
    images: imgs("vatican"),
  },
  {
    id: "jerusalem",
    name: "Jerusalem, Israel",
    category: "History",
    rating: 4.8,
    shortDescription: "Sacred to Judaism, Christianity, and Islam; ancient walled Old City.",
    about:
      "Jerusalem has been central to three major religions for millennia. The Old City contains the Western Wall, the Church of the Holy Sepulchre, and the Dome of the Rock. It has been fought over and rebuilt countless times. Its historic quarters are a UNESCO World Heritage Site and remain a living centre of faith and pilgrimage.",
    images: imgs("jerusalem"),
  },
  // —— Spiritual (reuse + add) ——
  {
    id: "bali",
    name: "Bali, Indonesia",
    category: "Spiritual",
    rating: 4.8,
    shortDescription: "Tropical paradise with Hindu temples, rice terraces, and beaches.",
    about:
      "Bali is the only majority-Hindu province in Indonesia. Its temples, ceremonies, and arts reflect a distinct blend of Hindu and local tradition. The island's landscapes range from volcanic peaks to rice terraces and coastlines. Tourism has grown strongly, but many villages still observe daily rituals and traditional crafts.",
    images: imgs("bali"),
  },
  {
    id: "mecca",
    name: "Mecca, Saudi Arabia",
    category: "Spiritual",
    rating: 4.9,
    shortDescription: "Birthplace of Islam and the holiest city for Muslims.",
    about:
      "Mecca is the birthplace of the Prophet Muhammad and the direction of Muslim prayer. The Kaaba, in the Masjid al-Haram, is Islam's most sacred site. The annual Hajj pilgrimage brings millions of Muslims from around the world. Access is restricted to Muslims; the city's history and faith make it central to Islamic identity.",
    images: imgs("mecca"),
  },
  // —— Beaches ——
  {
    id: "maldives",
    name: "Maldives",
    category: "Beaches",
    rating: 4.9,
    shortDescription: "Crystal-clear waters and overwater bungalows.",
    about:
      "The Maldives is an island nation in the Indian Ocean known for its atolls, coral reefs, and luxury resorts. Tourism and fishing are central to the economy. The country faces significant challenges from climate change and sea-level rise. Its marine life and clear waters make it a major destination for diving and relaxation.",
    images: imgs("maldives"),
  },
  {
    id: "santorini",
    name: "Santorini, Greece",
    category: "Beaches",
    rating: 4.8,
    shortDescription: "White villages on volcanic cliffs above the Aegean.",
    about:
      "Santorini is a volcanic island in the Cyclades. Its dramatic caldera, whitewashed buildings, and sunset views attract millions of visitors. The island has been shaped by one of the largest volcanic eruptions in recorded history. Today it is known for wine, archaeology, and its distinctive cliff-top towns.",
    images: imgs("santorini"),
  },
  {
    id: "phuket",
    name: "Phuket, Thailand",
    category: "Beaches",
    rating: 4.7,
    shortDescription: "Beaches, nightlife, and gateway to the Andaman Sea.",
    about:
      "Phuket is Thailand's largest island and a major tourist destination. Its west coast has popular beaches and resorts; the interior has forests and cultural sites. The island blends Thai, Chinese, and Portuguese influences. It serves as a base for diving, island-hopping, and exploring the Andaman region.",
    images: imgs("phuket"),
  },
  // —— Mountains ——
  {
    id: "swiss-alps",
    name: "Swiss Alps",
    category: "Mountains",
    rating: 4.9,
    shortDescription: "Majestic peaks and world-class skiing.",
    about:
      "The Swiss Alps cover a large part of Switzerland and extend into neighbouring countries. They are home to iconic peaks such as the Matterhorn and Jungfrau, and to skiing, hiking, and mountaineering. Alpine culture, cheese-making, and sustainable tourism are central to the region's identity and economy.",
    images: imgs("swiss-alps"),
  },
  {
    id: "patagonia",
    name: "Patagonia, Argentina",
    category: "Mountains",
    rating: 4.8,
    shortDescription: "Dramatic glaciers and towering granite peaks.",
    about:
      "Patagonia spans southern Argentina and Chile and is known for its vast, windswept landscapes. Glaciers, such as Perito Moreno, fjords, and the Andes draw adventurers and nature lovers. The region has a small population and a strong identity tied to ranching, conservation, and outdoor recreation.",
    images: imgs("patagonia"),
  },
  {
    id: "nepal-himalaya",
    name: "Himalayas, Nepal",
    category: "Mountains",
    rating: 4.9,
    shortDescription: "Home to Everest and ancient trekking routes.",
    about:
      "The Himalayas in Nepal include Mount Everest and some of the world's highest peaks. The region is deeply tied to Sherpa culture and Buddhism. Trekking routes such as the Everest Base Camp and Annapurna circuits attract thousands each year. The mountains are central to Nepal's identity, religion, and tourism.",
    images: imgs("nepal-himalaya"),
  },
  // —— Cities ——
  {
    id: "paris",
    name: "Paris, France",
    category: "Cities",
    rating: 4.8,
    shortDescription: "Art, fashion, and the Eiffel Tower.",
    about:
      "Paris has been a global centre of culture, politics, and ideas for centuries. Its museums, from the Louvre to the Musée d'Orsay, hold some of the world's greatest art. The city's boulevards, cafés, and monuments define its image. It remains one of the most visited cities and a symbol of European culture.",
    images: imgs("paris"),
  },
  {
    id: "tokyo",
    name: "Tokyo, Japan",
    category: "Cities",
    rating: 4.8,
    shortDescription: "Neon streets, temples, and cutting-edge culture.",
    about:
      "Tokyo is Japan's capital and one of the world's largest cities. It blends ancient shrines and gardens with ultra-modern districts. The city has been the political centre of Japan since the 17th century. Its food, fashion, and technology make it a major global destination.",
    images: imgs("tokyo"),
  },
  {
    id: "new-york",
    name: "New York City, USA",
    category: "Cities",
    rating: 4.7,
    shortDescription: "Skyscrapers, Broadway, and the Statue of Liberty.",
    about:
      "New York City is the most populous city in the United States and a global hub of finance, culture, and media. Its skyline, museums, theatres, and neighbourhoods are recognised worldwide. The city has been a gateway for immigration and a centre of innovation for over two centuries.",
    images: imgs("new-york"),
  },
  {
    id: "london",
    name: "London, United Kingdom",
    category: "Cities",
    rating: 4.8,
    shortDescription: "Historic capital with museums, palaces, and diversity.",
    about:
      "London has been a major city for two millennia and is the capital of the United Kingdom. Its landmarks include the Tower of London, Buckingham Palace, and the British Museum. The city is a global financial centre and one of the most culturally diverse in the world.",
    images: imgs("london"),
  },
  {
    id: "barcelona",
    name: "Barcelona, Spain",
    category: "Cities",
    rating: 4.8,
    shortDescription: "Gaudí, Gothic Quarter, and Mediterranean life.",
    about:
      "Barcelona is the capital of Catalonia and one of Spain's most visited cities. The works of Antoni Gaudí, including the Sagrada Família, define much of its image. The Gothic Quarter and the Ramblas reflect centuries of history. The city combines beach, culture, and a strong regional identity.",
    images: imgs("barcelona"),
  },
  // —— Nature ——
  {
    id: "amazon",
    name: "Amazon Rainforest",
    category: "Nature",
    rating: 4.6,
    shortDescription: "The world's largest tropical rainforest.",
    about:
      "The Amazon basin spans several South American countries and contains the largest tropical rainforest on Earth. It hosts an enormous variety of plants and animals and plays a vital role in global climate and water cycles. Deforestation and climate change pose serious threats. Conservation and sustainable use remain critical.",
    images: imgs("amazon"),
  },
  {
    id: "serengeti",
    name: "Serengeti, Tanzania",
    category: "Nature",
    rating: 4.9,
    shortDescription: "Vast plains and the great wildebeest migration.",
    about:
      "The Serengeti is a UNESCO World Heritage Site and one of the most famous wildlife areas on Earth. Its grasslands support large populations of wildebeest, zebras, and predators. The annual migration is one of the natural world's great spectacles. The ecosystem is closely linked with the Maasai Mara in Kenya.",
    images: imgs("serengeti"),
  },
  {
    id: "great-barrier-reef",
    name: "Great Barrier Reef, Australia",
    category: "Nature",
    rating: 4.8,
    shortDescription: "World's largest coral reef system.",
    about:
      "The Great Barrier Reef is the largest coral reef system on Earth and a UNESCO World Heritage Site. It supports a huge diversity of marine life and is vital to the region's ecology and economy. Climate change, pollution, and other pressures threaten the reef. Conservation and sustainable tourism are priorities.",
    images: imgs("great-barrier-reef"),
  },
  {
    id: "iceland",
    name: "Iceland",
    category: "Nature",
    rating: 4.8,
    shortDescription: "Volcanoes, glaciers, and the Northern Lights.",
    about:
      "Iceland sits on the Mid-Atlantic Ridge and is one of the most volcanically active places on Earth. Glaciers, geysers, waterfalls, and black-sand beaches draw visitors year-round. The population is small and concentrated; much of the island remains wild. Sustainable tourism and energy are central to national policy.",
    images: imgs("iceland"),
  },
  // —— Adventure ——
  {
    id: "new-zealand",
    name: "New Zealand",
    category: "Adventure",
    rating: 4.9,
    shortDescription: "Mountains, fjords, and filming location for Middle-earth.",
    about:
      "New Zealand's landscapes range from alpine peaks to fjords, beaches, and rainforests. It is known for outdoor activities such as hiking, skiing, and bungee jumping. Māori culture is an integral part of national identity. The country has been used as a backdrop for major films and is a major adventure-travel destination.",
    images: imgs("new-zealand"),
  },
  {
    id: "costa-rica",
    name: "Costa Rica",
    category: "Adventure",
    rating: 4.7,
    shortDescription: "Rainforests, volcanoes, and ecotourism.",
    about:
      "Costa Rica is known for its biodiversity and commitment to conservation. Much of the country is protected in national parks and reserves. Activities include zip-lining, rafting, wildlife watching, and beach visits. Stable democracy and ecotourism have made it a model for sustainable travel in Central America.",
    images: imgs("costa-rica"),
  },
  {
    id: "queenstown",
    name: "Queenstown, New Zealand",
    category: "Adventure",
    rating: 4.8,
    shortDescription: "Adventure capital with skiing, bungee, and lake scenery.",
    about:
      "Queenstown sits on the shores of Lake Wakatipu and is surrounded by the Southern Alps. It is known as the birthplace of commercial bungee jumping and offers skiing, hiking, and water sports. The town attracts thrill-seekers and nature lovers and is a gateway to Fiordland and other South Island highlights.",
    images: imgs("queenstown"),
  },
  // —— India (25) ——
  {
    id: "taj-mahal",
    name: "Taj Mahal, Agra",
    category: "History",
    rating: 4.9,
    shortDescription: "Iconic white-marble mausoleum and symbol of love.",
    about:
      "The Taj Mahal was built by the Mughal emperor Shah Jahan in memory of his wife Mumtaz Mahal. Construction began in 1632 and took about 22 years. The complex combines Persian, Islamic, and Indian influences and is set in formal gardens. It is a UNESCO World Heritage Site and one of the New Seven Wonders of the World.",
    images: imgs("taj-mahal"),
  },
  {
    id: "jaipur",
    name: "Jaipur, Rajasthan",
    category: "Cities",
    rating: 4.8,
    shortDescription: "Pink City with forts, palaces, and bazaars.",
    about:
      "Jaipur was founded in 1727 by Maharaja Sawai Jai Singh II and is the capital of Rajasthan. The city is known for its pink-washed buildings, the City Palace, Hawa Mahal, and Amber Fort. It forms part of the Golden Triangle with Delhi and Agra and is a gateway to Rajasthan's desert and heritage towns.",
    images: imgs("jaipur"),
  },
  {
    id: "udaipur",
    name: "Udaipur, Rajasthan",
    category: "Cities",
    rating: 4.8,
    shortDescription: "City of Lakes with palaces and lake views.",
    about:
      "Udaipur was founded in 1559 by Maharana Udai Singh II. The City Palace overlooks Lake Pichola, and the lake palaces and ghats give the city a romantic reputation. Udaipur is known for crafts, classical music, and as a setting for heritage hotels and cultural events.",
    images: imgs("udaipur"),
  },
  {
    id: "hampi",
    name: "Hampi, Karnataka",
    category: "History",
    rating: 4.8,
    shortDescription: "Ruins of the Vijayanagara Empire and boulder landscapes.",
    about:
      "Hampi was the capital of the Vijayanagara Empire from the 14th to 16th centuries. The site has hundreds of monuments: temples, markets, and royal structures set among giant boulders. It was sacked in 1565 and is now a UNESCO World Heritage Site and a major archaeological and tourist destination.",
    images: imgs("hampi"),
  },
  {
    id: "khajuraho",
    name: "Khajuraho, Madhya Pradesh",
    category: "History",
    rating: 4.7,
    shortDescription: "Temple complex famous for Nagara architecture and sculpture.",
    about:
      "The Khajuraho temples were built by the Chandela dynasty between the 10th and 12th centuries. About 25 temples survive, known for intricate carvings and Nagara-style architecture. The site is a UNESCO World Heritage Site and reflects the sophistication of medieval Hindu temple art.",
    images: imgs("khajuraho"),
  },
  {
    id: "kerala-backwaters",
    name: "Kerala Backwaters",
    category: "Nature",
    rating: 4.8,
    shortDescription: "Network of lagoons, lakes, and canals along the coast.",
    about:
      "The Kerala backwaters are a chain of brackish lagoons and lakes linked by canals, running parallel to the Arabian Sea. Houseboat cruises, village life, and coconut groves define the experience. The ecosystem supports fishing and agriculture and is one of India's most distinctive natural and cultural landscapes.",
    images: imgs("kerala-backwaters"),
  },
  {
    id: "munnar",
    name: "Munnar, Kerala",
    category: "Nature",
    rating: 4.8,
    shortDescription: "Tea plantations and cool hills in the Western Ghats.",
    about:
      "Munnar is a hill station in the Western Ghats, known for tea estates established in the late 19th century. The landscape of rolling green hills, Neelakurinji blooms, and wildlife sanctuaries attracts nature lovers. It remains a major tea-producing region and a popular retreat from the plains.",
    images: imgs("munnar"),
  },
  {
    id: "rishikesh",
    name: "Rishikesh, Uttarakhand",
    category: "Spiritual",
    rating: 4.7,
    shortDescription: "Yoga capital and gateway to the Himalayas on the Ganges.",
    about:
      "Rishikesh sits at the foothills of the Himalayas where the Ganges leaves the mountains. It is known for ashrams, yoga centres, and as the gateway to Char Dham pilgrimages. Adventure activities such as rafting and bungee jumping have grown alongside its spiritual reputation.",
    images: imgs("rishikesh"),
  },
  {
    id: "haridwar",
    name: "Haridwar, Uttarakhand",
    category: "Spiritual",
    rating: 4.7,
    shortDescription: "Sacred city where the Ganges enters the plains.",
    about:
      "Haridwar is one of the seven holiest cities in Hinduism. The evening Ganga Aarti at Har Ki Pauri draws thousands. The city is a gateway to pilgrimage sites in Uttarakhand and hosts the Kumbh Mela every 12 years. It has been a centre of devotion and learning for centuries.",
    images: imgs("haridwar"),
  },
  {
    id: "amritsar",
    name: "Amritsar, Punjab",
    category: "Spiritual",
    rating: 4.8,
    shortDescription: "Home of the Golden Temple and Sikh faith.",
    about:
      "Amritsar is the spiritual and cultural centre of Sikhism. The Harmandir Sahib (Golden Temple) was built in the 16th century and is the holiest gurdwara. The city also has the Jallianwala Bagh memorial and the Wagah border ceremony. It attracts pilgrims and visitors from around the world.",
    images: imgs("amritsar"),
  },
  {
    id: "ajanta-ellora",
    name: "Ajanta & Ellora Caves, Maharashtra",
    category: "History",
    rating: 4.9,
    shortDescription: "Rock-cut Buddhist, Hindu, and Jain cave monuments.",
    about:
      "The Ajanta Caves (2nd century BCE–6th century CE) contain Buddhist paintings and sculpture. The Ellora Caves (6th–10th centuries) include Buddhist, Hindu, and Jain temples carved from rock, including the Kailasa temple. Both are UNESCO World Heritage Sites and masterpieces of Indian art.",
    images: imgs("ajanta-ellora"),
  },
  {
    id: "goa",
    name: "Goa",
    category: "Beaches",
    rating: 4.7,
    shortDescription: "Beaches, Portuguese heritage, and laid-back coastal life.",
    about:
      "Goa was a Portuguese colony for over 450 years until 1961. Its beaches, churches, and Indo-Portuguese architecture attract tourists from India and abroad. The state blends Hindu and Catholic traditions, seafood cuisine, and a relaxed coastal culture. It is one of India's top beach and heritage destinations.",
    images: imgs("goa"),
  },
  {
    id: "darjeeling",
    name: "Darjeeling, West Bengal",
    category: "Mountains",
    rating: 4.8,
    shortDescription: "Tea gardens, toy train, and views of Kanchenjunga.",
    about:
      "Darjeeling is a hill station in the Eastern Himalayas, famous for tea, the Darjeeling Himalayan Railway (a UNESCO World Heritage Site), and views of Kanchenjunga. The town was developed by the British in the 19th century and remains a popular retreat with a distinct cultural mix.",
    images: imgs("darjeeling"),
  },
  {
    id: "leh-ladakh",
    name: "Leh-Ladakh",
    category: "Mountains",
    rating: 4.9,
    shortDescription: "High-altitude desert, monasteries, and mountain passes.",
    about:
      "Ladakh is a high-altitude region in the northern Indian Himalayas, with Leh as its main town. Buddhist monasteries, stark landscapes, and high passes such as Khardung La draw adventurers and culture travellers. The region was opened to tourism in the 1970s and is known for sustainable and responsible tourism initiatives.",
    images: imgs("leh-ladakh"),
  },
  {
    id: "shimla",
    name: "Shimla, Himachal Pradesh",
    category: "Mountains",
    rating: 4.7,
    shortDescription: "Former summer capital with colonial buildings and hills.",
    about:
      "Shimla was the summer capital of British India from 1864. The Mall, Christ Church, and Victorian-era buildings define its character. It remains the capital of Himachal Pradesh and a major hill station for holidays, trekking, and winter tourism.",
    images: imgs("shimla"),
  },
  {
    id: "manali",
    name: "Manali, Himachal Pradesh",
    category: "Mountains",
    rating: 4.7,
    shortDescription: "Gateway to Rohtang Pass and adventure activities.",
    about:
      "Manali lies in the Kullu Valley and is a base for skiing, trekking, and trips to Rohtang Pass and Solang Valley. The town has temples, apple orchards, and a mix of backpacker and resort tourism. It is one of the most visited hill stations in North India.",
    images: imgs("manali"),
  },
  {
    id: "mumbai",
    name: "Mumbai, Maharashtra",
    category: "Cities",
    rating: 4.7,
    shortDescription: "India's financial capital, Bollywood, and Gateway of India.",
    about:
      "Mumbai is India's most populous city and its financial and entertainment hub. The Gateway of India, Chhatrapati Shivaji Terminus, and Marine Drive are landmarks. The city is the centre of the Hindi film industry (Bollywood) and has a diverse, fast-paced urban culture.",
    images: imgs("mumbai"),
  },
  {
    id: "delhi",
    name: "Delhi",
    category: "Cities",
    rating: 4.7,
    shortDescription: "Capital city with Mughal and British-era monuments.",
    about:
      "Delhi has been a major political centre for centuries. It includes Old Delhi (Red Fort, Jama Masjid, bazaars) and New Delhi (Rashtrapati Bhavan, India Gate). The city blends Mughal, colonial, and modern architecture and is the seat of the Government of India.",
    images: imgs("delhi"),
  },
  {
    id: "bangalore",
    name: "Bengaluru, Karnataka",
    category: "Cities",
    rating: 4.7,
    shortDescription: "Garden City and India's tech hub.",
    about:
      "Bengaluru (Bangalore) is the capital of Karnataka and India's leading technology hub. The city has a moderate climate, parks, and a mix of historic sites and modern campuses. It is known for startups, IT, and a cosmopolitan culture that draws professionals and tourists alike.",
    images: imgs("bangalore"),
  },
  {
    id: "madurai",
    name: "Madurai, Tamil Nadu",
    category: "Spiritual",
    rating: 4.8,
    shortDescription: "Temple city and home of Meenakshi Amman Temple.",
    about:
      "Madurai is one of the oldest continuously inhabited cities in India. The Meenakshi Amman Temple is a vast Dravidian complex with gopurams and halls. The city has been a centre of Tamil culture, religion, and learning for over two millennia and remains a major pilgrimage destination.",
    images: imgs("madurai"),
  },
  {
    id: "konark",
    name: "Konark Sun Temple, Odisha",
    category: "History",
    rating: 4.8,
    shortDescription: "13th-century Sun Temple in the form of a chariot.",
    about:
      "The Konark Sun Temple was built in the 13th century by King Narasimhadeva I. The temple is designed as a giant chariot for the sun god Surya, with stone wheels and sculptures. It is a UNESCO World Heritage Site and a masterpiece of Odisha's temple architecture.",
    images: imgs("konark"),
  },
  {
    id: "fatehpur-sikri",
    name: "Fatehpur Sikri, Uttar Pradesh",
    category: "History",
    rating: 4.7,
    shortDescription: "Mughal capital city built by Akbar.",
    about:
      "Fatehpur Sikri was built by the Mughal emperor Akbar as his capital in the late 16th century. The complex includes the Buland Darwaza, Jama Masjid, and palaces. The city was abandoned soon after due to water shortage. It is a UNESCO World Heritage Site and a fine example of Mughal planning and architecture.",
    images: imgs("fatehpur-sikri"),
  },
  {
    id: "coorg",
    name: "Coorg, Karnataka",
    category: "Nature",
    rating: 4.8,
    shortDescription: "Coffee plantations, misty hills, and Kodava culture.",
    about:
      "Coorg (Kodagu) is a district in the Western Ghats known for coffee and pepper plantations, waterfalls, and forest reserves. The Kodava people have a distinct culture and cuisine. The region offers trekking, wildlife, and homestays and is a popular escape from Bengaluru.",
    images: imgs("coorg"),
  },
  {
    id: "andaman",
    name: "Andaman and Nicobar Islands",
    category: "Beaches",
    rating: 4.8,
    shortDescription: "Pristine beaches, coral reefs, and colonial history.",
    about:
      "The Andaman and Nicobar Islands lie in the Bay of Bengal. They offer clear waters, diving, and beaches such as Radhanagar. The islands have a colonial past (Cellular Jail at Port Blair) and unique tribal communities. Tourism is regulated to protect ecology and indigenous people.",
    images: imgs("andaman"),
  },
  {
    id: "meghalaya",
    name: "Meghalaya",
    category: "Nature",
    rating: 4.8,
    shortDescription: "Living root bridges, waterfalls, and wettest places on Earth.",
    about:
      "Meghalaya is a state in Northeast India known for Cherrapunji and Mawsynram, among the wettest places on Earth. The living root bridges of the Khasi Hills are grown from rubber fig trees. The state has waterfalls, caves, and a distinct matrilineal culture. Ecotourism and trekking are growing.",
    images: imgs("meghalaya"),
  },
  {
    id: "tirupati",
    name: "Tirupati, Andhra Pradesh",
    category: "Spiritual",
    rating: 4.8,
    shortDescription: "Venkateswara Temple and one of the busiest pilgrimage sites.",
    about:
      "Tirupati is home to the Sri Venkateswara Temple at Tirumala, one of the richest and most visited Hindu temples. The temple is on the Seven Hills and draws millions of devotees each year. The town is a major pilgrimage centre in South India with a long history of patronage and devotion.",
    images: imgs("tirupati"),
  },
  {
    id: "jaisalmer",
    name: "Jaisalmer, Rajasthan",
    category: "Cities",
    rating: 4.7,
    shortDescription: "Golden City in the Thar Desert with fort and havelis.",
    about:
      "Jaisalmer rises from the Thar Desert with a living fort, havelis, and camel safaris. The city was a trading post on caravan routes. Its yellow sandstone buildings give it the name Golden City. Desert camps and cultural festivals make it a highlight of Rajasthan tourism.",
    images: imgs("jaisalmer"),
  },
  {
    id: "jodhpur",
    name: "Jodhpur, Rajasthan",
    category: "Cities",
    rating: 4.7,
    shortDescription: "Blue City dominated by Mehrangarh Fort.",
    about:
      "Jodhpur is the second-largest city in Rajasthan. Mehrangarh Fort overlooks the blue-painted old city. The old town has markets, step wells, and palaces. Jodhpur is a gateway to the desert and is known for handicrafts, festivals, and heritage hotels.",
    images: imgs("jodhpur"),
  },
  {
    id: "valley-of-flowers",
    name: "Valley of Flowers, Uttarakhand",
    category: "Nature",
    rating: 4.8,
    shortDescription: "UNESCO park with alpine meadows and endemic flowers.",
    about:
      "The Valley of Flowers National Park is a high-altitude meadow in the Himalayas, designated a UNESCO World Heritage Site. It blooms with hundreds of species of alpine flowers in the monsoon. The park is linked to Hindu mythology and is reached by trek from Govindghat. Access is seasonal.",
    images: imgs("valley-of-flowers"),
  },
  {
    id: "kolkata",
    name: "Kolkata, West Bengal",
    category: "Cities",
    rating: 4.6,
    shortDescription: "Former colonial capital with literature, art, and culture.",
    about:
      "Kolkata was the capital of British India until 1911. The city is known for the Howrah Bridge, Victoria Memorial, Durga Puja, and a strong tradition of literature, theatre, and art. Street food, trams, and colonial buildings define its character. It remains the cultural capital of East India.",
    images: imgs("kolkata"),
  },
  {
    id: "chennai",
    name: "Chennai, Tamil Nadu",
    category: "Cities",
    rating: 4.6,
    shortDescription: "Gateway to South India with temples and Marina Beach.",
    about:
      "Chennai is the capital of Tamil Nadu and a major port and industrial city. The Kapaleeshwarar Temple, Fort St George, and Marina Beach are landmarks. The city is a centre of Carnatic music, Bharatanatyam, and Tamil cinema (Kollywood) and is the gateway to Tamil Nadu's temples and hill stations.",
    images: imgs("chennai"),
  },
  {
    id: "hyderabad",
    name: "Hyderabad, Telangana",
    category: "Cities",
    rating: 4.6,
    shortDescription: "City of Pearls with Charminar and biryani.",
    about:
      "Hyderabad was the capital of the Nizams of Hyderabad and is now the capital of Telangana. The Charminar, Golconda Fort, and Hussain Sagar are key landmarks. The city is known for pearls, biryani, and a blend of Telugu and Deccani culture. It is also a major IT and pharma hub.",
    images: imgs("hyderabad"),
  },
];

/** All categories for filter UI; "All" is a special value. */
export const EXPLORE_CATEGORIES = ["All", "Beaches", "Mountains", "Cities", "Nature", "Spiritual", "History", "Adventure"] as const;

export function getDestinationById(id: string): Destination | undefined {
  return destinations.find((d) => d.id === id);
}
