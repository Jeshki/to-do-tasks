// src/app/_components/HomeClientContent.tsx
"use client";

import { useEffect } from "react";
// PAŠALINTA PROBLEMINE EILUTĖ: import { type FormAction } from "next/dist/server/app-render/entry-point"; 
import { TaskBoard } from "./post";

type ServerAction = (formData: FormData) => void | Promise<void>;

// Supaprastinta sesijos tipo definicija
type SessionUser = {
    name?: string | null;
    email?: string | null;
};
type Session = {
    user: SessionUser;
};

// PATAISYMAS: Naudojame naują ServerAction tipą
export function HomeClientContent({ session, signoutAction }: { session: Session; signoutAction: ServerAction }) {
    // Kodo blokas, skirtas sugadintų slapukų išvalymui po AccessDenied klaidos.
    useEffect(() => {
        // Patikriname, ar puslapis yra pakraunamas po AccessDenied klaidos
        if (typeof window !== 'undefined' && window.location.search.includes('error=AccessDenied')) {
            // Nukreipiame į priverstinį atsijungimo maršrutą, kad išvalytume slapukus.
            window.location.href = '/api/auth/signout';
        }
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b">
                <div className="container mx-auto px-4 py-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Mano Užduotys</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                            Sveikas, {session.user.name ?? session.user.email}!
                        </span>
                        {/* NAUDOJAME PERDUOTĄ ACTION PROP'SĄ */}
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