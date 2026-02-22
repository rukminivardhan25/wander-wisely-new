import { useContext } from "react";
import { VendorAuthContext } from "@/contexts/VendorAuthContext";

export function useVendorAuth() {
  const ctx = useContext(VendorAuthContext);
  if (!ctx) throw new Error("useVendorAuth must be used within VendorAuthProvider");
  return ctx;
}
