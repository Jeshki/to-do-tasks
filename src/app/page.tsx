// app/page.tsx
"use client"; // PRIDĖTA

import { TaskBoard } from "./_components/post";
import { auth, signOut } from "../server/auth";
import { redirect } from "next/navigation";
import { useEffect } from "react"; // IMPORTUOTA

// Sukuriame Server Action apvalkalą, kad atitiktų form action signatūrą.
const signoutAction = async (_formData: FormData) => {
  "use server";
  // Priverstinai nukreipiame į signin puslapį po atsijungimo
  await signOut({ redirectTo: "/api/auth/signin" }); 
};

export default async function Home() {
  const session = await auth();

  // NAUJAS KLIENTO KOMPONENTO KODAS
  useEffect(() => {
    // Patikriname, ar puslapis yra pakraunamas po AccessDenied klaidos
    if (typeof window !== 'undefined' && window.location.search.includes('error=AccessDenied')) {
      // Šis veiksmas ištrina visus NextAuth slapukus ir grąžina vartotoją į prisijungimo puslapį.
      // Naudojame naršyklės navigaciją, kad išvalytume blogą būseną.
      window.location.href = '/api/auth/signout';
    }
  }, []);
  // PABAIGA NAUJO KODO

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