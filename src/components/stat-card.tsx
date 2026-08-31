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
    <div className="rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase text-brand-brown-light">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-brand-brown-light">{subtitle}</p>
      )}
    </div>
  );
}
