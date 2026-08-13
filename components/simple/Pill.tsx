import { X } from "lucide-react";
import React from "react";
import { cn } from "../lib/utils";

type PillSize = "sm" | "md";

type PillProps = {
  /** `sm` = 20px, uppercase mono label (role pills). `md` = 28px, body-sm (name/membership chips). */
  size?: PillSize;
  children: React.ReactNode;
  /** Renders a trailing remove (x) button when provided. */
  onRemove?: () => void;
  /** aria-label for the remove button. Defaults to "Remove". */
  removeLabel?: string;
  className?: string;
};

const SIZES: Record<PillSize, string> = {
  sm: "h-[20px] type-mono-label text-secondary uppercase",
  md: "h-[28px] type-body-sm text-primary",
};

const Pill = ({
  size = "md",
  children,
  onRemove,
  removeLabel,
  className,
}: PillProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-canvas border border-line-subtle",
        SIZES[size],
        onRemove ? "gap-xs pl-sm pr-xs" : size === "sm" ? "px-xs" : "px-sm",
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? "Remove"}
          className="text-tertiary hover:text-primary"
        >
          <X className="h-[14px] w-[14px]" />
        </button>
      )}
    </span>
  );
};

export default Pill;
