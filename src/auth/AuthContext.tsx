import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authServices } from "../api/auth";
import { T } from "../theme/tokens";
import type { Permission, Session, User } from "../types/auth";
import { hasPermission } from "../types/auth";
import { Btn, Card } from "../components/ui";

/* ============================================================================
   AuthContext — holds the signed-in session and exposes `can()` so the UI can
   gate navigation, routes and actions on fine-grained permissions. Client
   checks are UX only: the service layer (mock today, backend in HTTP mode)
   re-enforces every permission.
   ========================================================================== */

interface AuthValue {
  /** True while the stored session is being restored on first load. */
  initializing: boolean;
  session: Session | null;
  user: User | null;
  can: (permission: Permission) => boolean;
  signIn: (email: string, password: string) => Promise<Session>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    authServices.auth
      .getSession()
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When the HTTP layer detects a 401 mid-session it dispatches this event so
  // the UI drops back to the sign-in page without needing a page reload.
  useEffect(() => {
    const handle = () => setSession(null);
    window.addEventListener("riskshield:auth-expired", handle);
    return () => window.removeEventListener("riskshield:auth-expired", handle);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const s = await authServices.auth.signIn(email, password);
    setSession(s);
    return s;
  }, []);

  const signOut = useCallback(async () => {
    await authServices.auth.signOut();
    setSession(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      initializing,
      session,
      user: session?.user ?? null,
      can: (permission) => hasPermission(session, permission),
      signIn,
      signOut,
    }),
    [initializing, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/* ---- Route guard ---------------------------------------------------------- */

export function AccessDenied({ permission }: { permission: Permission }) {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 24 }}>
      <Card style={{ maxWidth: 520, margin: "60px auto", padding: 32, textAlign: "center" }}>
        <ShieldAlert size={36} style={{ color: T.high }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginTop: 12 }}>
          Access denied
        </div>
        <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, marginTop: 8 }}>
          Your account does not have the <code>{permission}</code> permission required for this
          page. Contact an administrator if you believe you should have access.
        </div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <Btn variant="primary" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </Btn>
        </div>
      </Card>
    </div>
  );
}

/** Wrap a route element to require a permission, e.g.
    `<Route element={<RequirePermission permission="settings:manage"><SettingsPage /></RequirePermission>} />` */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (!can(permission)) return <AccessDenied permission={permission} />;
  return <>{children}</>;
}
