"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { useToast, withToast } from "@/components/toast";

export function ChangePasswordForm({
  action,
  hasPassword,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hasPassword: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const toast = useToast();

  return (
    <form suppressHydrationWarning
      action={async (formData) => {
        const ok = await withToast(toast, () => action(formData), "Password updated.");
        if (ok) {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      }}
      className="mt-4 space-y-4"
    >
      {hasPassword && (
        <div>
          <label className="block text-xs font-medium text-brand-brown-light">
            Current password
          </label>
          <input suppressHydrationWarning
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          New password
        </label>
        <input suppressHydrationWarning
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-brand-brown-light">At least 8 characters.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-brown-light">
          Confirm new password
        </label>
        <input suppressHydrationWarning
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-tan px-3 py-2 text-sm"
        />
      </div>

      <SubmitButton
        pendingText="Saving…"
        className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red-dark"
      >
        {hasPassword ? "Update password" : "Set password"}
      </SubmitButton>
    </form>
  );
}
