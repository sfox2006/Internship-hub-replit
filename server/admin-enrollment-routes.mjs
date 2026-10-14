import { Router } from "express";

function validInput(body) {
  return (
    body &&
    typeof body.input === "string" &&
    (body.format === "emails" || body.format === "csv")
  );
}

export function createAdminEnrollmentRouter({
  enrollmentService,
  requireSameOrigin,
  appUrl,
}) {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const entries = await enrollmentService.list(req.query.q ?? "");
      res.json({ entries });
    } catch {
      res.status(503).json({ error: "Enrollment roster is unavailable." });
    }
  });

  router.get("/join-info", (_req, res) => {
    res.json({
      url: new URL("/sign-up", appUrl).toString(),
      instructions:
        "Create an account using an approved email address, then complete the provider's email verification. The sign-up link does not send email or create an account.",
    });
  });

  router.post("/preview", requireSameOrigin, async (req, res) => {
    if (!validInput(req.body))
      return res.status(400).json({ error: "Provide import text and a format." });
    try {
      res.json(await enrollmentService.preview(req.body.input, req.body.format));
    } catch {
      res.status(503).json({ error: "Enrollment preview is unavailable." });
    }
  });

  router.post("/approve", requireSameOrigin, async (req, res) => {
    if (!validInput(req.body))
      return res.status(400).json({ error: "Provide import text and a format." });
    try {
      const result = await enrollmentService.approve(
        req.body.input,
        req.body.format,
        req.authenticatedUserId,
      );
      res.json(result);
    } catch {
      res.status(503).json({ error: "Enrollment approval could not be saved." });
    }
  });

  router.patch("/:id/status", requireSameOrigin, async (req, res) => {
    const { status } = req.body ?? {};
    if (status !== "approved" && status !== "suspended")
      return res.status(400).json({ error: "Choose approved or suspended." });
    try {
      const result = await enrollmentService.setStatus(
        req.params.id,
        status,
        req.authenticatedUserId,
      );
      if (!result.found)
        return res.status(404).json({ error: "Roster entry not found." });
      res.json(result);
    } catch {
      res.status(503).json({ error: "Enrollment status could not be saved." });
    }
  });

  return router;
}
