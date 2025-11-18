import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "utfs.io", // Leidžiame rodyti nuotraukas iš čia
            },
        ],
    },
};

export default config;