import React from "react";

type TopErrorBoundaryState = {
  hasError: boolean;
  message: string;
  stack?: string;
};

export class TopErrorBoundary extends React.Component<
  { children: React.ReactNode },
  TopErrorBoundaryState
> {
  state: TopErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): TopErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
      stack: error.stack,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error", error, errorInfo);
  }

  private selectTextArea(event: React.MouseEvent<HTMLTextAreaElement>) {
    if (event.target !== document.activeElement) {
      event.preventDefault();
      (event.target as HTMLTextAreaElement).select();
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="ErrorSplash excalidraw">
        <div className="ErrorSplash-messageContainer">
          <div className="ErrorSplash-paragraph bigger align-center">
            Something went wrong.
          </div>
          <div className="ErrorSplash-paragraph align-center">
            Your drawings are stored locally. Reload the app to continue.
          </div>
          <div className="ErrorSplash-paragraph align-center">
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
          <div className="ErrorSplash-paragraph">
            <div className="ErrorSplash-details">
              <label>Error details</label>
              <textarea
                className="box-border mt-2 w-full"
                rows={6}
                readOnly
                onPointerDown={this.selectTextArea}
                value={`${this.state.message}\n\n${this.state.stack ?? ""}`}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
