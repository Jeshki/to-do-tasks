import "./globals.css";

import type { Metadata } from "next";

import { TRPCReactProvider } from "~/uploadthing/react";

export const metadata: Metadata = {
        title: "Užduočių lenta",
        description: "Valdykite užduotis, kategorijas ir nuotraukas vienoje lentoje",
        icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
        children,
}: Readonly<{ children: React.ReactNode }>) {
        return (
                <html lang="lt">
                        <body className="font-sans">
                                <TRPCReactProvider>{children}</TRPCReactProvider>
                        </body>
                </html>
        );
}
