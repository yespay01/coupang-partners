"use client";

import { type ReactNode } from "react";
import { FirebaseProvider } from "./FirebaseProvider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
