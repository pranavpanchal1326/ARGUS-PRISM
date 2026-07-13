/* Per-view error boundary — one broken screen never blanks the app.
   The failure renders as the paper world's problem: a RETURNED stamp. */
import { Component, type ReactNode } from "react";

interface State { error: Error | null; }

export class ViewBoundary extends Component<{ children: ReactNode; title?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="void-state" role="alert">
        <span className="stamp stamp--oxblood stamp--landing">RETURNED</span>
        <p className="void-state__epigraph v-institution">This desk has jammed.</p>
        <p className="void-state__detail v-machine">{this.state.error.message}</p>
        <button className="btn-brass" onClick={() => this.setState({ error: null })}>
          Resume work
        </button>
      </div>
    );
  }
}
