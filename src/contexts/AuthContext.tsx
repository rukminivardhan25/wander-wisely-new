import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type User = {
  id: string;
  email: string;
  full_name: string | null;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isReady: boolean;
};

type AuthContextValue = AuthState & {
  signIn: (user: User, token: string) => void;
  signOut: () => void;
  setUser: (user: User) => void;
};

const STORAGE_TOKEN = "wander_token";
const STORAGE_USER = "wander_user";

const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(): { user: User | null; token: string | null } {
  try {
    const token = sessionStorage.getItem(STORAGE_TOKEN);
    const userJson = sessionStorage.getItem(STORAGE_USER);
    if (!token || !userJson) return { token: null, user: null };
    const user = JSON.parse(userJson) as User;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isReady: false,
  });

  useEffect(() => {
    const { user, token } = readStored();
    setState({ user, token, isReady: true });
  }, []);

  const signIn = useCallback((user: User, token: string) => {
    sessionStorage.setItem(STORAGE_TOKEN, token);
    sessionStorage.setItem(STORAGE_USER, JSON.stringify(user));
    setState({ user, token, isReady: true });
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
    setState((s) => ({ ...s, user: null, token: null }));
  }, []);

  const setUser = useCallback((user: User) => {
    sessionStorage.setItem(STORAGE_USER, JSON.stringify(user));
    setState((s) => ({ ...s, user }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
