import { Component, type ErrorInfo, type ReactNode } from "react";
import { T } from "../theme/tokens";
import { Btn, Card } from "./ui";

/* ----------------------------------------------------------------------------
   Catches render errors so one broken view can't blank the whole app.
   Mounted around the route outlet (keyed by pathname, so navigating away
   recovers automatically) and once around the app root.
   -------------------------------------------------------------------------- */

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 32, fontFamily: T.font }}>
        <Card style={{ maxWidth: 560, margin: "48px auto", padding: 26 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, margin: "10px 0 6px" }}>
            This view hit an unexpected error. Your data is safe — try again, or navigate to
            another page.
          </div>
          <code
            style={{
              display: "block",
              fontSize: 12,
              color: T.critical,
              background: T.criticalBg,
              borderRadius: 4,
              padding: "8px 10px",
              margin: "10px 0 16px",
              overflowWrap: "anywhere",
            }}
          >
            {this.state.error.message}
          </code>
          <Btn variant="primary" onClick={() => this.setState({ error: null })}>
            Try again
          </Btn>
        </Card>
      </div>
    );
  }
}
