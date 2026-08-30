import Image from "next/image";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { NavLinks } from "./nav-links";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      <header className="border-b border-brand-tan bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Samone's Kitchen"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-lg font-semibold text-brand-brown">
                Samone&apos;s Kitchen
              </p>
              <p className="text-xs text-brand-brown-light">Admin</p>
            </div>
          </div>

          <NavLinks />

          <div className="flex items-center gap-3">
            <span className="text-sm text-brand-brown-light">
              {session?.user?.email}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-brand-tan px-3 py-1.5 text-sm font-medium text-brand-brown hover:bg-brand-cream"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
