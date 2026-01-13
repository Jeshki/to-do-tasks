import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    
    // PATAISYMAS: Pridėtas leidžiamų el. pašto adresų sąrašas
    ALLOWED_EMAILS: z.string().optional(),
    ADMIN_EMAILS: z.string().optional(),

    // GRĄŽINAME UPLOADTHING KINTAMUOSIUS:
    UPLOADTHING_SECRET: z.string().min(1),
    UPLOADTHING_APP_ID: z.string().min(1),
    IMAGE_PROXY_ALLOWED_HOSTS: z.string().optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
  },

  client: {
    // Kliento kintamieji
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    
    // PATAISYMAS: Pridėtas ALLOWED_EMAILS
    ALLOWED_EMAILS: process.env.ALLOWED_EMAILS,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,

    // GRĄŽINAME:
    UPLOADTHING_SECRET: process.env.UPLOADTHING_SECRET,
    UPLOADTHING_APP_ID: process.env.UPLOADTHING_APP_ID,
    IMAGE_PROXY_ALLOWED_HOSTS: process.env.IMAGE_PROXY_ALLOWED_HOSTS,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
