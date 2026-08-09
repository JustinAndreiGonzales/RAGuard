"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "./lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  className?: string;
  id?: string;
}

const Select = ({
  label = "",
  options,
  value,
  placeholder = "",
  disabled = false,
  onValueChange,
  className = "",
  id: idProp,
}: SelectProps) => {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(
    Math.max(
      options.findIndex((o) => o.value === value),
      0,
    ),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        rootRef.current &&
        e.target instanceof Node &&
        !rootRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current
        .querySelector(`[data-index="${highlight}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [open, highlight]);

  function commit(index: number) {
    const opt = options[index];
    if (opt) onValueChange?.(opt.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (
      !open &&
      (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")
    ) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(highlight);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-2xs">
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "type-label",
            disabled ? "text-tertiary" : "text-primary",
          )}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onKeyDown}
          className={cn(
            "h-[40px] w-full px-md py-sm rounded-md",
            "flex items-center justify-between gap-xs",
            "border border-line",
            "focus:outline-none focus:border-thick focus:border-focus",
            "transition-colors",
            "type-body",
            selected ? "text-primary" : "text-tertiary",
            disabled
              ? "bg-canvas text-tertiary cursor-not-allowed"
              : "cursor-pointer",
            className,
          )}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "shrink-0 transition-transform duration-200",
              disabled ? "text-tertiary" : "text-secondary",
              open && "rotate-180",
            )}
          />
        </button>
        {open && (
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className={cn(
              "absolute z-10 mt-xs w-full max-h-[240px] overflow-auto",
              "bg-surface-raised border border-line rounded-lg shadow-md",
            )}
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isHighlighted = i === highlight;
              return (
                <li
                  key={opt.value}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => commit(i)}
                  className={cn(
                    "flex items-center justify-between gap-xs",
                    "px-md py-sm type-body text-primary cursor-pointer",
                    isHighlighted && "bg-accent-subtle-bg",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check
                      size={15}
                      className="shrink-0 text-accent-default"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Select;
