import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Verification } from "@/pages/Verification";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="verification" element={<Verification />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
