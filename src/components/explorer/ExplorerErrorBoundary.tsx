import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ExplorerErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ExplorerErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-background px-6 text-center text-sm text-muted-foreground">
        <div className="max-w-md space-y-2">
          <p className="font-medium text-foreground">L’explorateur a rencontré une erreur.</p>
          <p className="allow-select break-words">{this.state.error.message}</p>
        </div>
      </div>
    );
  }
}