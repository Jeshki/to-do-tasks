import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminUsers } from "../AdminUsers";

const createUserMock = vi.fn(async () => undefined);
const resetUserPasswordMock = vi.fn(async () => undefined);
const deleteUserMock = vi.fn(async () => undefined);
const listUsersInvalidateMock = vi.fn();
const listUsersCancelMock = vi.fn();
const listUsersSetDataMock = vi.fn();
const listUsersGetDataMock = vi.fn();
let usersData: Array<{ id: string; email: string; name: string; role: "ADMIN" | "EMPLOYEE" }> = [];

vi.mock("~/uploadthing/react", () => ({
  api: {
    useUtils: () => ({
      admin: {
        listUsers: {
          invalidate: listUsersInvalidateMock,
          cancel: listUsersCancelMock,
          setData: listUsersSetDataMock,
          getData: listUsersGetDataMock,
        },
      },
    }),
    admin: {
      listUsers: {
        useQuery: () => ({ data: usersData, isLoading: false, error: null }),
      },
      createUser: {
        useMutation: (options: any) => ({
          mutateAsync: async (input: any) => {
            const context = options?.onMutate ? await options.onMutate(input) : undefined;
            try {
              const result = await createUserMock(input);
              if (options?.onSuccess) {
                await options.onSuccess(result, input, context);
              }
              if (options?.onSettled) {
                await options.onSettled(result, null, input, context);
              }
              return result;
            } catch (error) {
              if (options?.onError) {
                await options.onError(error, input, context);
              }
              if (options?.onSettled) {
                await options.onSettled(undefined, error, input, context);
              }
              throw error;
            }
          },
          isPending: false,
        }),
      },
      resetUserPassword: {
        useMutation: () => ({ mutateAsync: resetUserPasswordMock, isPending: false }),
      },
      deleteUser: {
        useMutation: () => ({ mutateAsync: deleteUserMock, isPending: false }),
      },
    },
  },
}));

describe("AdminUsers", () => {
  beforeEach(() => {
    createUserMock.mockClear();
    resetUserPasswordMock.mockClear();
    deleteUserMock.mockClear();
    listUsersInvalidateMock.mockClear();
    listUsersCancelMock.mockClear();
    listUsersSetDataMock.mockClear();
    listUsersGetDataMock.mockClear();
    usersData = [
      { id: "u1", email: "jonas@test.lt", name: "Jonas Jonaitis", role: "EMPLOYEE" },
    ];
    listUsersGetDataMock.mockImplementation(() => usersData);
    listUsersSetDataMock.mockImplementation((_key: unknown, updater: any) => {
      usersData = typeof updater === "function" ? updater(usersData) : updater;
    });
  });

  it("sukuria vartotoja is vardo ir pavardes", async () => {
    render(<AdminUsers />);

    const emailInput = screen.getByTestId("admin-create-email");
    const firstNameInput = screen.getByTestId("admin-create-first-name");
    const lastNameInput = screen.getByTestId("admin-create-last-name");
    const passwordInput = screen.getByTestId("admin-create-password");

    fireEvent.change(emailInput, { target: { value: "new@test.lt" } });
    fireEvent.change(firstNameInput, { target: { value: "Jonas" } });
    fireEvent.change(lastNameInput, { target: { value: "Jonaitis" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    const form = screen.getByTestId("admin-create-submit").closest("form");
    if (!form) {
      throw new Error("Form not found");
    }

    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(createUserMock).toHaveBeenCalledWith({
        email: "new@test.lt",
        password: "password123",
        name: "Jonas Jonaitis",
      });
    });
  });

  it("isvalo forma po sekmingo sukurimo", async () => {
    createUserMock.mockResolvedValueOnce({
      id: "u2",
      email: "new@test.lt",
      name: "Jonas Jonaitis",
      role: "EMPLOYEE",
    });

    render(<AdminUsers />);

    fireEvent.change(screen.getByTestId("admin-create-email"), {
      target: { value: "new@test.lt" },
    });
    fireEvent.change(screen.getByTestId("admin-create-first-name"), {
      target: { value: "Jonas" },
    });
    fireEvent.change(screen.getByTestId("admin-create-last-name"), {
      target: { value: "Jonaitis" },
    });
    fireEvent.change(screen.getByTestId("admin-create-password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByTestId("admin-create-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-create-email")).toHaveValue("");
      expect(screen.getByTestId("admin-create-first-name")).toHaveValue("");
      expect(screen.getByTestId("admin-create-last-name")).toHaveValue("");
      expect(screen.getByTestId("admin-create-password")).toHaveValue("");
    });
  });

  it("rodo klaida jei nepavyksta sukurti vartotojo", async () => {
    createUserMock.mockRejectedValueOnce(new Error("boom"));

    render(<AdminUsers />);

    fireEvent.change(screen.getByTestId("admin-create-email"), {
      target: { value: "new@test.lt" },
    });
    fireEvent.change(screen.getByTestId("admin-create-password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByTestId("admin-create-submit"));

    await waitFor(() => {
      expect(screen.getByText(/boom/i)).toBeInTheDocument();
    });
  });

  it("sarase rodo tik varda", () => {
    render(<AdminUsers />);
    expect(screen.getByText("Jonas")).toBeInTheDocument();
  });

  it("neleidzia atnaujinti per trumpo slaptazodzio", async () => {
    render(<AdminUsers />);
    fireEvent.change(screen.getByPlaceholderText(/Naujas/i), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Atstatyti/i }));

    expect(resetUserPasswordMock).not.toHaveBeenCalled();
    expect(screen.getByText(/bent 8/i)).toBeInTheDocument();
  });

  it("isvalo slaptazodzio drafta po sekmingo atstatymo", async () => {
    resetUserPasswordMock.mockResolvedValueOnce({ success: true });

    render(<AdminUsers />);

    const passwordInput = screen.getByPlaceholderText(/Naujas/i);
    fireEvent.change(passwordInput, { target: { value: "newpassword" } });
    fireEvent.click(screen.getByRole("button", { name: /Atstatyti/i }));

    await waitFor(() => {
      expect(passwordInput).toHaveValue("");
    });
  });

  it("rodo klaida jei nepavyksta atnaujinti slaptazodzio", async () => {
    resetUserPasswordMock.mockRejectedValueOnce(new Error("nope"));

    render(<AdminUsers />);

    const passwordInput = screen.getByPlaceholderText(/Naujas/i);
    fireEvent.change(passwordInput, { target: { value: "newpassword" } });
    fireEvent.click(screen.getByRole("button", { name: /Atstatyti/i }));

    await waitFor(() => {
      expect(screen.getByText(/nope/i)).toBeInTheDocument();
    });
  });

  it("rodo tuscio saraso pranesima", () => {
    usersData = [];
    render(<AdminUsers />);
    expect(screen.getByText((text) => text.startsWith("Vartotoj"))).toBeInTheDocument();
  });

  it("trina vartotoja patvirtinus", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminUsers />);

    fireEvent.click(screen.getByRole("button", { name: /trinti/i }));

    expect(deleteUserMock).toHaveBeenCalledWith({ userId: "u1" });
    (window.confirm as any).mockRestore?.();
  });
});

