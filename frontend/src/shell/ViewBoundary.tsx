/* Per-view error boundary — one broken sheet never blanks the press.
   The failure renders as a MISPRINT. */
import { Component, type ReactNode } from "react";
import { Overprint } from "../canon/Overprint";

interface State { error: Error | null; }

export class ViewBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="misprint" role="alert">
        <div className="misprint__stamp"><Overprint tone="vermilion" size="body">MISPRINT</Overprint></div>
        <p className="void__line" style={{ fontSize: "var(--text-20)", marginBottom: "var(--s-2)" }}>This sheet jammed in the press.</p>
        <p className="misprint__detail">{this.state.error.message}</p>
        <button className="btn btn--secondary" onClick={() => this.setState({ error: null })}>
          Re-run the sheet
        </button>
      </div>
    );
  }
}
