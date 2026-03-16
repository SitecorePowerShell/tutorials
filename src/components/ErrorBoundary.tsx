import { Component, type ReactNode, type ErrorInfo } from "react";
import { colors, fontSizes } from "../theme";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: colors.bgBase,
            color: colors.textPrimary,
            fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 16 }}>Something went wrong</div>
          <div
            style={{
              color: colors.textMuted,
              fontSize: fontSizes.body,
              maxWidth: 480,
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            The tutorial encountered an unexpected error. Your progress has been saved.
          </div>
          {this.state.error && (
            <pre
              style={{
                background: colors.bgDeep,
                border: `1px solid ${colors.borderBase}`,
                borderRadius: 6,
                padding: "12px 16px",
                fontSize: fontSizes.sm,
                color: colors.statusError,
                maxWidth: 600,
                overflow: "auto",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: "10px 24px",
              background: colors.accentPrimary,
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontSize: fontSizes.body,
              fontFamily: "inherit",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reload Tutorial
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
