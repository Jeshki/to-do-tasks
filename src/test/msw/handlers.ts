import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://example.test/hello", () =>
    HttpResponse.json({ message: "ok" }),
  ),
];
