import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import ExploreDetail from "./pages/ExploreDetail";
import PlanTrip from "./pages/PlanTrip";
import MyTrip from "./pages/MyTrip";
import MyTrips from "./pages/MyTrips";
import BookingMarketplace from "./pages/BookingMarketplace";
import HotelReceipt from "./pages/HotelReceipt";
import PaymentPage from "./pages/PaymentPage";
import BookingSuccessPage from "./pages/BookingSuccessPage";
import ActivityDetail from "./pages/ActivityDetail";
import NearbyRestaurants from "./pages/NearbyRestaurants";
import NearbyShopping from "./pages/NearbyShopping";
import NearbyUtilities from "./pages/NearbyUtilities";
import TransportBook from "./pages/TransportBook";
import Community from "./pages/Community";
import About from "./pages/About";
import HelpPage from "./pages/Help";
import TravelTips from "./pages/TravelTips";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Feedback from "./pages/Feedback";
import Complaint from "./pages/Complaint";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/explore/:id" element={<ExploreDetail />} />
            <Route path="/plan-trip" element={<ProtectedRoute><PlanTrip /></ProtectedRoute>} />
            <Route path="/plan-trip/activity" element={<ProtectedRoute><ActivityDetail /></ProtectedRoute>} />
            <Route path="/my-trip" element={<ProtectedRoute><MyTrip /></ProtectedRoute>} />
            <Route path="/my-trips" element={<ProtectedRoute><MyTrips /></ProtectedRoute>} />
            <Route path="/my-trips/:tripId" element={<ProtectedRoute><MyTrip /></ProtectedRoute>} />
            <Route path="/my-trip/nearby-restaurants" element={<ProtectedRoute><NearbyRestaurants /></ProtectedRoute>} />
            <Route path="/my-trip/nearby-shopping" element={<ProtectedRoute><NearbyShopping /></ProtectedRoute>} />
            <Route path="/my-trip/nearby-utilities" element={<ProtectedRoute><NearbyUtilities /></ProtectedRoute>} />
            <Route path="/my-trip/book" element={<ProtectedRoute><BookingMarketplace /></ProtectedRoute>} />
            <Route path="/my-trip/hotel-booking/:id" element={<ProtectedRoute><HotelReceipt /></ProtectedRoute>} />
            <Route path="/my-trip/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
            <Route path="/my-trip/booking-success" element={<ProtectedRoute><BookingSuccessPage /></ProtectedRoute>} />
            <Route path="/book/transport" element={<ProtectedRoute><TransportBook /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/travel-tips" element={<TravelTips />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/complaint" element={<Complaint />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
