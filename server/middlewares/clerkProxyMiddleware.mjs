import { createProxyMiddleware } from "http-proxy-middleware";

const CLERK_FAPI = "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";

export function getClerkProxyHost(req) {
  const forwarded = req.headers["x-forwarded-host"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(",")[0]?.trim() || req.headers.host?.trim();
}

function isPublishedReplitHost(req) {
  const hostname = getClerkProxyHost(req)
    ?.split(",")[0]
    ?.trim()
    .split(":")[0]
    .toLowerCase();
  return Boolean(hostname?.endsWith(".replit.app"));
}

export function clerkProxyMiddleware({ target = CLERK_FAPI } = {}) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const proxy = secretKey
    ? createProxyMiddleware({
        target,
        changeOrigin: true,
        selfHandleResponse: true,
        pathRewrite: (requestPath) =>
          requestPath.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
        on: {
          proxyReq(proxyReq, req) {
            const protocol = req.headers["x-forwarded-proto"] || "https";
            const host = getClerkProxyHost(req) || "";
            proxyReq.setHeader(
              "Clerk-Proxy-Url",
              `${protocol}://${host}${CLERK_PROXY_PATH}`,
            );
            proxyReq.setHeader("Clerk-Secret-Key", secretKey);
            const forwardedFor = req.headers["x-forwarded-for"];
            const clientIp = (
              Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
            )
              ?.split(",")[0]
              ?.trim();
            if (clientIp || req.socket?.remoteAddress)
              proxyReq.setHeader(
                "X-Forwarded-For",
                clientIp || req.socket.remoteAddress,
              );
          },
          proxyRes(proxyRes, req, res) {
            const headers = { ...proxyRes.headers };
            delete headers["transfer-encoding"];
            delete headers.connection;
            delete headers["keep-alive"];
            const status = proxyRes.statusCode || 502;
            if (status < 200 || status === 204)
              delete headers["content-length"];
            const bodyless =
              req.method === "HEAD" ||
              status < 200 ||
              status === 204 ||
              status === 304;
            if (headers["content-length"] !== undefined || bodyless) {
              res.writeHead(status, headers);
              proxyRes.on("error", () => res.destroy());
              proxyRes.pipe(res);
              return;
            }
            const chunks = [];
            proxyRes.on("data", (chunk) => chunks.push(chunk));
            proxyRes.on("end", () => {
              const body = Buffer.concat(chunks);
              headers["content-length"] = String(body.length);
              res.writeHead(status, headers);
              res.end(body);
            });
            proxyRes.on("error", () => {
              if (!res.headersSent)
                res.writeHead(502, { "content-length": "0" });
              res.end();
            });
          },
        },
      })
    : null;

  return (req, res, next) => {
    // The published .replit.app host is authoritative even if NODE_ENV is unset.
    if (
      process.env.NODE_ENV !== "production" &&
      !isPublishedReplitHost(req)
    )
      return next();

    if (!proxy)
      return res.status(503).json({ error: "Clerk proxy unavailable" });

    return proxy(req, res, next);
  };
}
