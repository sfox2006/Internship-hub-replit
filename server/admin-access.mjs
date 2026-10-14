/**
 * Administrator authorization for an already verified server-side identity.
 * Identity and role claims from headers, request bodies and browser storage are
 * deliberately not interpreted here.
 */
export function configuredAdminIds(value) {
  if (Array.isArray(value)) {
    return new Set(
      value.filter(
        (id) => typeof id === "string" && id && id.trim() === id,
      ),
    );
  }
  if (typeof value !== "string") return new Set();
  return new Set(
    value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}
export function adminDecision(verifiedUser, configuredIds) {
  const subject = verifiedUser?.subject;
  if (typeof subject !== "string" || !subject || subject.trim() !== subject) {
    return { allowed: false, status: 401, error: "Sign-in required" };
  }
  const admins = configuredAdminIds(configuredIds);
  if (!admins.size && configuredIds === undefined) {
    return {
      allowed: false,
      status: 503,
      error: "Administrator access is not configured",
    };
  }
  if (!admins.has(subject)) {
    return {
      allowed: false,
      status: 403,
      error: "Administrator access required",
    };
  }
  return { allowed: true, status: 200 };
}
export function requireAdministrator(
  getVerifiedUser,
  getAdminIds = () => [],
) {
  if (typeof getVerifiedUser !== "function")
    throw new TypeError("A verified server identity adapter is required");
  return async (req, res, next) => {
    try {
      const user = await getVerifiedUser(req);
      const decision = adminDecision(user, await getAdminIds());
      if (!decision.allowed)
        return res.status(decision.status).json({ error: decision.error });
      res.locals.administratorSubject = user.subject;
      return next();
    } catch {
      // Authentication/session errors must never grant access or expose credentials.
      return res.status(401).json({ error: "Unable to verify sign-in" });
    }
  };
}
