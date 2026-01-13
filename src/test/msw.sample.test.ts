import { expect, it } from "vitest";

it("msw serves mocked data", async () => {
  const response = await fetch("https://example.test/hello");
  const data = await response.json();
  expect(data).toEqual({ message: "ok" });
});
