import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import FlightListing from "./pages/FlightListing";
import FlightDetail from "./pages/FlightDetail";
import VehiclePlaceholder from "./pages/VehiclePlaceholder";
import ListingDetail from "./pages/ListingDetail";
import AddListing from "./pages/AddListing";
import AddExperience from "./pages/AddExperience";
import AddEvent from "./pages/AddEvent";
import AddHotel from "./pages/AddHotel";
import AddHotelBranch from "./pages/AddHotelBranch";
import HotelListing from "./pages/HotelListing";
import HotelBranchDetail from "./pages/HotelBranchDetail";
import ExperienceManage from "./pages/ExperienceManage";
import EditExperience from "./pages/EditExperience";
import EventManage from "./pages/EventManage";
import EditEvent from "./pages/EditEvent";
import Bookings from "./pages/Bookings";
import Customers from "./pages/Customers";
import Messages from "./pages/Messages";
import Reviews from "./pages/Reviews";
import Promotions from "./pages/Promotions";
import Verification from "./pages/Verification";
import Payouts from "./pages/Payouts";
import PayoutsListingRevenue from "./pages/PayoutsListingRevenue";
import PayoutsFleetRevenue from "./pages/PayoutsFleetRevenue";
import ProfileSettings from "./pages/ProfileSettings";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
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
                <Route path="/listings/:listingId/transport/flight" element={<FlightListing />} />
                <Route path="/listings/:listingId/transport/flight/:flightId" element={<FlightDetail />} />
                <Route path="/listings/:listingId/transport/vehicle/:vehicleType" element={<VehiclePlaceholder />} />
                <Route path="/listings/:listingId" element={<ListingDetail />} />
                <Route path="/listings/:listingId/experience" element={<ExperienceManage />} />
                <Route path="/listings/:listingId/experience/edit" element={<EditExperience />} />
                <Route path="/listings/:listingId/event" element={<EventManage />} />
                <Route path="/listings/:listingId/event/edit" element={<EditEvent />} />
                <Route path="/add-listing" element={<AddListing />} />
                <Route path="/add-listing/experience" element={<AddExperience />} />
                <Route path="/add-listing/event" element={<AddEvent />} />
                <Route path="/add-listing/hotel" element={<AddHotel />} />
                <Route path="/listings/:listingId/hotel" element={<HotelListing />} />
                <Route path="/listings/:listingId/hotel/branch/:branchId" element={<HotelBranchDetail />} />
                <Route path="/listings/:listingId/hotel/add" element={<AddHotelBranch />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/analytics" element={<Navigate to="/" replace />} />
                <Route path="/promotions" element={<Promotions />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/payouts" element={<Payouts />} />
                <Route path="/payouts/listing/:listingId" element={<PayoutsListingRevenue />} />
                <Route path="/payouts/listing/:listingId/fleet/:fleetId/entity/:entityId" element={<PayoutsFleetRevenue />} />
                <Route path="/payouts/listing/:listingId/fleet/:fleetId" element={<PayoutsFleetRevenue />} />
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
