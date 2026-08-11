"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils";

const emptySubscribe = () => () => {};
// Bridges "are we on the client yet" without the setState-in-effect pattern —
// portals need this to avoid an SSR/hydration mismatch.
const useMounted = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

type CitationChipProps = {
  documentTitle: string;
  excerpt: string;
  documentHref: string;
  expanded?: boolean;
  /** Skip the measured-space check and always open the tooltip upward — for
   * chips the caller already knows sit near the bottom of the scroll area
   * (e.g. citations on the last message in a chat thread). */
  forceUpward?: boolean;
};

const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 8;
const VIEWPORT_MARGIN = 12;
const FLIP_THRESHOLD = 200;

type TooltipPosition = {
  left: number;
  top?: number;
  bottom?: number;
  openUpward: boolean;
};

const CitationChip = ({
  documentTitle,
  excerpt,
  documentHref,
  expanded = false,
  forceUpward = false,
}: CitationChipProps) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const mounted = useMounted();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward =
      forceUpward || (spaceBelow < FLIP_THRESHOLD && spaceAbove > spaceBelow);
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN,
    );

    setPosition({
      left,
      openUpward,
      top: openUpward ? undefined : rect.bottom + TOOLTIP_GAP,
      bottom: openUpward ? window.innerHeight - rect.top + TOOLTIP_GAP : undefined,
    });
  }, [forceUpward]);

  const open = useCallback(() => {
    updatePosition();
    setIsExpanded(true);
  }, [updatePosition]);

  const close = useCallback(() => setIsExpanded(false), []);

  useEffect(() => {
    if (!isExpanded) return;
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isExpanded, close]);

  const isVisible = isExpanded && !!position;

  return (
    <div className="inline-block" onMouseEnter={open} onMouseLeave={close}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={isExpanded}
        onClick={() => (isExpanded ? close() : open())}
        onFocus={open}
        onBlur={close}
        className={cn(
          "h-[22px] max-w-[200px] inline-flex items-center px-xs rounded-full",
          "bg-canvas border border-line-subtle type-mono-label text-secondary",
        )}
      >
        <span className="truncate">{documentTitle}</span>
      </button>

      {mounted &&
        createPortal(
          <div
            role="tooltip"
            aria-hidden={!isVisible}
            style={{
              left: position?.left,
              top: position?.top,
              bottom: position?.bottom,
            }}
            className={cn(
              "fixed w-[320px] p-md rounded-lg shadow-md bg-surface-raised z-50",
              "transition-[opacity,transform] duration-150 ease-out",
              position?.openUpward ? "origin-bottom" : "origin-top",
              isVisible
                ? "opacity-100 scale-100 pointer-events-auto"
                : "opacity-0 scale-95 pointer-events-none",
            )}
          >
            <p className="type-mono text-primary line-clamp-6 overflow-hidden">
              {excerpt}
            </p>
            <a
              href={documentHref}
              className="mt-sm inline-block type-label text-accent-default hover:text-accent-hover"
            >
              View document
            </a>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default CitationChip;
