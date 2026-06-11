import {
  ClipboardList,
  FileBarChart,
  GitPullRequestArrow,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Repeat,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { T } from "../../theme/tokens";
import { useAppData } from "../../store/AppData";
import type { Permission } from "../../types/auth";
import { GlobalSearch } from "../GlobalSearch";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
  /** Hidden unless the signed-in user holds this permission. */
  permission: Permission;
}

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
    label: "General",
    items: [
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

export function Sidebar() {
  const { activeProjects, activeRisks, changes } = useAppData();
  const { session, user, can, signOut } = useAuth();

  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((item) => can(item.permission)),
  })).filter((s) => s.items.length > 0);

  return (
    <div
      style={{
        width: 230,
        background: T.sidebar,
        color: T.sidebarText,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      <div style={{ padding: "18px 16px", display: "flex", alignItems: "center", gap: 11 }}>
        <div
          style={{
            width: 34,
            height: 34,
            background: T.logo,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 16,
              height: 12,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {[0, 1, 2].map((k) => (
              <div key={k} style={{ height: 2.4, background: "#fff", borderRadius: 2 }} />
            ))}
          </div>
        </div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>
            RiskShield
          </div>
          <div style={{ fontSize: 11, color: T.textTer }}>Risk &amp; Change</div>
        </div>
      </div>

      <GlobalSearch />

      <div style={{ padding: "0 10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {sections.map((section) => (
          <div key={section.label}>
            <div
              style={{
                fontSize: 10,
                color: T.textTer,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                padding: "12px 11px 4px",
                fontWeight: 700,
              }}
            >
              {section.label}
            </div>
            {section.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} style={{ textDecoration: "none" }}>
                {({ isActive }) => (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "8px 11px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 13.5,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#fff" : T.sidebarText,
                      background: isActive ? T.brand : "transparent",
                    }}
                  >
                    <item.icon size={17} />
                    {item.label}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: "14px 18px", marginTop: 8, borderTop: `1px solid ${T.sidebarItem}` }}>
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
          live changes
        </div>
      </div>

      <div
        style={{
          marginTop: "auto",
          padding: "14px 16px",
          borderTop: `1px solid ${T.sidebarItem}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
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
        <div style={{ flex: 1, minWidth: 0 }}>
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
          <div style={{ fontSize: 11, color: T.textTer }}>
            {session?.roles.map((r) => r.name).join(", ") ?? ""}
          </div>
        </div>
        <button
          onClick={() => void signOut()}
          title="Sign out"
          aria-label="Sign out"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: T.sidebarText,
            padding: 6,
            borderRadius: 6,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
