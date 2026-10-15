import { auth } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { AutoRefresh } from "@/components/auto-refresh";
import { Sidebar } from "./sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex h-full flex-1 overflow-hidden print:h-auto print:overflow-visible">
      <AutoRefresh />
      <Sidebar
        userName={session?.user?.name ?? "Admin"}
        userEmail={session?.user?.email}
        signOutAction={signOutAction}
      />

      {/* print:overflow-visible/h-auto — otherwise this scroll container
          clips printed output to whatever fit on screen, cutting off
          anything below the fold (e.g. the kitchen prep list). */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-neutral-50 print:h-auto print:overflow-visible">
        {/* Extra top padding on mobile only — clears the floating menu
            button, which is fixed-position and would otherwise overlap the
            first line of page content (e.g. an h1) at that width. */}
        <main className="w-full flex-1 px-4 pt-20 pb-8 sm:px-6 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
