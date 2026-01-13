vi.mock("../post", () => ({
  TaskBoard: () => <div data-testid="taskboard-mock" />,
}));

import { render, screen } from "@testing-library/react";
import { HomeClientContent } from "../HomeClientContent";

describe("HomeClientContent", () => {
  it("rodo vartotojo vardą", () => {
    render(
      <HomeClientContent
        session={{ user: { name: "Jonas", email: "jonas@example.com" } }}
        signoutAction={vi.fn()}
      />,
    );

    expect(screen.getByText(/Jonas/)).toBeInTheDocument();
  });

  it("rodo administravimo mygtuką tik adminui", () => {
    const { rerender } = render(
      <HomeClientContent
        session={{ user: { name: "Admin", email: "admin@example.com", role: "ADMIN" } }}
        signoutAction={vi.fn()}
      />,
    );

    expect(screen.getByTestId("admin-link")).toBeInTheDocument();

    rerender(
      <HomeClientContent
        session={{ user: { name: "User", email: "user@example.com", role: "EMPLOYEE" } }}
        signoutAction={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("admin-link")).toBeNull();
  });
});
