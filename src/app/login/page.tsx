import Image from "next/image";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-brand-tan bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="Samone's Kitchen"
            width={80}
            height={80}
            className="h-20 w-20 object-contain"
            priority
          />
          <h1 className="mt-2 text-xl font-semibold text-brand-brown">
            Samone&apos;s Kitchen
          </h1>
          <p className="mt-1 text-sm text-brand-brown-light">Admin sign in</p>
        </div>

        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-brand-brown"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-brand-brown"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              Invalid email or password. Please try again.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-brand-red px-3 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
