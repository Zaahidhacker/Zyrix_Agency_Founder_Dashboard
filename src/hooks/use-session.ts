"use client";

import { useEffect, useState, useCallback } from "react";

export interface SessionUser {
  id?: string;
  userId?: string;
  email: string;
  name?: string;
}

export interface SessionState {
  user: SessionUser | null;
  geminiKeySet: boolean;
  loading: boolean;
}

export function useSession() {
  const [state, setState] = useState<SessionState>({
    user: null,
    geminiKeySet: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      setState({
        user: data.user,
        geminiKeySet: data.geminiKeySet,
        loading: false,
      });
      return data;
    } catch {
      setState({ user: null, geminiKeySet: false, loading: false });
      return null;
    }
  }, []);

  useEffect(() => {
    // Initial session fetch on mount — setState here is intentional
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      await refresh();
      return data;
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
  }, [refresh]);

  return { ...state, refresh, login, logout };
}
