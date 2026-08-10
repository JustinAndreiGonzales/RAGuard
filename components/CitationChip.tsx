"use client";

import { useState } from "react";
import { cn } from "./lib/utils";

type CitationChipProps = {
  documentTitle: string;
  excerpt: string;
  documentHref: string;
  expanded?: boolean;
};

const CitationChip = ({
  documentTitle,
  excerpt,
  documentHref,
  expanded = false,
}: CitationChipProps) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
        onFocus={() => setIsExpanded(true)}
        onBlur={() => setIsExpanded(false)}
        className={cn(
          "h-[22px] max-w-[200px] inline-flex items-center px-xs rounded-full",
          "bg-canvas border border-line-subtle type-mono-label text-secondary",
        )}
      >
        <span className="truncate">{documentTitle}</span>
      </button>

      {isExpanded && (
        <div
          role="tooltip"
          className="absolute top-full left-0 mt-xs w-[320px] p-md rounded-lg shadow-md bg-surface-raised z-10"
        >
          <p className="type-mono text-primary">{excerpt}</p>
          <a
            href={documentHref}
            className="mt-sm inline-block type-label text-accent-default hover:text-accent-hover"
          >
            View document
          </a>
        </div>
      )}
    </div>
  );
};

export default CitationChip;
