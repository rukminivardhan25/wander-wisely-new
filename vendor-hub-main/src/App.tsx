import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { VendorAuthProvider } from "@/contexts/VendorAuthContext";
import { VendorLayout } from "./components/VendorLayout";
import { ProtectedVendorRoute } from "./components/ProtectedVendorRoute";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Listings from "./pages/Listings";
import TransportListing from "./pages/TransportListing";
import BusDetail from "./pages/BusDetail";
import CarDetail from "./pages/CarDetail";
import VehiclePlaceholder from "./pages/VehiclePlaceholder";
import ListingDetail from "./pages/ListingDetail";
import AddListing from "./pages/AddListing";
import Bookings from "./pages/Bookings";
import Customers from "./pages/Customers";
import Messages from "./pages/Messages";
import Reviews from "./pages/Reviews";
import Analytics from "./pages/Analytics";
import Promotions from "./pages/Promotions";
import Verification from "./pages/Verification";
import Payouts from "./pages/Payouts";
import ProfileSettings from "./pages/ProfileSettings";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <VendorAuthProvider>
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route element={<ProtectedVendorRoute />}>
              <Route element={<VendorLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/listings" element={<Listings />} />
                <Route path="/listings/:listingId/transport" element={<TransportListing />} />
                <Route path="/listings/:listingId/transport/bus/:busId" element={<BusDetail />} />
                <Route path="/listings/:listingId/transport/car/:carId" element={<CarDetail />} />
                <Route path="/listings/:listingId/transport/vehicle/:vehicleType" element={<VehiclePlaceholder />} />
                <Route path="/listings/:listingId" element={<ListingDetail />} />
                <Route path="/add-listing" element={<AddListing />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/promotions" element={<Promotions />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/payouts" element={<Payouts />} />
                <Route path="/settings" element={<ProfileSettings />} />
                <Route path="/support" element={<Support />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </VendorAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
