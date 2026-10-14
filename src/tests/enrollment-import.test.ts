import { describe, expect, it } from "vitest";
import {
  normalizeEnrollmentEmail,
  parseEnrollmentInput,
} from "../../server/enrollment-import.mjs";

describe("approved-email import parsing", () => {
  it("normalizes only surrounding whitespace and case", () => {
    expect(normalizeEnrollmentEmail("  Fellow+group@Example.ORG  ")).toBe(
      "fellow+group@example.org",
    );
    expect(normalizeEnrollmentEmail("f.ellow@example.org")).not.toBe(
      normalizeEnrollmentEmail("fellow@example.org"),
    );
  });

  it("parses CSV with email and optional name columns and marks case duplicates", () => {
    const parsed = parseEnrollmentInput(
      'email,name\r\nFirst@example.org,"Jordan, Lee"\r\nfirst@EXAMPLE.org,Jordan',
      "csv",
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      email: "First@example.org",
      name: "Jordan, Lee",
      normalizedEmail: "first@example.org",
      duplicate: false,
    });
    expect(parsed.rows[1].duplicate).toBe(true);
  });

  it("requires an email column and reports malformed CSV", () => {
    expect(parseEnrollmentInput("name\nJordan", "csv").errors).toContain(
      'CSV must include an "email" column.',
    );
    expect(parseEnrollmentInput('email,name\nx@example.org,"Jordan', "csv").errors)
      .toHaveLength(1);
  });

  it("marks invalid entries and enforces batch limits", () => {
    const parsed = parseEnrollmentInput(
      "valid@example.org\nnot-an-email\nvalid@example.org",
      "emails",
    );
    expect(parsed.rows.map((row: any) => row.error)).toEqual([
      "",
      "Enter a valid email address.",
      "",
    ]);
    expect(parsed.rows[2].duplicate).toBe(true);
    expect(
      parseEnrollmentInput(
        Array.from({ length: 501 }, (_, index) => `u${index}@example.org`).join("\n"),
        "emails",
      ).errors,
    ).toContain("Import is limited to 500 entries at a time.");
  });
});
