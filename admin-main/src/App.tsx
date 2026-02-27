import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Verification } from "@/pages/Verification";
import { FeedbackUsers } from "@/pages/FeedbackUsers";
import { ComplaintUsers } from "@/pages/ComplaintUsers";
import { Users } from "@/pages/Users";
import { Vendors } from "@/pages/Vendors";
import { Bookings } from "@/pages/Bookings";
import { Payouts } from "@/pages/Payouts";
import { PayoutsVendor } from "@/pages/PayoutsVendor";
import { PayoutsListing } from "@/pages/PayoutsListing";
import { PayoutsFleet } from "@/pages/PayoutsFleet";
import { PayoutsTransactions } from "@/pages/PayoutsTransactions";
import { VendorSupport } from "@/pages/VendorSupport";

function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="verification" element={<Verification />} />
          <Route path="feedback" element={<Navigate to="/feedback-users" replace />} />
          <Route path="feedback-users" element={<FeedbackUsers />} />
          <Route path="complaints" element={<Navigate to="/complaint-users" replace />} />
          <Route path="complaint-users" element={<ComplaintUsers />} />
          <Route path="users" element={<Users />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="payouts" element={<Payouts />} />
          <Route path="payouts/transactions" element={<PayoutsTransactions />} />
          <Route path="payouts/vendor/:vendorId" element={<PayoutsVendor />} />
          <Route path="payouts/vendor/:vendorId/listing/:listingId" element={<PayoutsListing />} />
          <Route path="payouts/vendor/:vendorId/listing/:listingId/fleet/:fleetId" element={<PayoutsFleet />} />
          <Route path="payouts/vendor/:vendorId/listing/:listingId/fleet/:fleetId/entity/:entityId" element={<PayoutsFleet />} />
          <Route path="support-tickets" element={<VendorSupport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
