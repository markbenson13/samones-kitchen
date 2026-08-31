import Image from "next/image";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex flex-1">
      <aside className="flex w-60 shrink-0 flex-col border-r border-brand-tan bg-white">
        <div className="flex items-center gap-3 border-b border-brand-tan px-4 py-4">
          <Image
            src="/logo.png"
            alt="SAMone's Kitchen"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <p className="text-base font-semibold text-brand-brown">
            SAMone&apos;s Kitchen
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <NavLinks />
        </div>

        <div className="border-t border-brand-tan p-2">
          <UserMenu
            name={session?.user?.name ?? "Admin"}
            email={session?.user?.email}
            signOutAction={signOutAction}
          />
        </div>
      </aside>

      <div className="flex flex-1 flex-col bg-neutral-50">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
