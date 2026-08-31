"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function approveUser(id: string) {
  await requireAdmin();
  await prisma.user.update({ where: { id }, data: { isApproved: true } });
  revalidatePath("/users");
}

// Used both to reject a pending sign-up and to revoke an approved user's
// access — either way the row is gone, so they'd need to sign in with
// Google again to re-request access.
export async function removeUser(id: string) {
  const session = await requireAdmin();
  const target = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  });
  if (target?.email.toLowerCase() === session.user?.email?.toLowerCase()) {
    throw new Error("You can't remove your own account");
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/users");
}

// Lets any approved user set a new password for someone else's account
// (their own or another's) without needing the old one — useful since
// there's no self-service "forgot password" flow.
export async function resetUserPassword(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!id) throw new Error("Missing user");
  if (newPassword.length < 8)
    throw new Error("New password must be at least 8 characters");
  if (newPassword !== confirmPassword)
    throw new Error("New password and confirmation don't match");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  revalidatePath("/users");
}
