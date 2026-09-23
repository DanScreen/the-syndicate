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
import { ApiError, api, setEmailUnverifiedListener } from "@/api/client";
import { unregisterPushNotifications } from "@/notifications/register";
import type { AuthUser, EmailVerificationStatus } from "@tiki-acca/shared";

const TOKEN_KEY = "syndicate_token";
const USER_KEY = "syndicate_user";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    dateOfBirth: string
  ) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  /** Re-reads verification from the server; resolves true once verified. */
  refreshEmailVerification: () => Promise<boolean>;
  /** After the unverified change-email flow succeeds. */
  setUnverifiedEmail: (email: string) => Promise<void>;
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

          // Upgrade legacy 30-day JWTs to persistent sessions after rollout.
          // This is background/best-effort so offline startup still works.
          void api<{ token: string }>("/api/auth/mobile/refresh", {
            method: "POST",
            token: storedToken,
          })
            .then(async ({ token: refreshedToken }) => {
              const currentToken = await SecureStore.getItemAsync(TOKEN_KEY);
              if (currentToken !== storedToken || refreshedToken === storedToken) return;
              await SecureStore.setItemAsync(TOKEN_KEY, refreshedToken);
              setToken(refreshedToken);
            })
            .catch(async (error) => {
              // A definitive 401 means the legacy token has already expired.
              // Missing endpoint/network errors during deployment leave it alone.
              if (!(error instanceof ApiError) || error.status !== 401) return;
              const currentToken = await SecureStore.getItemAsync(TOKEN_KEY);
              if (currentToken !== storedToken) return;
              await Promise.all([
                SecureStore.deleteItemAsync(TOKEN_KEY),
                SecureStore.deleteItemAsync(USER_KEY),
              ]);
              setToken(null);
              setUser(null);
            });

          // Accounts signed in before verification shipped have no flag
          // stored. Best-effort: offline startup keeps the cached user.
          void api<EmailVerificationStatus>("/api/auth/verify-email/status", {
            token: storedToken,
          })
            .then(async (status) => {
              const currentToken = await SecureStore.getItemAsync(TOKEN_KEY);
              if (currentToken !== storedToken) return;
              await updateStoredUser({
                email: status.email,
                emailVerified: status.emailVerified,
              });
            })
            .catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateStoredUser = useCallback(async (patch: Partial<AuthUser>) => {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return;
    const next = { ...(JSON.parse(raw) as AuthUser), ...patch };
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(next));
    setUser(next);
  }, []);

  useEffect(() => {
    setEmailUnverifiedListener(() => {
      void updateStoredUser({ emailVerified: false });
    });
    return () => setEmailUnverifiedListener(null);
  }, [updateStoredUser]);

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
      return data.user;
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
      return signIn(email, password);
    },
    [signIn]
  );

  const signOut = useCallback(async () => {
    await unregisterPushNotifications(token);
    if (token) {
      try {
        await api("/api/auth/mobile/sign-out", {
          method: "POST",
          token,
        });
      } catch {
        // Always clear this device even if the server is temporarily offline.
      }
    }
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  }, [token]);

  const refreshEmailVerification = useCallback(async () => {
    if (!token) return false;
    const status = await api<EmailVerificationStatus>("/api/auth/verify-email/status", {
      token,
    });
    await updateStoredUser({ email: status.email, emailVerified: status.emailVerified });
    return status.emailVerified;
  }, [token, updateStoredUser]);

  const setUnverifiedEmail = useCallback(
    (email: string) => updateStoredUser({ email, emailVerified: false }),
    [updateStoredUser]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      signIn,
      signUp,
      signOut,
      refreshEmailVerification,
      setUnverifiedEmail,
    }),
    [user, token, loading, signIn, signUp, signOut, refreshEmailVerification, setUnverifiedEmail]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
