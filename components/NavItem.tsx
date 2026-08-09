import { cn } from "./lib/utils";
import { LucideIcon } from "lucide-react";

type NavItemProps = {
  isActive?: boolean;
  Icon?: LucideIcon | null;
  label: string;
};

const NavItem = ({ isActive = false, Icon = null, label }: NavItemProps) => {
  return (
    <div
      className={cn(
        "h-[40px] w-full px-md rounded-md flex items-center gap-sm relative",
        isActive ? "bg-accent-subtle-bg text-accent-default" : "text-secondary",
        "hover:bg-canvas",
      )}
    >
      {isActive && (
        <span className="absolute left-[0px] top-xs bottom-xs w-[2px] bg-accent-default z-10" />
      )}

      {Icon && <Icon className="h-[20px] w-[20px] shrink-0" />}
      <span className="type-label truncate">{label}</span>
    </div>
  );
};

export default NavItem;
