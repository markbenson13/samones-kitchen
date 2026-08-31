"use client";

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

export function UsersSection({
  pending,
  approved,
  currentUserEmail,
  approveAction,
  removeAction,
}: {
  pending: UserRow[];
  approved: UserRow[];
  currentUserEmail: string | null;
  approveAction: (id: string) => void | Promise<void>;
  removeAction: (id: string) => void | Promise<void>;
}) {
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
                      <form action={approveAction.bind(null, user.id)}>
                        <SubmitButton
                          spinnerClassName="h-3 w-3"
                          className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-red-dark"
                        >
                          Approve
                        </SubmitButton>
                      </form>
                      <form action={removeAction.bind(null, user.id)}>
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
                  <tr key={user.id} className="border-t border-brand-tan first:border-t-0">
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
                        <form action={removeAction.bind(null, user.id)}>
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
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
