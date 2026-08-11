import { cn } from "../lib/utils";
import { LucideIcon } from "lucide-react";

type NavItemProps = {
  isActive?: boolean;
  Icon?: LucideIcon | null;
  label: string;
  collapsed?: boolean;
  onClick?: () => void;
};

const NavItem = ({
  isActive = false,
  Icon = null,
  label,
  collapsed = false,
  onClick,
}: NavItemProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "h-[40px] w-full rounded-md flex items-center text-left relative",
        collapsed ? "justify-center px-0" : "px-md gap-sm",
        isActive ? "bg-accent-subtle-bg text-accent-default" : "text-secondary",
        "hover:bg-canvas",
      )}
    >
      {isActive && (
        <span className="absolute left-[0px] top-xs bottom-xs w-[2px] bg-accent-default z-10" />
      )}

      {Icon && <Icon className="h-[20px] w-[20px] shrink-0" />}
      <span className={cn("type-label truncate", collapsed && "sr-only")}>
        {label}
      </span>
    </button>
  );
};

export default NavItem;
