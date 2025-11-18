// app/page.tsx
import { TaskBoard } from "./_components/post";
import { auth } from "../server/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Mano Užduotys</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Sveikas, {session.user.name ?? session.user.email}!
            </span>
            <form action="/api/auth/signout" method="post">
              <button className="text-sm underline">Atsijungti</button>
            </form>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <TaskBoard />
      </main>
    </div>
  );
}