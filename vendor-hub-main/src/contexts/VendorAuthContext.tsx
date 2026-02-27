import { createContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { getVendorApiUrl } from "@/lib/api";

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface AuthState {
  token: string | null;
  vendor: Vendor | null;
  ready: boolean;
}

interface VendorAuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => void;
  updateVendor: (partial: Partial<Vendor>) => void;
}

const STORAGE_TOKEN = "vendor_token";
const STORAGE_VENDOR = "vendor_vendor";

function readStored(): Pick<AuthState, "token" | "vendor"> {
  try {
    const token = localStorage.getItem(STORAGE_TOKEN);
    const vendorJson = localStorage.getItem(STORAGE_VENDOR);
    const vendor = vendorJson ? (JSON.parse(vendorJson) as Vendor) : null;
    return { token, vendor };
  } catch {
    return { token: null, vendor: null };
  }
}

export const VendorAuthContext = createContext<VendorAuthContextValue | null>(null);

export function VendorAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    ...readStored(),
    ready: false,
  }));

  useEffect(() => {
    setState((s) => ({ ...s, ...readStored(), ready: true }));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const url = getVendorApiUrl("/api/auth/signin");
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      if (msg === "Failed to fetch" || msg.includes("fetch")) {
        throw new Error("Cannot reach the API. Start the Partner Portal backend: cd vendor-hub-main/backend then npm run dev");
      }
      throw err;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "Sign in failed");
    const { token, vendor } = data as { token: string; vendor: Vendor };
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_VENDOR, JSON.stringify(vendor));
    setState({ token, vendor, ready: true });
  }, []);

  const signUp = useCallback(async (data: { name: string; email: string; phone?: string; password: string }) => {
    const url = getVendorApiUrl("/api/auth/signup");
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      if (msg === "Failed to fetch" || msg.includes("fetch")) {
        throw new Error("Cannot reach the API. Start the Partner Portal backend: cd vendor-hub-main/backend then npm run dev");
      }
      throw err;
    }
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((result as { error?: string }).error ?? "Sign up failed");
    const { token, vendor } = result as { token: string; vendor: Vendor };
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_VENDOR, JSON.stringify(vendor));
    setState({ token, vendor, ready: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_VENDOR);
    setState({ token: null, vendor: null, ready: true });
  }, []);

  const updateVendor = useCallback((partial: Partial<Vendor>) => {
    setState((s) => {
      if (!s.vendor) return s;
      const vendor = { ...s.vendor, ...partial };
      try {
        localStorage.setItem(STORAGE_VENDOR, JSON.stringify(vendor));
      } catch {}
      return { ...s, vendor };
    });
  }, []);

  const value: VendorAuthContextValue = {
    ...state,
    signIn,
    signUp,
    logout,
    updateVendor,
  };

  return <VendorAuthContext.Provider value={value}>{children}</VendorAuthContext.Provider>;
}
