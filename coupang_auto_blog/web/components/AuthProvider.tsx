"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { apiClient, ApiError } from "@/lib/apiClient";

export type User = {
  id: number;
  email: string;
  name: string;
  role: string;
};

type AuthContextValue = {
  status: "idle" | "loading" | "authenticated" | "unauthenticated" | "error";
  user: User | null;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useAuthInternal(): AuthContextValue {
  const [status, setStatus] = useState<AuthContextValue["status"]>("idle");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refreshUser = useCallback(async () => {
    const token = apiClient.getToken();

    if (!token) {
      setStatus("unauthenticated");
      setUser(null);
      return;
    }

    try {
      setStatus("loading");
      const response = await apiClient.getMe();

      if (response.success && response.user) {
        setUser(response.user);
        setStatus("authenticated");
        setError(null);
      } else {
        throw new Error("사용자 정보를 가져올 수 없습니다.");
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
      setError(err instanceof Error ? err : new Error("인증 오류"));
      setStatus("unauthenticated");
      setUser(null);
      apiClient.logout();
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setStatus("loading");
      setError(null);

      const response = await apiClient.login(email, password);

      if (response.success && response.user) {
        setUser(response.user);
        setStatus("authenticated");
      } else {
        throw new Error("로그인에 실패했습니다.");
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("로그인 중 오류가 발생했습니다.");
      setError(error);
      setStatus("unauthenticated");
      setUser(null);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.logout();
    setUser(null);
    setStatus("unauthenticated");
    setError(null);
  }, []);

  return {
    status,
    user,
    error,
    login,
    logout,
    refreshUser,
  };
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const value = useAuthInternal();
  const memoizedValue = useMemo(() => value, [value]);
  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}
