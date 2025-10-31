import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseClients } from "@/lib/firebaseClient";

type FirebaseContextValue = {
  status: "idle" | "initializing" | "ready" | "error";
  user: User | null;
  error: Error | null;
};

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

function useFirebaseInternal(): FirebaseContextValue {
  const [value, setValue] = useState<FirebaseContextValue>({
    status: "initializing",
    user: null,
    error: null,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    async function bootstrap() {
      try {
        const { app } = await getFirebaseClients();
        const auth = getAuth(app);

        unsubscribe = onAuthStateChanged(auth, (nextUser) => {
          if (!mounted) return;
          setValue({
            status: "ready",
            user: nextUser,
            error: null,
          });
        });
      } catch (error) {
        if (!mounted) return;
        setValue({
          status: "error",
          user: null,
          error: error instanceof Error ? error : new Error("Firebase 초기화 실패"),
        });
      }
    }

    bootstrap();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return value;
}

type FirebaseProviderProps = {
  children: ReactNode;
};

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const value = useFirebaseInternal();
  const memoizedValue = useMemo(() => value, [value]);
  return <FirebaseContext.Provider value={memoizedValue}>{children}</FirebaseContext.Provider>;
}

export function useFirebase(): FirebaseContextValue {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error("useFirebase는 FirebaseProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}
