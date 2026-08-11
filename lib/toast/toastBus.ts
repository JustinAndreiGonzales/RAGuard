type ToastPayload = { variant: "success" | "error" | "info"; message: string };
type Listener = (t: ToastPayload) => void;

let listener: Listener | null = null;

export const toastBus = {
  register(l: Listener) {
    listener = l;
    return () => {
      if (listener === l) listener = null;
    };
  },
  emit(t: ToastPayload) {
    listener?.(t);
  },
};
