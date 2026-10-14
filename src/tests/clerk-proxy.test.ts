import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
// @ts-expect-error Express runtime is used here without installing Express types.
import express from "express";
// @ts-expect-error Server JavaScript proxy middleware tested directly.
import { clerkProxyMiddleware } from "../../server/middlewares/clerkProxyMiddleware.mjs";

const servers: Server[] = [];

async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Expected a TCP server address");
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
});

describe("published Clerk frontend proxy", () => {
  it("serves Clerk's browser script on the published host without an auth session", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CLERK_SECRET_KEY", "test-proxy-secret");
    const script = "window.__clerkProxyRegression = true;";
    let upstreamRequest: {
      path: string | undefined;
      proxyUrl: string | string[] | undefined;
      forwardedFor: string | string[] | undefined;
      hasSecret: boolean;
    } | null = null;
    const upstream = createServer((req, res) => {
      upstreamRequest = {
        path: req.url,
        proxyUrl: req.headers["clerk-proxy-url"],
        forwardedFor: req.headers["x-forwarded-for"],
        hasSecret: Boolean(req.headers["clerk-secret-key"]),
      };
      res.writeHead(200, {
        "content-type": "application/javascript; charset=utf-8",
        "content-length": String(Buffer.byteLength(script)),
      });
      res.end(script);
    });
    const upstreamUrl = await listen(upstream);

    const app = express();
    app.use(
      "/api/__clerk",
      clerkProxyMiddleware({ target: upstreamUrl }),
    );
    app.use("/api", (_req: any, res: any) =>
      res.status(401).json({ error: "Sign-in required" }),
    );
    const appUrl = await listen(createServer(app));
    const response = await fetch(
      `${appUrl}/api/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
      {
        headers: {
          "x-forwarded-host": "internship-hub.replit.app, internal",
          "x-forwarded-proto": "https",
          "x-forwarded-for": "203.0.113.9, 10.0.0.1",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("javascript");
    expect(await response.text()).toBe(script);
    expect(upstreamRequest).toEqual({
      path: "/npm/@clerk/clerk-js@6/dist/clerk.browser.js",
      proxyUrl: "https://internship-hub.replit.app/api/__clerk",
      forwardedFor: "203.0.113.9",
      hasSecret: true,
    });
  });

  it("fails explicitly when a published request has no proxy secret", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    const app = express();
    app.use("/api/__clerk", clerkProxyMiddleware());
    app.use("/api", (_req: any, res: any) =>
      res.status(401).json({ error: "Sign-in required" }),
    );
    const appUrl = await listen(createServer(app));
    const response = await fetch(`${appUrl}/api/__clerk/npm/clerk.browser.js`, {
      headers: { "x-forwarded-host": "internship-hub.replit.app" },
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Clerk proxy unavailable" });
  });
});
