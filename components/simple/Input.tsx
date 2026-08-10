"use client";

import React, { useId } from "react";
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
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const messageId = `${id}-message`;

    const isDisabled = disabled || state === "disabled";
    const showError = state === "error" && Boolean(errorText);
    const showHelper = state !== "error" && Boolean(helperText);
    const showMessage = showError || showHelper;

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
        <input
          type="text"
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
            className,
          )}
          {...props}
        />
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
