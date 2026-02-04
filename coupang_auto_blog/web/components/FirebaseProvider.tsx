"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthProvider";

/**
 * Firebase 호환 레이어
 * 기존 코드에서 useFirebase()를 사용하는 곳을 위한 어댑터입니다.
 * 실제로는 JWT AuthProvider의 상태를 반환합니다.
 */

type FirebaseContextValue = {
  status: "idle" | "initializing" | "ready" | "error";
  user: { email: string | null; uid: string } | null;
  error: Error | null;
};

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

type FirebaseProviderProps = {
  children: ReactNode;
};

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const auth = useAuth();

  const value = useMemo<FirebaseContextValue>(() => {
    switch (auth.status) {
      case "authenticated":
        return {
          status: "ready",
          user: auth.user
            ? { email: auth.user.email, uid: String(auth.user.id) }
            : null,
          error: null,
        };
      case "loading":
      case "idle":
        return { status: "initializing", user: null, error: null };
      case "error":
        return { status: "error", user: null, error: auth.error };
      default:
        return { status: "ready", user: null, error: null };
    }
  }, [auth.status, auth.user, auth.error]);

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase(): FirebaseContextValue {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error("useFirebase는 FirebaseProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}
