// src/app/page.tsx
// NĖRA "use client" - TAI YRA SERVER COMPONENT

import { auth } from "../server/auth";
import { redirect } from "next/navigation";
import { HomeClientContent } from "./_components/HomeClientContent"; // Kliento komponentas

export default async function Home() {
    // Serverio logika
    const session = await auth();

    if (!session?.user) {
        redirect("/signin");
    }

    // Perduodame sesijos duomenis IR Serverio veiksmą kaip prop'ą
    return <HomeClientContent session={session} />;
}