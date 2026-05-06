import { STATUS_ACTIVITY } from "@/components/lib/categoryColors";

/**
 * Badge de statut unifié pour annonces et activités.
 * Usage : <StatusActivityBadge status="open" />
 */
export default function StatusActivityBadge({ status, className = "" }) {
  const cfg = STATUS_ACTIVITY[status];
  if (!cfg) return null;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge} ${className}`}>
      {cfg.label}
    </span>
  );
}