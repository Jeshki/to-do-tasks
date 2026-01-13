// src/app/actions.ts
"use server";

import { signOut } from "~/server/auth";

// Server Action, skirtas priverstiniam atsijungimui (naudojamas form action).
export async function signoutAction(_formData: FormData) { 
  // ...
  await signOut({ redirectTo: "/signin" }); 
}

// ...
