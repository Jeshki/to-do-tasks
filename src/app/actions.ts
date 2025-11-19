"use server";

import { signOut } from "~/server/auth";

// Server Action, skirtas priverstiniam atsijungimui (naudojamas form action).
export async function signoutAction(_formData: FormData) {
  // NEXTAUTH_URL jau nustatytas Vercel'yje, bet grąžiname į saugų signin puslapį.
  await signOut({ redirectTo: "/api/auth/signin" }); 
}

// Server Action, skirtas priverstiniam slapukų išvalymui ir nukreipimui.
export async function forceSignOut() {
    "use server";
    // Ši funkcija tiesiogiai paleidžia atsijungimo procesą
    await signOut({ redirectTo: '/api/auth/signout' });
}