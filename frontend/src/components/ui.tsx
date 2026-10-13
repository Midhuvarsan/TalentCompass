import { ReactNode } from "react";
import { InboxIcon } from "./Icons";

export function initialsOf(name: string | undefined | null): string {
  return (name || "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const TILE_GRADIENTS: [string, string][] = [
  ["#6366f1", "#4338ca"],
  ["#0ea5e9", "#0369a1"],
  ["#10b981", "#047857"],
  ["#f59e0b", "#b45309"],
  ["#ec4899", "#be185d"],
  ["#8b5cf6", "#6d28d9"],
];

/** Deterministic company tile so each employer keeps a stable colour. */
export function CompanyTile({ name }: { name: string }) {
  let hash = 0;
  for (const ch of name || "?") hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = TILE_GRADIENTS[hash % TILE_GRADIENTS.length];
  return (
    <span
      className="company-tile"
      style={{ ["--tile-a" as string]: a, ["--tile-b" as string]: b }}
      aria-hidden="true"
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon || <InboxIcon />}</div>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </>
  );
}
