import { redirect } from "next/navigation";
import { AdminUsers } from "../_components/AdminUsers";
import { auth } from "~/server/auth";
import Link from "next/link";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-orange-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-orange-600"
          >
            Atgal
          </Link>
        </div>
        <AdminUsers />
      </div>
    </div>
  );
}
