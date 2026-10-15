import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  subtitle,
  tone = "neutral",
}: {
  label: string;
  value: string;
  subtitle?: ReactNode;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-red-600"
        : "text-brand-brown";

  return (
    <div className="min-w-0 rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
      <p className="truncate text-xs font-medium uppercase text-brand-brown-light">
        {label}
      </p>
      {/* truncate (not wrap) — a peso amount has no spaces to break on, so a
          card too narrow for its value would otherwise overflow the card and
          get visually painted over by the next grid cell instead of showing
          anything wrong. An ellipsis is a visible, truthful degradation. */}
      <p
        className={`mt-2 truncate text-2xl font-semibold ${toneClass}`}
        title={value}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-brand-brown-light">{subtitle}</p>
      )}
    </div>
  );
}
