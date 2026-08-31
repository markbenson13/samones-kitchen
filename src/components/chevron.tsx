export function Chevron({
  open,
  className = "h-3 w-3",
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`${className} shrink-0 text-brand-brown-light transition-transform ${
        open ? "rotate-90" : ""
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 010-1.06L11.94 9 7.21 4.23a.75.75 0 111.06-1.06l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 01-1.06 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
