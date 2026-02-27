import { HelpCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

export function VendorFooter() {
  const [open, setOpen] = useState(false);

  return (
    <footer className="border-t border-border bg-card px-4 md:px-6 py-3 shrink-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">Help — About Partner Portal</span>
          <span className="ml-auto text-xs">{open ? "▼" : "▶"}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Partner Portal</strong> is your partner dashboard for the travel platform.
              Here you can manage your business listings (transport, hotels, experiences, and events), handle bookings,
              view customers and reviews, run promotions, track payouts, and get support.
            </p>
            <p>
              Use <strong className="text-foreground">Dashboard</strong> for an overview; <strong className="text-foreground">Add New Listing</strong> to
              register transport, hotels, experiences, or events; <strong className="text-foreground">Verification</strong> to
              see verification status; <strong className="text-foreground">My Listings</strong> to manage and edit them;
              <strong className="text-foreground"> Bookings</strong> to handle incoming requests; and <strong className="text-foreground">Support</strong> to
              contact the admin or view replies.
            </p>
            <Link
              to="/support"
              className="inline-flex items-center gap-1.5 text-accent-foreground hover:underline font-medium"
            >
              Go to Support
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </footer>
  );
}
