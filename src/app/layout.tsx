import "./globals.css";

import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

import { TRPCReactProvider } from "~/uploadthing/react";

export const metadata: Metadata = {
	title: "Užduočių lenta",
	description: "Valdykite užduotis, kategorijas ir nuotraukas vienoje lentoje",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Montserrat({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${geist.variable}`} lang="lt">
			<body className="font-sans">
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
