import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "./lib/utils";

type ToastVariant = "success" | "error" | "info";

type ToastProps = {
  variant?: ToastVariant;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
};

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    iconStyle: "text-status-ready-fg",
  },
  error: {
    icon: XCircle,
    iconStyle: "text-status-failed-fg",
  },
  info: {
    icon: Info,
    iconStyle: "text-secondary",
  },
};

const Toast = ({
  variant = "info",
  message,
  dismissible = true,
  onDismiss,
}: ToastProps) => {
  const { icon: Icon, iconStyle } = VARIANTS[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-[360px] flex items-start gap-sm p-md rounded-lg shadow-md bg-surface-raised"
    >
      <Icon className={cn("h-md w-md shrink-0", iconStyle)} />
      <p className="flex-1 type-body-sm text-primary">{message}</p>
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-tertiary hover:text-primary transition-colors"
        >
          <X className="h-md w-md" />
        </button>
      )}
    </div>
  );
};

export default Toast;
