import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  FolderKanban,
  GitPullRequestArrow,
  LayoutDashboard,
  LogOut,
  Moon,
  PlusCircle,
  Repeat,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";
import { type CSSProperties, type RefObject, useLayoutEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { T } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { useAppData } from "../../store/AppData";
import { BrandMark } from "../Brand";
import type { Permission } from "../../types/auth";
import { GlobalSearch, type GlobalSearchHandle } from "../GlobalSearch";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
  permission: Permission;
}

const SIDEBAR_COLLAPSED_KEY = "riskshield.sidebar.collapsed";
const SIDEBAR_WIDTH = {
  expanded: "252px",
  collapsed: "68px",
} as const;
const SIDEBAR_MOTION = "var(--sidebar-motion-duration, 300ms) cubic-bezier(0.16, 1, 0.3, 1)";

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Risk Dashboard", icon: LayoutDashboard, end: true, permission: "risks:read" },
      { to: "/changes/dashboard", label: "Change Dashboard", icon: Repeat, end: true, permission: "changes:read" },
    ],
  },
  {
    label: "Risk",
    items: [
      { to: "/risks", label: "Risk Register", icon: ClipboardList, end: true, permission: "risks:read" },
      { to: "/risks/new", label: "Add Risk", icon: PlusCircle, end: true, permission: "risks:create" },
    ],
  },
  {
    label: "Change",
    items: [
      { to: "/changes", label: "Change Register", icon: GitPullRequestArrow, end: true, permission: "changes:read" },
      { to: "/changes/new", label: "Raise Change", icon: PlusCircle, end: true, permission: "changes:create" },
    ],
  },
  {
    label: "Issue",
    items: [
      { to: "/issues", label: "Issue Register", icon: AlertCircle, end: true, permission: "risks:read" },
      { to: "/issues/new", label: "Raise Issue", icon: PlusCircle, end: true, permission: "risks:update" },
    ],
  },
  {
    label: "General",
    items: [
      { to: "/projects", label: "Projects", icon: FolderKanban, end: true, permission: "projects:manage" },
      { to: "/reports", label: "Reports", icon: FileBarChart, end: false, permission: "reports:read" },
      { to: "/settings", label: "Settings", icon: Settings, end: false, permission: "settings:manage" },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/admin/users", label: "Users", icon: Users, end: true, permission: "users:manage" },
      { to: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck, end: true, permission: "roles:manage" },
    ],
  },
];

const KEYBOARD_SHORTCUTS = [
  { key: "Alt+R", desc: "Add risk" },
  { key: "Alt+C", desc: "Raise change" },
  { key: "/", desc: "Search" },
] as const;

const applySidebarWidth = (collapsed: boolean) => {
  document.documentElement.style.setProperty(
    "--sidebar-w",
    collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded,
  );
};

const hiddenPanelStyle = (isCollapsed: boolean, maxHeight: number): CSSProperties => ({
  opacity: isCollapsed ? 0 : 1,
  maxHeight: isCollapsed ? 0 : maxHeight,
  overflow: "hidden",
  pointerEvents: isCollapsed ? "none" : "auto",
  flexShrink: 0,
  transition: isCollapsed
    ? "opacity 100ms ease, max-height 250ms ease"
    : "opacity 150ms ease 80ms, max-height 300ms cubic-bezier(0.16, 1, 0.3, 1)",
});

