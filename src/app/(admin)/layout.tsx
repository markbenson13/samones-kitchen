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
        <main className="w-full flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
