// app/page.tsx
"use client";

import { TaskBoard } from "./_components/post";
import { auth } from "../server/auth"; // signOut perkelta į actions.ts
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { signoutAction } from "./actions"; // IMPORTUOJAME ACTION IŠ KITO FAILO

export default async function Home() {
  const session = await auth();

  // Kodo blokas, skirtas sugadintų slapukų išvalymui po AccessDenied klaidos.
  useEffect(() => {
    // Patikriname, ar puslapis yra pakraunamas po AccessDenied klaidos
    // (tai rodo, kad senas slapukas atmetamas).
    if (typeof window !== 'undefined' && window.location.search.includes('error=AccessDenied')) {
      // Nukreipiame į priverstinį atsijungimo maršrutą, kad išvalytume slapukus.
      // Po to NextAuth automatiškai nukreips vartotoją atgal į prisijungimo puslapį.
      window.location.href = '/api/auth/signout';
    }
  }, []);

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
            {/* NAUDOJAME IMPORTUOTĄ SERVERIO VEIKSMĄ */}
            <form action={signoutAction}> 
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