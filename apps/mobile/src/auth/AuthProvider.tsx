import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/api/client";
import { unregisterPushNotifications } from "@/notifications/register";
import type { AuthUser } from "@tiki-acca/shared";

const TOKEN_KEY = "syndicate_token";
const USER_KEY = "syndicate_user";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    dateOfBirth: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as AuthUser);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (nextToken: string, nextUser: AuthUser) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, nextToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser)),
    ]);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await api<{ token: string; user: AuthUser }>(
        "/api/auth/mobile/sign-in",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );
      await persist(data.token, data.user);
    },
    [persist]
  );

  const signUp = useCallback(
    async (
      firstName: string,
      lastName: string,
      email: string,
      password: string,
      dateOfBirth: string
    ) => {
      await api("/api/auth/sign-up", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, password, dateOfBirth }),
      });
      await signIn(email, password);
    },
    [signIn]
  );

  const signOut = useCallback(async () => {
    await unregisterPushNotifications(token);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, loading, signIn, signUp, signOut }),
    [user, token, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
