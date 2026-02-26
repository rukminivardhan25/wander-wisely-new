import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Verification } from "@/pages/Verification";
import { FeedbackUsers } from "@/pages/FeedbackUsers";
import { ComplaintUsers } from "@/pages/ComplaintUsers";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="verification" element={<Verification />} />
          <Route path="feedback" element={<Navigate to="/feedback-users" replace />} />
          <Route path="feedback-users" element={<FeedbackUsers />} />
          <Route path="complaints" element={<Navigate to="/complaint-users" replace />} />
          <Route path="complaint-users" element={<ComplaintUsers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
