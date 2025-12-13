// next.config.js

// The import "./src/env.js" line is removed as it causes a SyntaxError in CJS mode.
// The environment variables defined in src/env.js are typically loaded automatically 
// by the Next.js/T3 boilerplate when the app starts.

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

// Naudojame CommonJS sintaksę
module.exports = config;

module.exports = {
  turbopack: { root: __dirname },
  images: { remotePatterns: [{ protocol: "https", hostname: "utfs.io" }] },
};
