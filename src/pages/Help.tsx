import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Compass,
  ListTodo,
  FolderOpen,
  Ticket,
  Car,
  UtensilsCrossed,
  Users,
  ChevronDown,
} from "lucide-react";
import Layout from "@/components/Layout";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

const sections = [
  {
    icon: Sparkles,
    title: "AI Trip Planner",
    path: "/plan-trip",
    body: "Get personalized day-by-day itineraries powered by AI.",
    steps: [
      "Go to Plan a Trip from the home page or the Explore menu.",
      "Enter your destination, travel dates, and preferences (e.g. pace, interests).",
      "Click Generate to create your itinerary. The AI suggests activities, timings, and tips.",
      "Review the plan; you can regenerate or adjust dates and try again.",
      "Save your trip to access it later under My Plan and My Trips.",
    ],
  },
  {
    icon: Compass,
    title: "Explore Destinations",
    path: "/explore",
    body: "Browse curated places by category: History, Nature, Spiritual, Beaches, and more.",
    steps: [
      "Open Destinations (Explore) from the nav or footer.",
      "Use the category filter to narrow by type (e.g. History, Nature).",
      "Click a destination card to see details, about text, and images.",
      "Use the back button to return to the list. Destinations are sorted alphabetically.",
      "From here you can get ideas and then plan a trip using the AI planner.",
    ],
  },
  {
    icon: ListTodo,
    title: "My Plan",
    path: "/my-trip",
    body: "Your current itinerary, activities, and day-by-day plan in one place.",
    steps: [
      "My Plan shows the trip you're currently working on (from Plan a Trip).",
      "View the day-by-day schedule and activity list.",
      "Open an activity to see more details and options to book events or experiences.",
      "Use Nearby to find restaurants, shopping, and utilities around your stay.",
      "Access booking (stays, events) and transport from the trip view.",
    ],
  },
  {
    icon: FolderOpen,
    title: "My Trips",
    path: "/my-trips",
    body: "Access and manage all your saved and past trips.",
    steps: [
      "Go to My Trips to see a list of all your trips.",
      "Click a trip to open it and view or edit the itinerary.",
      "Use this to switch between different trips or continue planning an older one.",
    ],
  },
  {
    icon: Ticket,
    title: "Events & Experiences",
    path: "/my-trip/book",
    body: "Book events, tours, and experiences from your itinerary.",
    steps: [
      "From My Plan (your current trip), open an activity or go to the booking section.",
      "Browse available events and experiences linked to your itinerary.",
      "Select one and proceed through the booking flow (dates, details, payment).",
      "After payment you'll see a confirmation; check My Plan or booking success for details.",
    ],
  },
  {
    icon: Car,
    title: "Transport & Bookings",
    path: "/book/transport",
    body: "Book transport and manage travel bookings.",
    steps: [
      "Use Transport & Bookings from the app (e.g. /book/transport) when you need to book trains, buses, or other transport.",
      "Enter route and date details, then choose options and complete the booking.",
      "Keep confirmation details for your records.",
    ],
  },
  {
    icon: UtensilsCrossed,
    title: "Nearby",
    path: "/my-trip",
    body: "Discover restaurants, shopping, and essentials near your stay.",
    steps: [
      "From My Plan (your trip), use the Nearby section or links.",
      "Choose Restaurants, Shopping, or Utilities to see places near your location.",
      "Results are based on your trip context; use them to plan meals and errands.",
    ],
  },
  {
    icon: Users,
    title: "Travel Community",
    path: "/community",
    body: "Share experiences and connect with other travelers. Posts must be travel-related only.",
    steps: [
      "Open Community from the nav or footer.",
      "Read posts from other travelers. Create an account or sign in to post.",
      "Post only travel-related content (tips, photos, questions). Off-topic or invalid posts can lead to removal and strict action—see Terms of Service.",
      "Use the community for inspiration and advice when planning trips.",
    ],
  },
];

const Help = () => {
  const [openId, setOpenId] = useState<string | null>(sections[0].title);

  return (
    <Layout>
      <section className="pt-24 pb-16 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center py-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-6"
          >
            Help
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-primary-foreground/70 max-w-xl mx-auto"
          >
            How to use each feature of Wanderly.
          </motion.p>
        </div>
      </section>

      <section className="py-16 bg-sand">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="text-muted-foreground mb-10 leading-relaxed">
            Below you'll find every main feature explained: what it does, where to find it, and how to use it step by step.
          </p>
          <div className="space-y-3">
            {sections.map((section) => (
              <Collapsible
                key={section.title}
                open={openId === section.title}
                onOpenChange={(open) => setOpenId(open ? section.title : null)}
              >
                <CollapsibleTrigger className="w-full flex items-center gap-4 p-4 rounded-xl bg-card shadow-soft hover:bg-card/80 transition-colors text-left">
                  <div className="w-10 h-10 rounded-lg bg-gradient-sunset flex items-center justify-center shrink-0">
                    <section.icon className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display font-semibold text-foreground">{section.title}</h2>
                    <p className="text-sm text-muted-foreground truncate">{section.body}</p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${
                      openId === section.title ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-14 pr-4 pb-4 pt-1">
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong className="text-foreground">Where:</strong>{" "}
                      <Link to={section.path} className="text-accent hover:underline">
                        {section.path}
                      </Link>
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      {section.steps.map((step, i) => (
                        <li key={i} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Help;
