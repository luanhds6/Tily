import React from "react";
import { logError } from "@/lib/logger";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: unknown };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError(error, { message: "React component error", componentStack: info.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md border rounded-md p-4 bg-background">
            <h1 className="text-lg font-semibold mb-2">Ocorreu um erro</h1>
            <p className="text-sm text-muted-foreground mb-4">
              O erro foi registrado no console do navegador. Tente novamente.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

