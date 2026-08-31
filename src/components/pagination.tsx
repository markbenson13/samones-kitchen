import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between border-t border-brand-tan bg-brand-cream px-4 py-3 text-sm">
      <span className="text-brand-brown-light">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Link
          href={buildHref(page - 1)}
          aria-disabled={prevDisabled}
          tabIndex={prevDisabled ? -1 : undefined}
          className={`rounded-md border border-brand-tan px-3 py-1.5 text-xs font-medium text-brand-brown ${
            prevDisabled
              ? "pointer-events-none opacity-50"
              : "hover:bg-brand-cream-dark"
          }`}
        >
          Previous
        </Link>
        <Link
          href={buildHref(page + 1)}
          aria-disabled={nextDisabled}
          tabIndex={nextDisabled ? -1 : undefined}
          className={`rounded-md border border-brand-tan px-3 py-1.5 text-xs font-medium text-brand-brown ${
            nextDisabled
              ? "pointer-events-none opacity-50"
              : "hover:bg-brand-cream-dark"
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
