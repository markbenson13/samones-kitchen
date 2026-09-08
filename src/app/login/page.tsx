import Image from "next/image";
import { loginAction, loginWithGoogleAction } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { LoginErrorToast } from "./login-error-toast";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 px-4">
      <LoginErrorToast error={error} />
      <div className="w-full max-w-sm rounded-xl border border-brand-tan bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="SAMone's Kitchen"
            width={80}
            height={80}
            className="h-20 w-20 object-contain"
            priority
          />
          <h1 className="mt-2 text-xl font-semibold text-brand-brown">
            SAMone&apos;s Kitchen
          </h1>
          <p className="mt-1 text-sm text-brand-brown-light">Admin sign in</p>
        </div>

        <form suppressHydrationWarning action={loginAction} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-brand-brown"
            >
              Email
            </label>
            <input suppressHydrationWarning
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
            <input suppressHydrationWarning
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
            />
          </div>

          <SubmitButton
            pendingText="Signing in…"
            className="w-full rounded-md bg-brand-red px-3 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
          >
            Sign in
          </SubmitButton>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-brand-tan" />
          <span className="text-xs text-brand-brown-light">or</span>
          <div className="h-px flex-1 bg-brand-tan" />
        </div>

        <form suppressHydrationWarning action={loginWithGoogleAction} className="mt-4">
          <SubmitButton
            pendingText="Redirecting…"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-brand-tan px-3 py-2 text-sm font-medium text-brand-brown hover:bg-brand-cream"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 01-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0012 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.28A7.2 7.2 0 014.87 12c0-.79.14-1.56.4-2.28V6.61H1.27A12 12 0 000 12c0 1.94.46 3.77 1.27 5.39l4-3.11z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75z"
              />
            </svg>
            Sign in with Google
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
