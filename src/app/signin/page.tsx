"use client";

import { Eye, EyeOff } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const errorMessages: Record<string, string> = {
  AccessDenied: "Prieiga atmesta. Šis el. paštas nėra leidžiamas.",
  CredentialsSignin: "Neteisingas el. paštas arba slaptažodis.",
  Configuration: "Autentikacijos konfigūracijos klaida. Susisiekite su administratoriumi.",
  Default: "Nepavyko prisijungti. Bandykite dar kartą.",
};

function SignInForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const externalError = useMemo(() => {
    const code = searchParams.get("error") ?? "Default";
    return errorMessages[code] ?? errorMessages.Default;
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    setIsLoading(false);

    if (result?.error) {
      setFormError(errorMessages[result.error] ?? errorMessages.Default);
      return;
    }

    if (result?.url) {
      window.location.href = result.url;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-green-100 bg-white/80 shadow-xl shadow-green-100/60 backdrop-blur">
        <div className="px-6 py-8 sm:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Prisijungimas</h1>
          <p className="mt-2 text-sm text-gray-600">
            Įveskite savo el. paštą ir slaptažodį.
          </p>

          {(formError || searchParams.get("error")) && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError ?? externalError}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} data-testid="signin-form">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                El. paštas
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                data-testid="signin-email"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 outline-none ring-0 transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                Slaptažodis
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  data-testid="signin-password"
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-10 text-gray-900 outline-none ring-0 transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Slėpti slaptažodį" : "Rodyti slaptažodį"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              data-testid="signin-submit"
              className="w-full rounded-lg bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
            >
              {isLoading ? "Jungiama..." : "Prisijungti"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-green-100 bg-white/80 shadow-xl shadow-green-100/60 backdrop-blur">
            <div className="px-6 py-8 sm:px-8">
              <div className="text-sm text-gray-600">Kraunama...</div>
            </div>
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}