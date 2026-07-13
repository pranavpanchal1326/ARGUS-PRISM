/* Brass indicator lamp — system health as a small physical lamp. */
import "./lamp.css";

type LampState = "green" | "amber" | "red" | "off";

export function BrassLamp({ state, label }: { state: LampState; label: string }) {
  return (
    <span className="lamp" title={`${label}: ${state.toUpperCase()}`}>
      <span className={`lamp__bulb lamp__bulb--${state}`} aria-hidden />
      <span className="lamp__label v-label">{label}</span>
    </span>
  );
}
