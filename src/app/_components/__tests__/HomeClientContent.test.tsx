vi.mock("../post", () => ({
  TaskBoard: () => <div data-testid="taskboard-mock" />,
}));

import { render, screen } from "@testing-library/react";
import { HomeClientContent } from "../HomeClientContent";

describe("HomeClientContent", () => {
  it("parodo vartotojo vardą ar el. paštą", () => {
    render(
      <HomeClientContent
        session={{ user: { name: "Jonas", email: "jonas@example.com" } }}
        signoutAction={vi.fn()}
      />,
    );

    expect(screen.getByText(/Jonas/)).toBeInTheDocument();
  });
});
