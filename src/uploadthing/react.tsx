"use client";

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchStreamLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import SuperJSON from "superjson";

import type { AppRouter } from "~/server/api/root";
import { createQueryClient } from "./query-client";

let clientQueryClientSingleton: QueryClient | undefined;
const getQueryClient = () => {
	if (typeof window === "undefined") {
		// Server: always make a new query client
		return createQueryClient();
	}
	// Browser: use singleton pattern to keep the same query client
	clientQueryClientSingleton ??= createQueryClient();

	return clientQueryClientSingleton;
};

export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
	const queryClient = getQueryClient();

	const [trpcClient] = useState(() =>
		api.createClient({
			links: [
				// Vengiame loggerio, kad nekeltų konsolės triukšmo dev režime
				httpBatchStreamLink({
					transformer: SuperJSON,
					url: `${getBaseUrl()}/api/trpc`,
					headers: () => {
						const headers = new Headers();
						headers.set("x-trpc-source", "nextjs-react");
						return headers;
					},
				}),
			],
		}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			<api.Provider client={trpcClient} queryClient={queryClient}>
				{props.children}
			</api.Provider>
		</QueryClientProvider>
	);
}

// PATAISYMAS: Ši funkcija buvo klaidinga. NextAuth.js jau nurodo NEXTAUTH_URL,
// o Next.js automatiškai nustato VERCEL_URL ir PORT aplinkos kintamuosius.
// Norint prieiti prie jų kliente, jie turi būti pažymėti kaip NEXT_PUBLIC_
// arba tiesiog geriau naudoti window.location.origin
function getBaseUrl() {
	if (typeof window !== "undefined") return window.location.origin;
    // Kad išvengtume kintamųjų nuotėkio į klientą, naudojame tiesioginį kintamąjį
    // (bet tik tuo atveju, jei jis tikrai egzistuoja serveryje).
    // Turbopack yra labai griežtas, todėl grąžiname tik window.location.origin kliente.
    
    // Serverio pusėje (SSR):
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
	
    // Jei Vercel aplinkos kintamieji nepasiekiami, grąžiname numatytąjį:
    return `http://localhost:${process.env.PORT ?? 3000}`;
}
