import React from "react";
import { cn } from "../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";
type ButtonState = "default" | "hover" | "pressed" | "disabled" | "loading";
type IconPosition = "none" | "leading" | "trailing";

interface ButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: ButtonState;
  icon?: IconPosition;
  iconElement?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const VARIANTS = {
  primary:
    "bg-accent-default hover:bg-accent-hover active:bg-accent-pressed text-on-accent",
  secondary: "bg-surface text-primary border border-line",
  ghost: "hover:bg-surface text-primary",
  danger: "bg-danger-default hover:bg-danger-hover text-on-accent",
};

const SIZES = {
  sm: "h-[32px] px-sm type-body-sm",
  md: "h-[40px] px-md type-body",
  lg: "h-[48px] px-lg type-body-lg",
};

const Button = ({
  variant = "primary",
  size = "md",
  state = "default",
  icon = "none",
  iconElement,
  fullWidth = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || state === "disabled" || state === "loading";
  return (
    <button
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-xs rounded-md transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        isDisabled
          ? "opacity-40 cursor-not-allowed pointer-events-none"
          : "cursor-pointer",
        className,
      )}
      {...props}
    >
      {state === "loading" && (
        <span className="animate-spin h-md w-md border-2 border-current border-t-transparent rounded-full" />
      )}
      {!state.includes("loading") && icon === "leading" && iconElement}

      {state !== "loading" && children}
      {!state.includes("loading") && icon === "trailing" && iconElement}
    </button>
  );
};

export default Button;
