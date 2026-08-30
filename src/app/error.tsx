"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-brand-tan bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-red-600">
          {error.message || "Something went wrong."}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-brand-red px-3 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
