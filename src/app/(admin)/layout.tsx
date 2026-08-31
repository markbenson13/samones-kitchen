import { auth } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { Sidebar } from "./sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <Sidebar
        userName={session?.user?.name ?? "Admin"}
        userEmail={session?.user?.email}
        signOutAction={signOutAction}
      />

      <div className="flex flex-1 flex-col overflow-y-auto bg-neutral-50">
        <main className="w-full flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
