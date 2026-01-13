vi.mock("../post", () => ({
  TaskBoard: () => <div data-testid="taskboard-mock" />,
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

import { render } from "@testing-library/react";
import { HomeClientContent } from "../HomeClientContent";

describe("HomeClientContent AccessDenied efektas", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        search: "?error=AccessDenied",
        href: "",
      },
    });
    sessionStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("nukreipia į /api/auth/signout tik kartą", () => {
    render(<HomeClientContent session={{ user: { name: "A", email: "a@a.lt" } }} />);
    expect(window.location.href).toBe("/api/auth/signout");
    // antras render neturi perrašyti (kad nebūtų kilpos)
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { search: "?error=AccessDenied", href: "" },
    });
    render(<HomeClientContent session={{ user: { name: "A", email: "a@a.lt" } }} />);
    expect(window.location.href).toBe(""); // neperrašyta antrą kartą
  });
});
