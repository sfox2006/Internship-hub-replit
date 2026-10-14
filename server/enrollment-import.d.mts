export type ParsedEnrollmentRow = {
  line: number;
  email: string;
  name: string;
  normalizedEmail: string;
  duplicate: boolean;
  error: string;
};

export function normalizeEnrollmentEmail(value: unknown): string;

export function parseEnrollmentInput(
  input: unknown,
  format: "emails" | "csv",
): { rows: ParsedEnrollmentRow[]; errors: string[] };
