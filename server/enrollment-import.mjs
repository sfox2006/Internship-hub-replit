const MAX_IMPORT_BYTES = 256 * 1024;
const MAX_IMPORT_ROWS = 500;

export function normalizeEnrollmentEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isValidEmail(value) {
  return (
    value.length <= 254 &&
    /^[^\s@,;]+@[^\s@,;]+(?:\.[^\s@,;]+)+$/.test(value)
  );
}

function parseCsv(input) {
  const rows = [];
  let fields = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  let malformed = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
        if (character === "\n") line += 1;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      fields.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      fields.push(field);
      field = "";
      rows.push({ fields, line: rowLine });
      fields = [];
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      line += 1;
      rowLine = line;
    } else {
      if (character === '"') malformed = true;
      field += character;
    }
  }

  if (quoted) malformed = true;
  if (field.length || fields.length) {
    fields.push(field);
    rows.push({ fields, line: rowLine });
  }
  return { rows, malformed };
}

export function parseEnrollmentInput(input, format) {
  if (typeof input !== "string")
    return { rows: [], errors: ["Import text is required."] };
  if (Buffer.byteLength(input, "utf8") > MAX_IMPORT_BYTES)
    return { rows: [], errors: ["Import is larger than the 256 KB limit."] };

  const sourceRows = [];
  if (format === "csv") {
    const parsed = parseCsv(input);
    if (parsed.malformed)
      return { rows: [], errors: ["CSV contains an unmatched or misplaced quote."] };
    const nonempty = parsed.rows.filter((row) =>
      row.fields.some((field) => field.trim()),
    );
    if (!nonempty.length)
      return { rows: [], errors: ["CSV is empty."] };

    const header = nonempty[0].fields.map((value) => value.trim().toLowerCase());
    const emailColumn = header.indexOf("email");
    const nameColumn = header.indexOf("name");
    if (emailColumn < 0)
      return {
        rows: [],
        errors: ['CSV must include an "email" column.'],
      };
    if (header.lastIndexOf("email") !== emailColumn)
      return { rows: [], errors: ['CSV must include only one "email" column.'] };

    for (const row of nonempty.slice(1)) {
      sourceRows.push({
        line: row.line,
        email: row.fields[emailColumn] ?? "",
        name: nameColumn >= 0 ? row.fields[nameColumn] ?? "" : "",
      });
    }
  } else if (format === "emails") {
    input.split(/\r\n?|\n/).forEach((line, index) => {
      line.split(/[;,]/).forEach((email) => {
        if (email.trim())
          sourceRows.push({ line: index + 1, email, name: "" });
      });
    });
  } else {
    return { rows: [], errors: ["Import format must be emails or csv."] };
  }

  if (sourceRows.length > MAX_IMPORT_ROWS)
    return {
      rows: [],
      errors: [`Import is limited to ${MAX_IMPORT_ROWS} entries at a time.`],
    };

  const seen = new Set();
  const rows = sourceRows.map((source) => {
    const email = String(source.email ?? "").trim();
    const name = String(source.name ?? "").trim().slice(0, 200);
    const normalizedEmail = normalizeEnrollmentEmail(email);
    let error = "";
    let duplicate = false;
    if (!email) error = "Email is required.";
    else if (!isValidEmail(email)) error = "Enter a valid email address.";
    else if (seen.has(normalizedEmail)) duplicate = true;
    else seen.add(normalizedEmail);
    return {
      line: source.line,
      email,
      name,
      normalizedEmail,
      duplicate,
      error,
    };
  });

  return { rows, errors: [] };
}
