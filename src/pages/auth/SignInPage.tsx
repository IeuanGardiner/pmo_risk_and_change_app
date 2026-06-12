import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";
import { isMockMode } from "../../api";
import { DEMO_PASSWORD, SEED_USERS } from "../../api/mock/mockAuth";
import { useAuth } from "../../auth/AuthContext";
import { Btn, Card, Field, Input } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { T } from "../../theme/tokens";

/* ----------------------------------------------------------------------------
   Sign-in screen, shown whenever no session exists. In mock mode it lists the
   demo accounts (one per built-in role) so every access level can be tried.
   -------------------------------------------------------------------------- */
export function SignInPage() {
  usePageTitle("Sign in");
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily: T.font,
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
          <div
            style={{
              width: 38,
              height: 38,
              background: T.logo,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              style={{
                width: 17,
                height: 13,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {[0, 1, 2].map((k) => (
                <div key={k} style={{ height: 2.6, background: "#fff", borderRadius: 2 }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.text, lineHeight: 1.1 }}>
              RiskShield
            </div>
            <div style={{ fontSize: 12, color: T.textTer }}>Risk &amp; Change</div>
          </div>
        </div>

        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 14 }}>
            Sign in
          </div>
          <form onSubmit={(e) => void submit(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Email" required>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {error && (
              <div role="alert" style={{ fontSize: 12.5, color: T.critical, fontWeight: 600 }}>
                {error}
              </div>
            )}
            <Btn
              type="submit"
              variant="primary"
              icon={LogIn}
              loading={busy}
              disabled={!email.trim() || !password}
              style={{ justifyContent: "center" }}
            >
              Sign in
            </Btn>
          </form>
        </Card>

        {isMockMode && (
          <Card style={{ padding: 16, marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textSec, marginBottom: 4 }}>
              Demo accounts
            </div>
            <div style={{ fontSize: 11.5, color: T.textTer, marginBottom: 10 }}>
              Mock mode — pick an account to pre-fill the form. Password for every account is{" "}
              <code>{DEMO_PASSWORD}</code>.
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {SEED_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => quickFill(u.email)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 6px",
                    background: "none",
                    border: "none",
                    borderTop: `1px solid ${T.strokeSubtle}`,
                    cursor: "pointer",
                    fontFamily: T.font,
                    fontSize: 12.5,
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontWeight: 600, color: T.text }}>{u.name}</span>
                  <span style={{ color: T.textTer }}>{u.roleIds.join(", ")}</span>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
