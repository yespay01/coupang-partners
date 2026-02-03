"use client";

import { type ReactNode } from "react";
import { FirebaseProvider } from "./FirebaseProvider";
import { QueryProvider } from "./QueryProvider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <FirebaseProvider>{children}</FirebaseProvider>
    </QueryProvider>
  );
}
