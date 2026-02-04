"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { FirebaseProvider } from "./FirebaseProvider";
import { QueryProvider } from "./QueryProvider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <FirebaseProvider>{children}</FirebaseProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
