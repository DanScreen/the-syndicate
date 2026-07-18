import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { usePathname } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

export function ActivityTracker() {
  const { token, user, loading } = useAuth();
  const pathname = usePathname();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const initialOpenToken = useRef<string | null>(null);
  const lastPageKey = useRef<string | null>(null);

  const send = useCallback(
    (type: "page_view" | "app_open", path?: string) => {
      if (!token || !user) return;
      void api("/api/analytics/events", {
        method: "POST",
        token,
        body: JSON.stringify({ type, path }),
      }).catch(() => {
        // Activity tracking is best-effort and must not affect the app.
      });
    },
    [token, user]
  );

  useEffect(() => {
    if (token && user) return;
    initialOpenToken.current = null;
    lastPageKey.current = null;
  }, [token, user]);

  useEffect(() => {
    if (loading || !token || !user || initialOpenToken.current === token) return;
    initialOpenToken.current = token;
    send("app_open", pathname);
  }, [loading, pathname, send, token, user]);

  useEffect(() => {
    if (loading || !token || !user || !pathname) return;
    const pageKey = `${user.id}:${pathname}`;
    if (lastPageKey.current === pageKey) return;
    lastPageKey.current = pageKey;
    send("page_view", pathname);
  }, [loading, pathname, send, token, user]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackgrounded = /inactive|background/.test(appState.current);
      appState.current = nextState;
      if (nextState === "active" && wasBackgrounded) {
        send("app_open", pathname);
      }
    });
    return () => subscription.remove();
  }, [pathname, send]);

  return null;
}
