"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronsUpDown,
  FileText,
  LogOut,
  MessageSquare,
  User,
  Users,
} from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import Avatar from "../simple/Avatar";
import NavItem from "../simple/NavItem";

type NavKey = "chat" | "documents" | "teams";
type Role = "admin" | "user";

type SidebarProps = {
  activeNav: NavKey;
  onNavigate?: (nav: NavKey) => void;
  role: Role;
  userName: string;
  userEmail: string;
  userInitials: string;
  userAvatarSrc?: string | null;
  onAccountClick?: () => void;
  onSignOutClick?: () => void;
  sidebarContent?: ReactNode;
};

const NAV_ITEMS: { key: NavKey; label: string; icon: typeof MessageSquare }[] =
  [
    { key: "chat", label: "Chat", icon: MessageSquare },
    { key: "documents", label: "Documents", icon: FileText },
    { key: "teams", label: "Teams", icon: Users },
  ];

const Sidebar = ({
  activeNav,
  onNavigate,
  role,
  userName,
  userEmail,
  userInitials,
  userAvatarSrc = null,
  onAccountClick,
  onSignOutClick,
  sidebarContent,
}: SidebarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const navItems = NAV_ITEMS.filter(
    (item) => item.key !== "teams" || role === "admin",
  );

  return (
    <aside
      className={cn(
        "h-screen shrink-0 flex flex-col bg-surface border-r border-line p-md transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      <div
        className={cn(
          "flex items-center h-[40px] mb-sm shrink-0",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
          <h1 className="type-h2 text-primary truncate">RAGuard</h1>
        )}
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((prev) => !prev)}
          className="shrink-0 h-[32px] w-[32px] flex items-center justify-center rounded-md text-secondary hover:bg-canvas hover:text-primary"
        >
          {collapsed ? (
            <ArrowRight className="h-[18px] w-[18px]" />
          ) : (
            <ArrowLeft className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>

      <nav className="flex flex-col gap-2xs">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-current={activeNav === item.key ? "page" : undefined}
            onClick={() => onNavigate?.(item.key)}
            className="w-full text-left"
          >
            <NavItem
              isActive={activeNav === item.key}
              Icon={item.icon}
              label={item.label}
              collapsed={collapsed}
            />
          </button>
        ))}
      </nav>

      {sidebarContent && !collapsed && (
        <div className="flex-1 min-h-[0px] overflow-y-auto mt-md">
          {sidebarContent}
        </div>
      )}

      <div ref={menuRef} className="relative mt-auto">
        {menuOpen && (
          <div className="absolute bottom-full left-[0px] mb-xs w-[200px] rounded-lg shadow-md bg-surface-raised p-2xs">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onAccountClick?.();
              }}
              className="w-full flex items-center gap-sm px-sm h-[36px] rounded-md text-primary type-body-sm hover:bg-canvas"
            >
              <User className="h-[16px] w-[16px] shrink-0" />
              Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onSignOutClick?.();
              }}
              className="w-full flex items-center gap-sm px-sm h-[36px] rounded-md text-primary type-body-sm hover:bg-canvas"
            >
              <LogOut className="h-[16px] w-[16px] shrink-0" />
              Sign out
            </button>
          </div>
        )}

        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          aria-label={collapsed ? `${userName}, account menu` : undefined}
          onClick={() => setMenuOpen((prev) => !prev)}
          className={cn(
            "w-full flex items-center gap-sm rounded-md hover:bg-canvas",
            collapsed ? "justify-center p-2xs" : "p-sm",
          )}
        >
          <Avatar size="md" initials={userInitials} src={userAvatarSrc} />
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="type-label text-primary truncate">{userName}</p>
                <p className="type-caption text-tertiary truncate">
                  {userEmail}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 h-[20px] inline-flex items-center px-xs rounded-full",
                  "bg-canvas border border-line-subtle type-mono-label text-secondary uppercase",
                )}
              >
                {role}
              </span>
              {/* <ChevronsUpDown className="h-[14px] w-[14px] shrink-0 text-tertiary" /> */}
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
