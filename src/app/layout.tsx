// src/app/layout.tsx

import "./globals.css";
import { TRPCReactProvider } from "~/utils/api";

export const metadata = {
  title: "Statybos Todo",
  description: "Užduotys su Excel eksportu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="lt">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}