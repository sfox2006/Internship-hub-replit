import "dotenv/config";
import express from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { calendar, readingEvent } from "./calendar.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const fixtures = JSON.parse(
  readFileSync(path.join(root, "shared/fixtures.json"), "utf8"),
);
const app = express();
app.disable("x-powered-by");
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/config", (_req, res) => {
  let origin = null;
  try {
    const u = new URL(process.env.APP_URL);
    if (["http:", "https:"].includes(u.protocol)) origin = u.origin;
  } catch {}
  res.json({ appUrl: origin });
});
function sendCalendar(res, events, filename) {
  res.type("text/calendar; charset=utf-8");
  if (filename) res.attachment(filename);
  res.send(calendar(events));
}
app.get("/api/calendar/demo/feed.ics", (_req, res) =>
  sendCalendar(res, fixtures.sessions),
);
app.get("/api/sessions/:id/calendar.ics", (req, res) => {
  const session = fixtures.sessions.find((s) => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  sendCalendar(res, [session], `session-${session.id}.ics`);
});
app.get("/api/resources/:id/reading-time.ics", (req, res) => {
  const resource = fixtures.resources.find((r) => r.id === req.params.id);
  if (!resource) return res.status(404).json({ error: "Resource not found" });
  const event = readingEvent(resource, req.query.start);
  if (!event)
    return res
      .status(400)
      .json({
        error:
          "A valid UTC timestamp and positive reading duration are required",
      });
  sendCalendar(res, [event], `reading-${resource.id}.ics`);
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API route not found" }),
);
if (process.argv.includes("--dev")) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(root, "dist/client"), { index: false }));
  app.use((req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method)) return next();
    // Only known page routes get the SPA; asset requests and unknown URLs stay 404.
    const page =
      /^\/(?:schedule|requirements|readings|handbook|capstone-guide|dc-culture-guide|faq|emergency|teams|people|announcements|discussions|photos|saved|profile|search|how-things-work|session\/[^/.]+|resource\/[^/.]+|team\/[^/.]+|person\/[^/.]+|article\/[^/.]+)?\/?$/;
    if (page.test(req.path))
      return res.sendFile(path.join(root, "dist/client/index.html"));
    next();
  });
}
app.use((_req, res) => res.status(404).type("text/plain").send("Not found"));
app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(500).json({ error: "Server error" });
});
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () =>
  console.log(`Intern Hub listening on port ${port}`),
);
