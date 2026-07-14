/* THE ENGRAVED GLYPH STANDARD (Part 5.2). 20×20 grid, 1.5px stroke,
   squared terminals, miter joins, NO fills ever, currentColor only. Each
   glyph may carry at most one 0.75px hatch detail — what makes the set
   ours and not a generic icon pack. Every glyph ships an aria-label. */

export type GlyphName =
  | "examine" | "seal" | "cancel" | "feed" | "register" | "plate" | "thread"
  | "punch" | "lever" | "serial" | "dossier" | "routing" | "freeze" | "escalate"
  | "countersign" | "fingerprint" | "press" | "station" | "operator" | "key"
  | "tilt" | "replay" | "compare" | "misprint" | "index" | "bookmark" | "live" | "close";

const LABELS: Record<GlyphName, string> = {
  examine: "Examine", seal: "Seal", cancel: "Cancel", feed: "Feed", register: "Register",
  plate: "Plate", thread: "Thread", punch: "Punch", lever: "Lever", serial: "Serial",
  dossier: "Dossier", routing: "Routing", freeze: "Freeze", escalate: "Escalate",
  countersign: "Countersign", fingerprint: "Fingerprint", press: "Press", station: "Station",
  operator: "Operator", key: "Key", tilt: "Verify", replay: "Replay", compare: "Compare",
  misprint: "Misprint", index: "Index", bookmark: "Bookmark", live: "Live", close: "Close",
};

const PATHS: Record<GlyphName, React.ReactNode> = {
  examine: <><circle cx="8.5" cy="8.5" r="5.5" /><path d="M12.5 12.5 L17 17" /><path d="M6 8.5h5" strokeWidth="0.75" /></>,
  seal: <><circle cx="10" cy="10" r="6" /><path d="M10 5v10M5 10h10" strokeWidth="0.75" /></>,
  cancel: <><circle cx="10" cy="10" r="6.5" /><path d="M5.5 5.5 L14.5 14.5" /></>,
  feed: <><rect x="4" y="4" width="12" height="12" /><path d="M10 7v6M7 10l3 3 3-3" /></>,
  register: <><path d="M4 4h9a2 2 0 0 1 2 2v10H6a2 2 0 0 1-2-2z" /><path d="M15 6H6v10" strokeWidth="0.75" /></>,
  plate: <><path d="M10 3 L17 10 L10 17 L3 10 Z" /><path d="M10 6.5 L13.5 10 L10 13.5 L6.5 10 Z" strokeWidth="0.75" /></>,
  thread: <><path d="M5 15 C5 10 15 10 15 5" /><circle cx="5" cy="15" r="1" /><circle cx="15" cy="5" r="1" /></>,
  punch: <><circle cx="10" cy="10" r="6" /><circle cx="10" cy="10" r="2" strokeWidth="0.75" /></>,
  lever: <><rect x="4" y="8" width="12" height="4" rx="2" /><circle cx="13" cy="10" r="2.5" /></>,
  serial: <><rect x="3" y="6" width="14" height="8" /><path d="M7 8v4M9 8v4M11 8v4M13 8v4" strokeWidth="0.75" /></>,
  dossier: <><path d="M4 5h5l1.5 2H16v9H4z" /></>,
  routing: <><path d="M4 6h9l3 4-3 4H4z" /><path d="M8 10h5" strokeWidth="0.75" /></>,
  freeze: <><path d="M10 3v14M4 6.5l12 7M16 6.5l-12 7" /></>,
  escalate: <><path d="M10 4l5 6h-3v6H8v-6H5z" /></>,
  countersign: <><path d="M4 14c3-1 4-6 6-6s2 4 4 4" /><path d="M4 16h12" strokeWidth="0.75" /></>,
  fingerprint: <><path d="M6 10a4 4 0 0 1 8 0v3" /><path d="M8 10a2 2 0 0 1 4 0v3" strokeWidth="0.75" /><path d="M10 10v4" /></>,
  press: <><rect x="4" y="5" width="12" height="4" rx="2" /><path d="M10 9v4M6 16h8" /></>,
  station: <><circle cx="10" cy="10" r="6" /><path d="M10 6v4l3 2" strokeWidth="0.75" /></>,
  operator: <><circle cx="10" cy="7" r="3" /><path d="M4 16c0-3.3 2.7-5 6-5s6 1.7 6 5" /></>,
  key: <><circle cx="7" cy="10" r="3" /><path d="M10 10h6M14 10v3" /></>,
  tilt: <><path d="M4 10l4 4 8-8" /></>,
  replay: <><circle cx="10" cy="10" r="6" /><path d="M10 6v4l3 2" /><path d="M4 10h2" strokeWidth="0.75" /></>,
  compare: <><circle cx="7" cy="10" r="4" /><circle cx="13" cy="10" r="4" strokeWidth="0.75" /></>,
  misprint: <><path d="M6 4h8v12H6z" /><path d="M7.5 5.5h8v12" strokeWidth="0.75" /></>,
  index: <><rect x="3" y="5" width="14" height="10" rx="1" /><path d="M3 8h14" strokeWidth="0.75" /></>,
  bookmark: <><path d="M6 3h8v14l-4-3-4 3z" /></>,
  live: <><circle cx="10" cy="10" r="3" /><path d="M5 10a5 5 0 0 1 10 0" strokeWidth="0.75" /></>,
  close: <><path d="M5 5l10 10M15 5L5 15" /></>,
};

interface Props { name: GlyphName; size?: 16 | 20 | 28; className?: string; decorative?: boolean; }

export function Icon({ name, size = 20, className, decorative }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : LABELS[name]}>
      {PATHS[name]}
    </svg>
  );
}
