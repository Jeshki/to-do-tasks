import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const signInMock = vi.fn();
const useSearchParamsMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

import SignInPage from "../page";

describe("SignInPage", () => {
  beforeEach(() => {
    signInMock.mockReset();
    useSearchParamsMock.mockReturnValue({
      get: () => null,
    });
  });

  it("shows error message from query string", () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "error" ? "CredentialsSignin" : null),
    });

    render(<SignInPage />);

    expect(screen.getByText(/Neteisingas/i)).toBeInTheDocument();
  });

  it("calls signIn with expected params", async () => {
    signInMock.mockResolvedValue({ error: "CredentialsSignin" });

    render(<SignInPage />);

    fireEvent.change(screen.getByTestId("signin-email"), {
      target: { value: "user@test.lt" },
    });
    fireEvent.change(screen.getByTestId("signin-password"), {
      target: { value: "pass12345" },
    });
    fireEvent.click(screen.getByTestId("signin-submit"));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("credentials", {
        email: "user@test.lt",
        password: "pass12345",
        redirect: false,
        callbackUrl: "/",
      });
    });
  });

  it("redirects when signIn succeeds", async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "http://localhost/signin" },
    });

    signInMock.mockResolvedValue({ url: "/dashboard" });

    render(<SignInPage />);

    fireEvent.change(screen.getByTestId("signin-email"), {
      target: { value: "user@test.lt" },
    });
    fireEvent.change(screen.getByTestId("signin-password"), {
      target: { value: "pass12345" },
    });
    fireEvent.click(screen.getByTestId("signin-submit"));

    await waitFor(() => {
      expect(window.location.href).toBe("/dashboard");
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("disables the submit button while loading", async () => {
    let resolvePromise: ((value: { error?: string } | undefined) => void) | null = null;
    const pending = new Promise<{ error?: string }>((resolve) => {
      resolvePromise = resolve;
    });

    signInMock.mockReturnValue(pending);

    render(<SignInPage />);

    fireEvent.change(screen.getByTestId("signin-email"), {
      target: { value: "user@test.lt" },
    });
    fireEvent.change(screen.getByTestId("signin-password"), {
      target: { value: "pass12345" },
    });

    const submit = screen.getByTestId("signin-submit") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(submit);
    });

    expect(submit.disabled).toBe(true);
    expect(submit).toHaveTextContent("Jungiama...");

    await act(async () => {
      resolvePromise?.({ error: "CredentialsSignin" });
      await pending;
    });
  });
});

