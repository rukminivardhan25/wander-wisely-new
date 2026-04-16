import { createContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { vendorFetch } from "@/lib/api";

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
    const token = sessionStorage.getItem(STORAGE_TOKEN);
    const vendorJson = sessionStorage.getItem(STORAGE_VENDOR);
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
    const { token, vendor } = await vendorFetch<{ token: string; vendor: Vendor }>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      timeoutMs: 30000,
      retries: 1,
    });
    sessionStorage.setItem(STORAGE_TOKEN, token);
    sessionStorage.setItem(STORAGE_VENDOR, JSON.stringify(vendor));
    setState({ token, vendor, ready: true });
  }, []);

  const signUp = useCallback(async (data: { name: string; email: string; phone?: string; password: string }) => {
    const { token, vendor } = await vendorFetch<{ token: string; vendor: Vendor }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        email: data.email.trim().toLowerCase(),
      }),
      timeoutMs: 30000,
      retries: 1,
    });
    sessionStorage.setItem(STORAGE_TOKEN, token);
    sessionStorage.setItem(STORAGE_VENDOR, JSON.stringify(vendor));
    setState({ token, vendor, ready: true });
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_VENDOR);
    setState({ token: null, vendor: null, ready: true });
  }, []);

  const updateVendor = useCallback((partial: Partial<Vendor>) => {
    setState((s) => {
      if (!s.vendor) return s;
      const vendor = { ...s.vendor, ...partial };
      try {
        sessionStorage.setItem(STORAGE_VENDOR, JSON.stringify(vendor));
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
