/* Honest placeholder — a wing not yet opened. Never fake-populated. */
import { Eye } from "../components/Eye";

export function UnderConstruction({ title }: { title: string }) {
  return (
    <div>
      <h1 className="screen-title">{title}</h1>
      <div className="void-state">
        <Eye state="closed" size={28} title="This wing is not yet open" />
        <p className="void-state__epigraph v-institution">This wing is not yet open.</p>
        <p className="void-state__detail">
          The {title} desk is being fitted. Its records are already kept in the vault —
          the room to read them is under construction.
        </p>
      </div>
    </div>
  );
}
