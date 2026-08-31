import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { changePassword } from "@/app/actions/account";
import { ChangePasswordForm } from "./change-password-form";

export default async function AccountPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">Account</h1>
        <p className="mt-1 text-sm text-brand-brown-light">{session?.user?.email}</p>
      </div>

      <section className="max-w-md rounded-xl border border-brand-tan bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-brand-brown">
          {user?.passwordHash ? "Change password" : "Set a password"}
        </h2>
        <p className="mt-1 text-xs text-brand-brown-light">
          {user?.passwordHash
            ? "Update the password used to sign in with email and password."
            : "You currently only sign in with Google. Set a password to also be able to sign in with email and password."}
        </p>
        <ChangePasswordForm
          action={changePassword}
          hasPassword={!!user?.passwordHash}
        />
      </section>
    </div>
  );
}
