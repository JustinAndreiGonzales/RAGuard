"use client";

import { Globe, Lock } from "lucide-react";
import { cn } from "../lib/utils";

type Visibility = "private" | "public";

type VisibilityToggleProps = {
  value: Visibility;
  onChange: (value: Visibility) => void;
  label?: string;
  disabled?: boolean;
};

const OPTIONS: { value: Visibility; label: string; icon: typeof Lock; helperText: string }[] = [
  {
    value: "private",
    label: "Private",
    icon: Lock,
    helperText: "Only the owner and people it's shared with can access it.",
  },
  {
    value: "public",
    label: "Public",
    icon: Globe,
    helperText: "Visible to everyone in the organization.",
  },
];

const VisibilityToggle = ({
  value,
  onChange,
  label = "Visibility",
  disabled = false,
}: VisibilityToggleProps) => {
  const active = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <div className="flex flex-col gap-2xs">
      {label && <span className="type-label text-primary">{label}</span>}
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "inline-flex w-fit rounded-md border border-line p-2xs bg-canvas",
          disabled && "opacity-40",
        )}
      >
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex items-center gap-xs h-[32px] px-sm rounded-sm type-body-sm transition-colors",
                isActive
                  ? "bg-surface text-primary shadow-sm"
                  : "text-secondary hover:text-primary",
                !disabled && "cursor-pointer",
              )}
            >
              <Icon className="h-md w-md" />
              {opt.label}
            </button>
          );
        })}
      </div>
      <span className="type-caption text-tertiary">{active.helperText}</span>
    </div>
  );
};

export default VisibilityToggle;
