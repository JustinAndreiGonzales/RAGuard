"use client";

import { X } from "lucide-react";
import React, { ReactNode, useEffect } from "react";
import { cn } from "../lib/utils";
import Button from "./Button";

type ModalProps = {
  size?: "sm" | "md" | "lg";
  title: string;
  onClose: () => void;
  children: ReactNode;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
  primaryVariant?: "primary" | "danger";
  primaryDisabled?: boolean;
  hasSecondButton?: boolean;
  secondaryLabel?: string;
};

const SIZE = {
  sm: "w-[400px]",
  md: "w-[560px]",
  lg: "w-[720px]",
};

const Modal = ({
  size = "md",
  title,
  onClose,
  children,
  primaryLabel = "Confirm",
  onPrimaryAction,
  primaryVariant = "primary",
  primaryDisabled = false,
  hasSecondButton = false,
  secondaryLabel = "Cancel",
}: ModalProps) => {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-[0px] z-50 flex items-center justify-center bg-scrim/40 p-lg"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex flex-col rounded-xl shadow-lg bg-surface-raised max-h-[85vh]",
          SIZE[size],
        )}
      >
        <div className="p-lg flex items-center justify-between gap-md shrink-0">
          <h2 id="modal-title" className="type-h2 text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-secondary hover:text-primary transition-colors"
          >
            <X className="h-[20px] w-[20px]" />
          </button>
        </div>
        <div className="h-[1px] w-full bg-line-subtle shrink-0" />
        <div className="min-h-[0px] overflow-y-auto p-lg">{children}</div>
        <div className="h-[1px] w-full bg-line-subtle shrink-0" />
        <div className="p-lg flex justify-end gap-sm shrink-0">
          {hasSecondButton && (
            <Button variant="secondary" onClick={onClose}>
              {secondaryLabel}
            </Button>
          )}
          <Button
            variant={primaryVariant}
            onClick={onPrimaryAction}
            disabled={primaryDisabled}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
