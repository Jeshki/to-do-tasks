import "./globals.css";

import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

import { TRPCReactProvider } from "~/uploadthing/react";

const montserrat = Montserrat({
        subsets: ["latin"],
        variable: "--font-montserrat",
});

export const metadata: Metadata = {
        title: "Užduočių lenta",
        description: "Valdykite užduotis, kategorijas ir nuotraukas vienoje lentoje",
        icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
        children,
}: Readonly<{ children: React.ReactNode }>) {
        return (
                <html lang="lt" className={montserrat.variable}>
                        <body className="font-sans">
                                <TRPCReactProvider>{children}</TRPCReactProvider>
                        </body>
                </html>
        );
}