/** Three editorial diagrams map to free preview, saved chart, and unlocked reading. */
export function HomepageV3ValueDiagram({ step }: { step: number }) {
  if (step === 1) return (
    <svg viewBox="0 0 120 78" width="120" height="78" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="37" y="5" width="56" height="56" rx="2" />
      <path d="M51 5v56M79 5v56M65 5v14M65 47v14M37 19h56M37 47h56M37 33h14M79 33h14" />
      <circle cx="44" cy="12" r="3" fill="var(--accent-seal)" stroke="none" />
      <circle cx="86" cy="54" r="3" fill="var(--accent-seal)" stroke="none" />
      <path d="M23 70h84" strokeOpacity=".4" />
    </svg>
  );
  if (step === 2) return (
    <svg viewBox="0 0 120 78" width="120" height="78" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M23 12h49l10 10v45H23zM72 12v10h10M30 31h43M30 38h32M30 45h38" />
      <path d="M88 23h9v44H88M94 16h8v51" strokeOpacity=".55" />
      <path d="M34 55v13l6-4 6 4V55" fill="var(--accent-seal)" stroke="none" />
      <path d="M23 67h58" />
    </svg>
  );
  return (
    <svg viewBox="0 0 120 78" width="120" height="78" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M21 18h68v47H21zM27 12h68v47M33 6h68v47" strokeOpacity=".55" />
      <path d="M33 22h52M33 30h46M33 38h28M33 46h39" />
      <path d="M81 39v-7a5 5 0 0 1 9.4-2M77 40h16v16H77z" fill="var(--surface)" />
      <circle cx="85" cy="47" r="2.5" fill="var(--accent-seal)" stroke="none" />
    </svg>
  );
}
