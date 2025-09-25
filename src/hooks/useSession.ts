// src/hooks/useSession.ts
"use client";

import { useState, useEffect } from "react";

interface UserData {
  data: Array<{
    user_id: number;
    name: string;
    email: string;
    profile_picture: string;
  }>;
  message: string;
  tokenInfo: {
    active: boolean;
    client_id: string;
    exp: number;
    scope: string;
    token_type: string;
  };
}

interface SessionData {
  user: UserData;
  dbUser: {
    id: string;
    kickUserId: string;
    username: string;
    email: string;
    updatedAt: string;
  };
}

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user");

      if (!response.ok) {
        if (response.status === 401) {
          setSession(null);
          setError("Not authenticated");
        } else {
          throw new Error("Failed to fetch session");
        }
        return;
      }

      const data = await response.json();
      setSession(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setSession(null);
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Yine de logout yap
      setSession(null);
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    loading,
    error,
    logout,
    refetch: fetchSession,
    isAuthenticated: !!session,
  };
}
