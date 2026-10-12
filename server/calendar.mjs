const escapeText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const stamp = (value) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
// RFC 5545 folds content lines at 75 octets, without splitting UTF-8 characters.
export function foldLine(line) {
  const parts = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const n = Buffer.byteLength(char);
    if (size + n > 75) {
      parts.push(current);
      current = " ";
      size = 1;
    }
    current += char;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n");
}
export function calendar(events, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CIS Fellowship Demo//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(event.id)}@cis-fellowship-demo`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(event.startAt)}`,
      `DTEND:${stamp(event.endAt)}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
    );
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
export function readingEvent(resource, start) {
  if (
    typeof start !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(start)
  )
    return null;
  const time = Date.parse(start);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().replace(".000", "") !==
      start.replace(".000", "") ||
    !resource.minutes ||
    resource.minutes <= 0
  )
    return null;
  return {
    id: `reading-${resource.id}-${time}`,
    title: `Reading: ${resource.title}`,
    description: "Demo reading time block",
    startAt: new Date(time).toISOString(),
    endAt: new Date(time + resource.minutes * 60000).toISOString(),
  };
}
