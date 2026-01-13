/**
 * @vitest-environment node
 */
import { createServer } from "node:http";
import request from "supertest";
import { expect, it } from "vitest";

it("supertest can hit a basic server", async () => {
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.statusCode = 200;
      res.end("ok");
      return;
    }
    res.statusCode = 404;
    res.end("not found");
  });

  const response = await request(server).get("/health");
  expect(response.status).toBe(200);
  expect(response.text).toBe("ok");
});
