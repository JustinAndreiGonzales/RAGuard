"use client";

import { Eye, EyeOff } from "lucide-react";
import React, { useId, useState } from "react";
import { cn } from "../lib/utils";

type InputState = "default" | "focus" | "error" | "disabled";

interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "children"
> {
  label?: string;
  helperText?: string;
  errorText?: string;
  state?: InputState;
  className?: string;
  leadingIcon?: React.ReactNode;
  passwordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label = "",
      helperText = "",
      errorText = "",
      state = "default",
      disabled,
      value,
      placeholder,
      className = "",
      id: idProp,
      type,
      leadingIcon,
      passwordToggle = false,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const messageId = `${id}-message`;
    const [visible, setVisible] = useState(false);

    const isDisabled = disabled || state === "disabled";
    const showError = state === "error" && Boolean(errorText);
    const showHelper = state !== "error" && Boolean(helperText);
    const showMessage = showError || showHelper;
    const effectiveType = passwordToggle
      ? visible
        ? "text"
        : "password"
      : (type ?? "text");

    return (
      <div className="flex flex-col gap-2xs">
        {label && (
          <label
            htmlFor={id}
            className={cn(
              "type-label",
              isDisabled ? "text-tertiary" : "text-primary",
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leadingIcon && (
            <span className="absolute left-sm top-1/2 -translate-y-1/2 pointer-events-none text-tertiary">
              {leadingIcon}
            </span>
          )}
          <input
            type={effectiveType}
            id={id}
            ref={ref}
            placeholder={placeholder}
            value={value}
            disabled={isDisabled}
            aria-invalid={showError || undefined}
            aria-describedby={showMessage ? messageId : undefined}
            className={cn(
              "h-[40px] px-md py-sm rounded-md w-full",
              "border border-line focus:border-thick focus:border-focus focus:outline-none",
              "type-body",
              isDisabled && "bg-canvas text-tertiary",
              leadingIcon && "pl-[40px]",
              passwordToggle && "pr-[40px]",
              className,
            )}
            {...props}
          />
          {passwordToggle && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              className="absolute right-sm top-1/2 -translate-y-1/2 text-tertiary hover:text-primary transition-colors"
            >
              {visible ? (
                <EyeOff className="h-md w-md" />
              ) : (
                <Eye className="h-md w-md" />
              )}
            </button>
          )}
        </div>
        {showMessage && (
          <span
            id={messageId}
            className={cn(
              "type-caption",
              showError ? "text-danger-default" : "text-tertiary",
            )}
          >
            {showError ? showError : helperText}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
