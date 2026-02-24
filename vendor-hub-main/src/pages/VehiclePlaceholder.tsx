import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Bus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { vendorFetch } from "@/lib/api";

const VEHICLE_LABEL: Record<string, string> = {
  car: "Car",
  bike: "Bike",
  cycle: "Cycle",
  train: "Train",
  flight: "Flight",
};

export default function VehiclePlaceholder() {
  const { listingId, vehicleType } = useParams<{ listingId: string; vehicleType: string }>();
  const [listingName, setListingName] = useState("");
  const typeLabel = vehicleType ? (VEHICLE_LABEL[vehicleType.toLowerCase()] ?? vehicleType) : "Vehicle";

  useEffect(() => {
    if (!listingId) return;
    vendorFetch<{ name: string }>(`/api/listings/${listingId}`)
      .then((d) => setListingName(d?.name ?? ""))
      .catch(() => {});
  }, [listingId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/listings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{listingName || "…"}</h1>
          <p className="text-sm text-muted-foreground">Transport · Manage fleet, routes & pricing</p>
        </div>
      </div>

      <Tabs value="fleet" className="w-full">
        <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="fleet" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            Fleet <Check className="h-3.5 w-3.5 text-success" />
          </TabsTrigger>
          <TabsTrigger value="businfo" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            Bus info <Check className="h-3.5 w-3.5 text-success" />
          </TabsTrigger>
          <TabsTrigger value="operator" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            Driver Info <Check className="h-3.5 w-3.5 text-success" />
          </TabsTrigger>
          <TabsTrigger value="routes" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            Routes and Pricing <Check className="h-3.5 w-3.5 text-success" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5" /> Fleet</CardTitle>
              <p className="text-sm text-muted-foreground">Your vehicles for this listing.</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-foreground">{typeLabel} setup coming soon.</p>
              <p className="text-sm text-muted-foreground mt-1">Same layout as bus setup. This flow will be available in a future update.</p>
              <Button variant="outline" className="mt-4 rounded-xl" asChild>
                <Link to={`/listings/${listingId}/transport`}>Back to Fleet</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
