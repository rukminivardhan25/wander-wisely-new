import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import PlanTrip from "./pages/PlanTrip";
import MyTrip from "./pages/MyTrip";
import BookingMarketplace from "./pages/BookingMarketplace";
import HotelReceipt from "./pages/HotelReceipt";
import PaymentPage from "./pages/PaymentPage";
import BookingSuccessPage from "./pages/BookingSuccessPage";
import ActivityDetail from "./pages/ActivityDetail";
import TransportBook from "./pages/TransportBook";
import Community from "./pages/Community";
import About from "./pages/About";
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
            <Route path="/plan-trip" element={<PlanTrip />} />
            <Route path="/plan-trip/activity" element={<ActivityDetail />} />
            <Route path="/my-trip" element={<MyTrip />} />
            <Route path="/my-trip/book" element={<BookingMarketplace />} />
            <Route path="/my-trip/hotel-booking/:id" element={<HotelReceipt />} />
            <Route path="/my-trip/payment" element={<PaymentPage />} />
            <Route path="/my-trip/booking-success" element={<BookingSuccessPage />} />
            <Route path="/book/transport" element={<TransportBook />} />
            <Route path="/community" element={<Community />} />
            <Route path="/about" element={<About />} />
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
