// src/app/_components/HomeClientContent.tsx
"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { TaskBoard } from "~/app/_components/post";

type SessionUser = {
    name?: string | null;
    email?: string | null;
    role?: "ADMIN" | "EMPLOYEE";
};
type Session = {
    user: SessionUser;
};

export function HomeClientContent({
    session,
    signoutAction,
}: {
    session: Session;
    signoutAction?: () => void | Promise<void>;
}) {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        if (params.get("error") === "AccessDenied") {
            const alreadyHandled = sessionStorage.getItem("accessDeniedHandled");
            if (!alreadyHandled) {
                sessionStorage.setItem("accessDeniedHandled", "true");
                window.location.href = "/api/auth/signout";
            }
        }
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b" data-testid="home-title">
                <div className="container mx-auto px-4 py-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">
                        Mano užduotys
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                            Sveikas, {session.user.name ?? session.user.email}!
                        </span>
                        {session.user.role === "ADMIN" ? (
                            <a
                                href="/admin"
                                data-testid="admin-link"
                                className="rounded-md bg-orange-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-orange-600"
                            >
                                Administravimas
                            </a>
                        ) : null}
                        <button
                            className="text-sm underline"
                            onClick={() => (signoutAction ?? signOut)()}
                            data-testid="signout-button"
                        >
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