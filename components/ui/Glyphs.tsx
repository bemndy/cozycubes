/**
 * Line-drawn glyph set.
 *
 * One visual language: a 16-unit box, 1.5 stroke, round caps and joins, no
 * fills. They inherit currentColor so the buttons that hold them control state
 * purely through colour and opacity, which is the rule the design direction
 * sets for every control in the app.
 */

type GlyphProps = { className?: string };

function Svg({ children, className = "" }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-[19px] shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

/** Countdown dial — inspection toggle. */
export function InspectionGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5V8l2.5 1.75" />
    </Svg>
  );
}

/**
 * Git branch — changelog.
 *
 * Two commit nodes on a trunk with a branch merging back, which is the shape
 * the releases in the dialog actually came from.
 */
export function GitGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <circle cx="4.25" cy="3.25" r="1.75" />
      <circle cx="4.25" cy="12.75" r="1.75" />
      <circle cx="11.75" cy="8" r="1.75" />
      <path d="M4.25 5v6" />
      <path d="M10 8H8.5A4.25 4.25 0 0 1 4.25 3.75" />
    </Svg>
  );
}

/** Circular arrow — reroll the scramble. */
export function RefreshGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M13.25 8a5.25 5.25 0 1 1-1.6-3.78" />
      <path d="M13.5 2.25v3.5H10" />
    </Svg>
  );
}

/** Envelope — contact. */
export function ContactGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="1.5" />
      <path d="M2.5 4.5 8 8.75l5.5-4.25" />
    </Svg>
  );
}

/** Document — terms. */
export function TermsGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M4 1.75h5l3.25 3.25v9.25H4z" />
      <path d="M9 1.75V5h3.25M6 8.5h4M6 11h4" />
    </Svg>
  );
}

/** Eye with a slash — privacy. */
export function PrivacyGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M1.75 8S4.25 3.75 8 3.75 14.25 8 14.25 8 11.75 12.25 8 12.25 1.75 8 1.75 8z" />
      <circle cx="8" cy="8" r="1.75" />
      <path d="M2.5 13.5 13.5 2.5" />
    </Svg>
  );
}

/** Shield — security. */
export function SecurityGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M8 1.75 13.25 4v4c0 3.25-2.25 5.5-5.25 6.25C5 13.5 2.75 11.25 2.75 8V4z" />
      <path d="M5.75 8 7.25 9.5l3-3" />
    </Svg>
  );
}
