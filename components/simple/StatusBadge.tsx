import React from "react";
import { cn } from "../lib/utils";

type Status = "pending" | "processing" | "ready" | "failed";

type StatusBadgeProps = {
  status: Status;
};

const STATUS = {
  pending: {
    text: "PENDING",
    style: "bg-status-pending-bg text-status-pending-fg",
    circle: "bg-status-pending-fg",
  },
  processing: {
    text: "PROCESSING",
    style: "bg-status-processing-bg text-status-processing-fg",
    circle: "bg-status-processing-fg",
  },
  ready: {
    text: "READY",
    style: "bg-status-ready-bg text-status-ready-fg",
    circle: "bg-status-ready-fg",
  },
  failed: {
    text: "FAILED",
    style: "bg-status-failed-bg text-status-failed-fg",
    circle: "bg-status-failed-fg",
  },
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2xs h-lg px-xs rounded-full",
        "type-mono-label",
        STATUS[status].style,
      )}
    >
      <div
        className={cn(
          "h-2xs w-2xs shrink-0 rounded-full",
          STATUS[status].circle,
        )}
      />
      <p>{STATUS[status].text}</p>
    </div>
  );
};

export default StatusBadge;
