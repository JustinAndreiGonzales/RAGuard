import { cloneElement, isValidElement, ReactElement, ReactNode } from "react";
import { cn } from "../lib/utils";
import Button from "./Button";

type EmptyStateProps = {
  icon: ReactNode;
  heading: string;
  body: string;
  ctaLabel?: string | null;
  onCtaClick?: (() => void) | null;
};

const EmptyState = ({
  icon,
  heading,
  body,
  ctaLabel = null,
  onCtaClick = null,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center text-center gap-sm max-w-[360px] mx-auto">
      {isValidElement(icon)
        ? cloneElement(icon as ReactElement<{ className?: string }>, {
            className: cn(
              "h-[48px] w-[48px] text-tertiary",
              (icon as ReactElement<{ className?: string }>).props.className,
            ),
          })
        : icon}
      <h3 className="type-h3 text-primary">{heading}</h3>
      <p className="type-body text-secondary">{body}</p>
      {ctaLabel && (
        <Button variant="primary" onClick={onCtaClick ?? undefined}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
