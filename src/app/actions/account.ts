"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8)
    throw new Error("New password must be at least 8 characters");
  if (newPassword !== confirmPassword)
    throw new Error("New password and confirmation don't match");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
  });
  if (!user) throw new Error("Account not found");

  // A Google-only account has no password yet — setting one for the first
  // time doesn't require proving a current one.
  if (user.passwordHash) {
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error("Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  revalidatePath("/account");
}
