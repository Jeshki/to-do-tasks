// src/app/_components/HomeClientContent.tsx
"use client";

import { useEffect } from "react";
// PA┼ĀALINTA PROBLEMINE EILUT─¢: import { type FormAction } from "next/dist/server/app-render/entry-point";
import { signOut } from "next-auth/react";
import { TaskBoard } from "~/app/_components/post";

// Supaprastinta sesijos tipo definicija
type SessionUser = {
    name?: string | null;
    email?: string | null;
};
type Session = {
    user: SessionUser;
};

// PATAISYMAS: Naudojame nauj─ģ ServerAction tip─ģ
export function HomeClientContent({ session }: { session: Session }) {
    // Kodo blokas, skirtas sugadint┼│ slapuk┼│ i┼Īvalymui po AccessDenied klaidos.
    useEffect(() => {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        if (params.get("error") === "AccessDenied") {
            // Vengiame galimos kilpos: veikiame tik kart─ģ per seans─ģ.
            const alreadyHandled = sessionStorage.getItem("accessDeniedHandled");
            if (!alreadyHandled) {
                sessionStorage.setItem("accessDeniedHandled", "true");
                window.location.href = "/api/auth/signout";
            }
        }
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b">
                <div className="container mx-auto px-4 py-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Mano užduotys</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                            Sveikas, {session.user.name ?? session.user.email}!
                        </span>
                        <button className="text-sm underline" onClick={() => signOut()}>
                            Atsijungti
                        </button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-8">
                <TaskBoard />
            </main>
        </div>
    );
}