export function Sidebar({ searchRef }: { searchRef?: RefObject<GlobalSearchHandle | null> }) {
  const { activeProjects, activeRisks, activeIssues, changes, config } = useAppData();
  const { session, user, can, signOut } = useAuth();
  const { scheme, toggle } = useTheme();
  const { appName, tagline, logoUrl } = config.branding;
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useLayoutEffect(() => {
    applySidebarWidth(isCollapsed);
  }, []);

  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((item) => can(item.permission)),
  })).filter((s) => s.items.length > 0);

  const isSectionActive = (items: NavItem[]) =>
    items.some((item) => {
      if (item.end) return location.pathname === item.to;
      return location.pathname.startsWith(item.to);
    });

  const handleToggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    applySidebarWidth(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // Storage can be unavailable in private or locked-down browser contexts.
    }
  };

  const labelStyle: CSSProperties = {
    opacity: isCollapsed ? 0 : 1,
    maxWidth: isCollapsed ? 0 : 140,
    overflow: "hidden",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: isCollapsed
      ? "opacity 100ms ease, max-width 250ms cubic-bezier(0.4, 0, 1, 1)"
      : "opacity 180ms ease 100ms, max-width 300ms cubic-bezier(0.16, 1, 0.3, 1)",
  };

  const themeButton = (
    <button
      className="rs-sidebar-icon-button"
      onClick={toggle}
      title={scheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={scheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "grid",
        placeItems: "center",
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: 8,
        border: `1px solid ${isCollapsed ? "var(--sidebar-glass-border)" : T.sidebarItem}`,
        background: isCollapsed ? "rgba(255, 255, 255, 0.06)" : "transparent",
        color: T.sidebarText,
        cursor: "pointer",
      }}
    >
      {scheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );

  return (
    <>
      <style>{`
        .rs-sidebar-icon-button:focus-visible,
        .rs-nav-link:focus-visible .rs-nav-item {
          outline: 2px solid var(--brand);
          outline-offset: 2px;
        }

        .rs-nav-link:focus-visible {
          outline: none;
        }

        @media (pointer: fine) {
          .rs-kbd-hints {
            display: flex !important;
          }

          .rs-sidebar-island.is-collapsed .rs-kbd-hints {
            display: none !important;
          }

          .rs-nav-item {
            position: relative;
          }

          .rs-nav-tooltip {
            position: absolute;
            left: calc(100% + 12px);
            top: 50%;
            transform: translateY(-50%) translateX(-4px);
            background: rgba(18, 20, 30, 0.82);
            -webkit-backdrop-filter: blur(16px);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.10);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
            color: #c9cdd9;
            border-radius: 8px;
            padding: 6px 12px;
            font-size: 12.5px;
            font-weight: 600;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 120ms ease, transform 120ms ease;
            z-index: 51;
          }

          .rs-nav-item:hover .rs-nav-tooltip {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rs-sidebar-island,
          .rs-sidebar-island *,
          .rs-shell-content {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
      <aside
        className={`rs-sidebar-island${isCollapsed ? " is-collapsed" : ""}`}
        aria-label="Primary"
        style={{
          background: "var(--sidebar-glass-bg)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid var(--sidebar-glass-border)",
          boxShadow: "var(--sidebar-glass-shadow)",
          borderRadius: 18,
          margin: 16,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: isCollapsed ? "calc(68px - 32px)" : "calc(252px - 32px)",
          transition: `width ${SIDEBAR_MOTION}`,
          display: "flex",
          flexDirection: "column",
          overflowX: "visible",
          overflowY: isCollapsed ? "visible" : "auto",
          zIndex: 50,
          color: T.sidebarText,
        }}
      >
        <div
          style={{
            padding: isCollapsed ? "42px 4px 10px" : "18px 10px 10px",
            display: "flex",
            flexDirection: isCollapsed ? "column" : "row",
            alignItems: "center",
            gap: isCollapsed ? 10 : 8,
            position: "relative",
            flexShrink: 0,
            transition: "padding 200ms ease, gap 200ms ease",
          }}
        >
          <BrandMark logoUrl={logoUrl} appName={appName} size={isCollapsed ? 30 : 34} />
          <div
            style={{
              minWidth: 0,
              flex: 1,
              opacity: isCollapsed ? 0 : 1,
              maxWidth: isCollapsed ? 0 : 92,
              overflow: "hidden",
              transition: isCollapsed
                ? "opacity 100ms ease, max-width 250ms ease"
                : "opacity 180ms ease 100ms, max-width 300ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                lineHeight: 1.1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={appName}
            >
              {appName}
            </div>
            {tagline && <div style={{ fontSize: 11, color: T.textTer }}>{tagline}</div>}
          </div>
          {!isCollapsed && themeButton}
          <button
            className="rs-sidebar-icon-button"
            onClick={handleToggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              display: "grid",
              placeItems: "center",
              width: 28,
              height: 28,
              flexShrink: 0,
              borderRadius: 8,
              border: "1px solid var(--sidebar-glass-border)",
              background: "rgba(255, 255, 255, 0.06)",
              color: T.sidebarText,
              cursor: "pointer",
              position: isCollapsed ? "absolute" : "static",
              top: isCollapsed ? 6 : "auto",
              right: isCollapsed ? 4 : "auto",
            }}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          {isCollapsed && themeButton}
        </div>

        <div
          aria-hidden={isCollapsed}
          style={{
            ...hiddenPanelStyle(isCollapsed, 58),
            display: isCollapsed ? "none" : "block",
          }}
        >
          <GlobalSearch ref={searchRef as RefObject<GlobalSearchHandle>} />
        </div>

        <div
          style={{
            padding: isCollapsed ? "0 4px 8px" : "0 10px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            flex: isCollapsed ? "0 0 auto" : "1 1 auto",
            minHeight: isCollapsed ? "auto" : 0,
            overflowX: "visible",
            overflowY: isCollapsed ? "visible" : "auto",
            transition: "padding 200ms ease",
          }}
        >
          {sections.map((section) => {
            const active = isSectionActive(section.items);
            return (
              <div key={section.label}>
                <div
                  style={{
                    ...hiddenPanelStyle(isCollapsed, 32),
                    fontSize: 10,
                    color: active ? T.sidebarText : T.textTer,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    padding: isCollapsed ? "0 11px" : "12px 11px 4px",
                    fontWeight: 700,
                    borderLeft: active ? `2px solid ${T.brand}` : "2px solid transparent",
                  }}
                >
                  {section.label}
                </div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className="rs-nav-link"
                    aria-label={isCollapsed ? item.label : undefined}
                    title={isCollapsed ? item.label : undefined}
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    {({ isActive }) => (
                      <div
                        className="rs-nav-item"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: isCollapsed ? "center" : "flex-start",
                          gap: isCollapsed ? 0 : 11,
                          minHeight: 36,
                          padding: isCollapsed ? "8px 0" : "8px 11px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontSize: 13.5,
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? "#fff" : T.sidebarText,
                          background: isActive ? T.brand : "transparent",
                          transition:
                            "background 160ms ease, color 160ms ease, padding 200ms ease, gap 200ms ease",
                        }}
                      >
                        <item.icon size={17} style={{ flexShrink: 0 }} />
                        <span style={labelStyle}>{item.label}</span>
                        {isCollapsed && (
                          <span className="rs-nav-tooltip" aria-hidden="true">
                            {item.label}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>

        <div
          style={{
            ...hiddenPanelStyle(isCollapsed, 96),
            padding: isCollapsed ? "0 18px" : "14px 18px",
            marginTop: isCollapsed ? 0 : 8,
            borderTop: `1px solid ${T.sidebarItem}`,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              color: T.textTer,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Portfolio
          </div>
          <div style={{ color: "#fff", fontWeight: 600, fontSize: 13.5, marginTop: 4 }}>
            {activeProjects.length} active {activeProjects.length === 1 ? "project" : "projects"}
          </div>
          <div style={{ fontSize: 11.5, color: T.textTer }}>
            {activeRisks.filter((r) => r.status !== "Closed").length} open risks ·{" "}
            {changes.filter((c) => c.status !== "Implemented" && c.status !== "Rejected").length}{" "}
            live changes ·{" "}
            {activeIssues.filter((i) => i.status !== "Closed").length} open issues
          </div>
        </div>

        <div
          className="rs-kbd-hints"
          style={{
            ...hiddenPanelStyle(isCollapsed, 104),
            display: "none",
            flexDirection: "column",
            gap: 4,
            padding: isCollapsed ? "0 18px" : "10px 18px",
            borderTop: `1px solid ${T.sidebarItem}`,
          }}
        >
          <div style={{ fontSize: 10, color: T.textTer, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>
            Shortcuts
          </div>
          {KEYBOARD_SHORTCUTS.map(({ key, desc }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <kbd
                style={{
                  background: T.sidebarItem,
                  color: T.sidebarText,
                  border: `1px solid ${T.textTer}`,
                  borderRadius: 3,
                  padding: "1px 5px",
                  fontFamily: "monospace",
                  fontSize: 10.5,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {key}
              </kbd>
              <span style={{ color: T.textTer }}>{desc}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "auto",
            padding: isCollapsed ? "12px 2px" : "14px 16px",
            borderTop: `1px solid ${T.sidebarItem}`,
            display: "flex",
            flexDirection: isCollapsed ? "column" : "row",
            alignItems: "center",
            gap: isCollapsed ? 8 : 10,
            flexShrink: 0,
            transition: "padding 200ms ease, gap 200ms ease",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: T.brand,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user?.initials ?? "·"}
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              opacity: isCollapsed ? 0 : 1,
              maxWidth: isCollapsed ? 0 : 116,
              overflow: "hidden",
              transition: isCollapsed
                ? "opacity 100ms ease, max-width 250ms ease"
                : "opacity 180ms ease 100ms, max-width 300ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              style={{
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.name ?? "—"}
            </div>
            <div style={{ fontSize: 11, color: T.textTer, whiteSpace: "nowrap" }}>
              {session?.roles.map((r) => r.name).join(", ") ?? ""}
            </div>
          </div>
          <button
            className="rs-sidebar-icon-button"
            onClick={() => void signOut()}
            title="Sign out"
            aria-label="Sign out"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.sidebarText,
              padding: 6,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
