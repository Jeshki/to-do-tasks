// src/app/layout.tsx

import "./globals.css";
import { api } from "~/utils/api";

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
        <api.Provider>{children}</api.Provider>
      </body>
    </html>
  );
}