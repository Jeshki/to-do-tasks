"use client";

import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "~/uploadthing/react";

type UserRole = "ADMIN" | "EMPLOYEE";

export function AdminUsers() {
  const utils = api.useUtils();
  const { data: users, isLoading, error } = api.admin.listUsers.useQuery();

  const sortUsers = (list: typeof users) => {
    if (!list) return list;
    const roleOrder: Record<UserRole, number> = { ADMIN: 0, EMPLOYEE: 1 };
    return [...list].sort((a, b) => {
      const roleDiff = (roleOrder[a.role] ?? 2) - (roleOrder[b.role] ?? 2);
      if (roleDiff !== 0) return roleDiff;
      return (a.email ?? "").localeCompare(b.email ?? "");
    });
  };

  const createUser = api.admin.createUser.useMutation({
    onMutate: async (input) => {
      await utils.admin.listUsers.cancel();
      const previous = utils.admin.listUsers.getData();
      const tempUser = {
        id: `temp-${Date.now()}`,
        email: input.email.trim().toLowerCase(),
        name: input.name ?? null,
        role: "EMPLOYEE",
      };
      utils.admin.listUsers.setData(undefined, (prev) => {
        const next = prev ? [...prev, tempUser] : [tempUser];
        return sortUsers(next as typeof users);
      });
      return { previous, tempUserId: tempUser.id };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        utils.admin.listUsers.setData(undefined, context.previous);
      }
    },
    onSuccess: async (createdUser, _input, context) => {
      if (createdUser) {
        utils.admin.listUsers.setData(undefined, (prev) => {
          if (!prev) return [createdUser];
          const replaced = prev.map((user) =>
            user.id === context?.tempUserId ? createdUser : user,
          );
          const has = replaced.some((user) => user.id === createdUser.id);
          return sortUsers(has ? replaced : [...replaced, createdUser] as typeof users);
        });
      }
      setCreateForm({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
      });
    },
    onSettled: () => utils.admin.listUsers.invalidate(),
  });
  const resetUserPassword = api.admin.resetUserPassword.useMutation();
  const deleteUser = api.admin.deleteUser.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  });

  const [createForm, setCreateForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetPasswords, setShowResetPasswords] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedUsers = useMemo(() => sortUsers(users) ?? [], [users]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    try {
      await createUser.mutateAsync({
        email: createForm.email,
        password: createForm.password,
        name: `${createForm.firstName} ${createForm.lastName}`.trim() || null,
      });
    } catch (err: any) {
      setActionError(err?.message ?? "Nepavyko sukurti vartotojo");
    }
  };

  const handlePasswordReset = async (userId: string) => {
    const nextPassword = passwordDrafts[userId];
    if (!nextPassword || nextPassword.length < 8) {
      setActionError("Slaptažodis turi būti bent 8 simbolių");
      return;
    }
    setActionError(null);
    try {
      await resetUserPassword.mutateAsync({ userId, password: nextPassword });
      setPasswordDrafts((prev) => ({ ...prev, [userId]: "" }));
    } catch (err: any) {
      setActionError(err?.message ?? "Nepavyko atnaujinti slaptažodžio");
    }
  };

  const handleDelete = async (userId: string, email: string | null) => {
    if (!window.confirm(`Ištrinti vartotoją ${email ?? userId}?`)) return;
    setActionError(null);
    try {
      await deleteUser.mutateAsync({ userId });
    } catch (err: any) {
      setActionError(err?.message ?? "Nepavyko ištrinti vartotojo");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header>
          <h1 className="text-2xl font-semibold text-slate-900">Admin: vartotojai</h1>
          <p className="text-sm text-slate-600">Kurkite darbuotojų paskyras ir tvarkykite slaptažodžius.</p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Naujas vartotojas</h2>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              El. paštas
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                type="email"
                required
                data-testid="admin-create-email"
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Vardas
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                type="text"
                data-testid="admin-create-first-name"
                value={createForm.firstName}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, firstName: event.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Pavardė
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                type="text"
                data-testid="admin-create-last-name"
                value={createForm.lastName}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, lastName: event.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Slaptažodis
              <div className="relative">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10"
                  type={showCreatePassword ? "text" : "password"}
                  minLength={8}
                  required
                  data-testid="admin-create-password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700"
                  onClick={() => setShowCreatePassword((prev) => !prev)}
                  aria-label={showCreatePassword ? "Slėpti slaptažodį" : "Rodyti slaptažodį"}
                >
                  {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                data-testid="admin-create-submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                disabled={createUser.isPending}
              >
                {createUser.isPending ? "Kuriama..." : "Sukurti vartotoją"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Esami vartotojai</h2>
            {isLoading ? <span className="text-sm text-slate-500">Kraunama...</span> : null}
          </div>

          {error ? <p className="mt-4 text-sm text-red-600">Nepavyko užkrauti vartotojų.</p> : null}
          {actionError ? <p className="mt-4 text-sm text-red-600">{actionError}</p> : null}

          <div className="mt-4 space-y-4">
            {sortedUsers.map((user) => {
              const passwordValue = passwordDrafts[user.id] ?? "";

              return (
                <div key={user.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{user.email ?? "Be el. pašto"}</div>
                      <div className="text-xs text-slate-600">
                        {user.name ? user.name.split(" ")[0] : "Be vardo"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                    <div className="relative">
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm"
                        type={showResetPasswords[user.id] ? "text" : "password"}
                        minLength={8}
                        placeholder="Naujas slaptažodis"
                        value={passwordValue}
                        onChange={(event) =>
                          setPasswordDrafts((prev) => ({ ...prev, [user.id]: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700"
                        onClick={() =>
                          setShowResetPasswords((prev) => ({
                            ...prev,
                            [user.id]: !prev[user.id],
                          }))
                        }
                        aria-label={
                          showResetPasswords[user.id]
                            ? "Slėpti slaptažodį"
                            : "Rodyti slaptažodį"
                        }
                      >
                        {showResetPasswords[user.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <button
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-white"
                      onClick={() => handlePasswordReset(user.id)}
                      disabled={resetUserPassword.isPending}
                    >
                      Atstatyti slaptažodį
                    </button>
                    <button
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(user.id, user.email)}
                      disabled={deleteUser.isPending}
                    >
                      Ištrinti
                    </button>
                  </div>
                </div>
              );
            })}

            {!isLoading && sortedUsers.length === 0 ? (
              <p className="text-sm text-slate-600">Vartotojų sąrašas tuščias.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
