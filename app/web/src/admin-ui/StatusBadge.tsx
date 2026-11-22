/** A lead status as a pill: colour plus the word (never colour alone, M2). */
export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`otn-badge otn-badge--${/^[A-Z_]+$/.test(status) ? status : 'OTHER'}`} data-status={status}>
      {label}
    </span>
  );
}
