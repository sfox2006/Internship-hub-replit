import { describe, it, expect } from "vitest";
import {
  fixtures,
  filterSessions,
  percentage,
  nextSession,
  readingProgress,
  requirementProgress,
  requirementStatus,
  outstandingPrep,
} from "../data/selectors";
import { mondayKey, readingStart, localFormat } from "../data/clock";
import { initialState, loadState, saveState } from "../data/storage";
const now = new Date("2026-10-08T13:23:00Z");
describe("CIS fellowship selectors and persistence", () => {
  it("uses all thirteen supplied sessions, upcoming/past ordering and unknowns", () => {
    expect(fixtures.sessions).toHaveLength(13);
    expect(filterSessions({}, now)).toHaveLength(4);
    expect(filterSessions({ past: true }, now)[0].id).toBe("ls-1001");
    expect(nextSession(now)?.id).toBe("ls-1022");
    expect(nextSession(now)?.speakerIds).toEqual([]);
  });
  it("AND-combines programme area and single type filters", () => {
    expect(
      filterSessions(
        { past: true, area: "Education policy", type: "Seminar" },
        now,
      ).map((s) => s.id),
    ).toEqual(["ls-0528"]);
    expect(
      filterSessions(
        { past: true, area: "Education policy", type: "Lecture" },
        now,
      ),
    ).toEqual([]);
  });
  it("preserves Sydney 6–8pm across daylight saving", () => {
    expect(fixtures.sessions[0].startAt).toBe("2026-04-16T08:00:00Z");
    expect(fixtures.sessions[9].startAt).toBe("2026-10-22T07:00:00Z");
    expect(localFormat(fixtures.sessions[9].startAt, "HH:mm")).toBe("18:00");
    expect(readingStart("2026-07-09T18:00")).toBe("2026-07-09T08:00:00.000Z");
    expect(readingStart("2026-10-22T18:00")).toBe("2026-10-22T07:00:00.000Z");
  });
  it("groups Monday in Sydney and handles invalid local dates", () => {
    expect(mondayKey("2026-10-11T14:00:00Z")).toBe("2026-10-12");
    expect(readingStart("bad")).toBe(null);
  });
  it("does not invent mandatory readings and uses actual completion counts", () => {
    expect(readingProgress([])).toEqual({ done: 0, total: 0 });
    expect(outstandingPrep([], now)).toEqual([]);
    expect(percentage(5, 46)).toBe(11);
    expect(percentage(0, 0)).toBe(0);
    expect(requirementProgress([])).toEqual({ done: 0, total: 16 });
  });
  it("uses a deadline fourteen days later and does not flag overdue before 11:59pm", () => {
    const r = fixtures.requirements[0];
    expect(r.dueDate).toBe("2026-04-30");
    expect(requirementStatus(r.id, [], "2026-04-30")).toBe("Due");
    expect(requirementStatus(r.id, [], "2026-05-01")).toBe("Overdue");
    expect(requirementStatus(r.id, [r.id], "2026-05-01")).toBe("Done");
  });
  it("keeps RSVP, attendance and requirements independent; persists namespaced records", () => {
    const state = initialState();
    state.attendedSessionIds = ["ls-0416"];
    state.rsvpBySession["ls-0416"] = "going";
    expect(state.completedRequirementIds).toEqual([]);
    let saved = "";
    expect(saveState({ setItem: (_k, v) => (saved = v) }, state)).toBe(null);
    expect(
      loadState({ getItem: () => saved }).state.attendedSessionIds,
    ).toEqual(["ls-0416"]);
    expect(initialState().profile.lastName).toBe("Fellow");
  });
  it("handles corrupt data and unavailable storage without throwing", () => {
    expect(loadState({ getItem: () => "{broken" }).error).toBeTruthy();
    expect(
      saveState(
        {
          setItem: () => {
            throw Error("quota");
          },
        },
        initialState(),
      ),
    ).toContain("unavailable or full");
    const state = initialState();
    state.completedRequirementIds = ["old-cato-id"];
    expect(
      loadState({ getItem: () => JSON.stringify(state) }).state
        .completedRequirementIds,
    ).toEqual([]);
  });
});
