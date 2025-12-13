import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    
    // PATAISYMAS: Prid─Śtas leid┼Šiam┼│ el. pa┼Īto adres┼│ s─ģra┼Īas
    ALLOWED_EMAILS: z.string().optional(),

    // GRA┼ĮINAME UPLOADTHING KINTAMUOSIUS:
    UPLOADTHING_SECRET: z.string().min(1),
    UPLOADTHING_APP_ID: z.string().min(1),
    IMAGE_PROXY_ALLOWED_HOSTS: z.string().optional(),
  },

  client: {
    // Kliento kintamieji
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    
    // PATAISYMAS: Prid─Śtas ALLOWED_EMAILS
    ALLOWED_EMAILS: process.env.ALLOWED_EMAILS,

    // GRA┼ĮINAME:
    UPLOADTHING_SECRET: process.env.UPLOADTHING_SECRET,
    UPLOADTHING_APP_ID: process.env.UPLOADTHING_APP_ID,
    IMAGE_PROXY_ALLOWED_HOSTS: process.env.IMAGE_PROXY_ALLOWED_HOSTS,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
