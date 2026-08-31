"use client";

import { Fragment, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ResetPasswordRow({
  userId,
  onCancel,
  resetPasswordAction,
}: {
  userId: string;
  onCancel: () => void;
  resetPasswordAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <tr className="border-t border-brand-tan bg-brand-cream/40">
      <td colSpan={2} className="px-4 py-3">
        <form suppressHydrationWarning
          action={async (formData) => {
            await resetPasswordAction(formData);
            onCancel();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="id" value={userId} />
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              New password
            </label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-48 rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-brown-light">
              Confirm
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-48 rounded-md border border-brand-tan px-3 py-2 text-sm"
            />
          </div>
          <SubmitButton
            spinnerClassName="h-3 w-3"
            className="rounded-md bg-brand-red px-3 py-2 text-xs font-medium text-white hover:bg-brand-red-dark"
          >
            Save
          </SubmitButton>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-brand-tan px-3 py-2 text-xs font-medium text-brand-brown hover:bg-brand-cream"
          >
            Cancel
          </button>
        </form>
      </td>
    </tr>
  );
}

export function UsersSection({
  pending,
  approved,
  currentUserEmail,
  approveAction,
  removeAction,
  resetPasswordAction,
}: {
  pending: UserRow[];
  approved: UserRow[];
  currentUserEmail: string | null;
  approveAction: (id: string) => void | Promise<void>;
  removeAction: (id: string) => void | Promise<void>;
  resetPasswordAction: (formData: FormData) => void | Promise<void>;
}) {
  const [resetOpenId, setResetOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
          <div className="border-b border-brand-tan bg-brand-cream px-4 py-3">
            <h2 className="text-sm font-medium text-brand-brown">
              Pending approval
            </h2>
          </div>
          <table className="w-full text-left text-sm">
            <tbody>
              {pending.map((user) => (
                <tr key={user.id} className="border-t border-brand-tan first:border-t-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-brown">{user.email}</p>
                    <p className="text-xs text-brand-brown-light">
                      {user.name ? `${user.name} · ` : ""}
                      Signed in {formatDate(user.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <form suppressHydrationWarning action={approveAction.bind(null, user.id)}>
                        <SubmitButton
                          spinnerClassName="h-3 w-3"
                          className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-red-dark"
                        >
                          Approve
                        </SubmitButton>
                      </form>
                      <form suppressHydrationWarning action={removeAction.bind(null, user.id)}>
                        <ConfirmSubmitButton
                          spinnerClassName="h-3 w-3"
                          confirmTitle="Reject this sign-up?"
                          confirmMessage={`This removes the pending account for "${user.email}". They'd need to sign in with Google again to re-request access.`}
                          confirmLabel="Reject"
                          danger
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Reject
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-brand-tan bg-white shadow-sm">
        <div className="border-b border-brand-tan bg-brand-cream px-4 py-3">
          <h2 className="text-sm font-medium text-brand-brown">Approved</h2>
        </div>
        {approved.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-brown-light">
            No approved users yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <tbody>
              {approved.map((user) => {
                const isSelf =
                  currentUserEmail?.toLowerCase() === user.email.toLowerCase();
                return (
                  <Fragment key={user.id}>
                    <tr className="border-t border-brand-tan first:border-t-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-brown">
                          {user.email}
                          {isSelf && (
                            <span className="ml-2 rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs font-medium text-brand-red">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-brand-brown-light">
                          {user.name ? `${user.name} · ` : ""}
                          Joined {formatDate(user.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isSelf && (
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setResetOpenId((cur) =>
                                  cur === user.id ? null : user.id
                                )
                              }
                              className="text-xs font-medium text-brand-brown hover:underline"
                            >
                              Reset password
                            </button>
                            <form suppressHydrationWarning action={removeAction.bind(null, user.id)}>
                              <ConfirmSubmitButton
                                spinnerClassName="h-3 w-3"
                                confirmTitle="Revoke access?"
                                confirmMessage={`This removes "${user.email}"'s account. They'd need to sign in with Google again and be re-approved to get back in.`}
                                confirmLabel="Revoke"
                                danger
                                className="text-xs font-medium text-red-600 hover:underline"
                              >
                                Revoke
                              </ConfirmSubmitButton>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                    {resetOpenId === user.id && (
                      <ResetPasswordRow
                        userId={user.id}
                        onCancel={() => setResetOpenId(null)}
                        resetPasswordAction={resetPasswordAction}
                      />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
