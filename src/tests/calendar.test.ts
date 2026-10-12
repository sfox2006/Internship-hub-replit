import { describe, it, expect } from "vitest";
// @ts-expect-error JavaScript module exercised directly by the server and tests.
import { calendar, readingEvent, foldLine } from "../../server/calendar.mjs";
import { fixtures } from "../data/selectors";
describe("RFC 5545 calendar output", () => {
  it("uses stable event UIDs, UTC timestamps, CRLF, and escaped text", () => {
    const text = calendar(
      [
        {
          id: "example",
          startAt: "2026-10-08T13:30:00Z",
          endAt: "2026-10-08T15:00:00Z",
          title: "Hello, world; test",
          description: "Line one\nLine two",
          location: "Room, one",
        },
      ],
      new Date("2026-10-08T12:00:00Z"),
    );
    expect(text).toContain("UID:example@cis-fellowship-demo\r\n");
    expect(text).toContain("DTSTART:20261008T133000Z");
    expect(text).toContain("DTEND:20261008T150000Z");
    expect(text).toContain("SUMMARY:Hello\\, world\\; test");
    expect(text).toContain("DESCRIPTION:Line one\\nLine two");
    expect(text).not.toMatch(/(?<!\r)\n/);
  });
  it("folds Unicode lines at 75 bytes without splitting characters", () => {
    const text = foldLine("SUMMARY:" + "é".repeat(100));
    for (const line of text.split("\r\n"))
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    expect(text.replace(/\r\n /g, "")).toBe("SUMMARY:" + "é".repeat(100));
  });
  it("rejects invalid dates and unknown duration; adds actual reading minutes", () => {
    const r = { ...fixtures.resources[0], minutes: 60 };
    expect(readingEvent(r, "no")).toBe(null);
    expect(readingEvent(r, "2026-02-30T13:00:00Z")).toBe(null);
    expect(readingEvent(r, "2026-10-08T13:00:00")).toBe(null);
    expect(readingEvent({ ...r, minutes: null }, "2026-10-08T13:00:00Z")).toBe(
      null,
    );
    const e = readingEvent(r, "2026-11-02T14:23:00Z");
    expect(e.endAt).toBe("2026-11-02T15:23:00.000Z");
  });
});
