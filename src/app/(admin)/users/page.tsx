import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { approveUser, removeUser, resetUserPassword } from "@/app/actions/users";
import { UsersSection } from "./users-section";

export default async function UsersPage() {
  const [session, users] = await Promise.all([
    auth(),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const pending = users.filter((u) => !u.isApproved);
  const approved = users.filter((u) => u.isApproved);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">Users</h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          Anyone can attempt to sign in with Google, but a new account needs
          approval here before it can access the app.
        </p>
      </div>

      <UsersSection
        pending={pending.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.createdAt.toISOString(),
        }))}
        approved={approved.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentUserEmail={session?.user?.email ?? null}
        approveAction={approveUser}
        removeAction={removeUser}
        resetPasswordAction={resetUserPassword}
      />
    </div>
  );
}
