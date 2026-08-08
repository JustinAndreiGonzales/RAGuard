"use client";

import React, { useId } from "react";
import { cn } from "./lib/utils";

interface TextAreaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "children"
> {}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    { disabled, value, placeholder, className = "", id: idProp, ...props },
    ref,
  ) => {
    return (
      <textarea
        ref={ref}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        {...props}
        className={cn(
          "min-h-4xl w-full px-md py-sm rounded-md",
          "border border-line focus:border-thick focus:border-focus focus:outline-none",
          "resize-none",
          "type-body",
          disabled && "bg-canvas text-tertiary",
          className,
        )}
      />
    );
  },
);

TextArea.displayName = "TextArea";

export default TextArea;
