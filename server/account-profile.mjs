const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;

function normalizeName(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  const length = [...normalized].length;
  if (
    length < 1 ||
    length > 100 ||
    CONTROL_CHARACTERS.test(normalized)
  )
    return null;
  return normalized;
}

export function validateAccountProfile(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { ok: false, error: "Enter your first and last name." };
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  if (!firstName || !lastName)
    return {
      ok: false,
      error:
        "First and last name must each contain 1–100 characters without control characters.",
    };
  return { ok: true, firstName, lastName };
}

export function hasCompleteAccountProfile(profile) {
  return validateAccountProfile(profile).ok;
}
