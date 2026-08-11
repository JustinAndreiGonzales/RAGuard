"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Toast from "@/components/simple/Toast";
import { toastBus } from "@/lib/toast/toastBus";

type ToastVariant = "success" | "error" | "info";
type ToastItem = { id: string; variant: ToastVariant; message: string };

type ToastContextValue = {
  showToast: (variant: ToastVariant, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, variant, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  useEffect(
    () => toastBus.register(({ variant, message }) => showToast(variant, message)),
    [showToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-lg right-lg z-50 flex flex-col gap-sm">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            message={t.message}
            onDismiss={() => dismiss(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export default ToastProvider;
