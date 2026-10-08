import { describe, it, expect } from "vitest";
import {
  filterSessions,
  fixtures,
  isPast,
  nextSession,
  outstandingPrep,
  percentage,
  readingProgress,
  requirementProgress,
  requiredIds,
  resourceCounts,
  requirementStatus,
  sortDiscussions,
  lastActivity,
  searchEntities,
} from "../data/selectors";
import { mondayKey, readingStart } from "../data/clock";
import {
  initialState,
  loadState,
  saveState,
  STORAGE_KEY,
} from "../data/storage";
const now = new Date("2026-10-08T13:23:00Z");
describe("schedule and preparation selectors", () => {
  it("combines filters and replaces the single type selection", () => {
    const seminar = filterSessions(
      { required: true, type: "Seminar", area: "Trade & Immigration" },
      now,
    );
    expect(seminar.map((s) => s.id)).toEqual(["56"]);
    expect(
      filterSessions(
        { required: true, type: "Lecture", area: "Trade & Immigration" },
        now,
      ),
    ).toEqual([]);
  });
  it("orders upcoming oldest first and past newest first at the end boundary", () => {
    const past = filterSessions({ past: true }, now);
    expect(past[0].id).toBe("trade");
    expect(past).toHaveLength(9);
    expect(filterSessions({}, now)[0].id).toBe("56");
    const s = fixtures.sessions.find((s) => s.id === "56")!;
    expect(isPast(s, new Date(s.endAt))).toBe(false);
    expect(isPast(s, new Date(Date.parse(s.endAt) + 1))).toBe(true);
    expect(nextSession(now)?.id).toBe("56");
  });
  it("includes seven assignments, even those on optional sessions, and previews five", () => {
    const prep = outstandingPrep([], now);
    expect(prep).toHaveLength(7);
    expect(prep.slice(0, 5)).toHaveLength(5);
    expect(
      prep.some((a) => a.session.id === "63" && !a.session.attendanceRequired),
    ).toBe(true);
    expect(outstandingPrep(["letters"], now)).toHaveLength(6);
  });
  it("uses distinct IDs, actual progress counts and rounding", () => {
    expect(requiredIds()).toHaveLength(7);
    expect(
      readingProgress(["globalization", "stale", "globalization"]),
    ).toEqual({ done: 1, total: 7 });
    expect(percentage(5, 46)).toBe(11);
    expect(percentage(0, 0)).toBe(0);
    expect(resourceCounts("56")).toEqual({ required: 1, optional: 1 });
    expect(requirementProgress(["req1", "stale"])).toEqual({
      done: 1,
      total: 8,
    });
  });
  it("keeps requirements independent and applies the ET due-date assumption", () => {
    const state = initialState();
    state.completedResourceIds = ["globalization"];
    expect(requirementProgress(state.completedRequirementIds).done).toBe(3);
    expect(requirementStatus("req6", [], "2026-10-08")).toBe("Overdue");
    expect(requirementStatus("req6", ["req6"], "2026-10-08")).toBe("Done");
  });
});
describe("ET and discussion rules", () => {
  it("groups by the Monday in ET, even when UTC is already Monday", () => {
    expect(mondayKey("2026-10-12T02:00:00Z")).toBe("2026-10-05");
    expect(mondayKey("2026-10-12T05:00:00Z")).toBe("2026-10-12");
  });
  it("converts local reading time across DST", () => {
    expect(readingStart("2026-10-08T09:23")).toBe("2026-10-08T13:23:00.000Z");
    expect(readingStart("2026-11-02T09:23")).toBe("2026-11-02T14:23:00.000Z");
    expect(readingStart("garbage")).toBe(null);
  });
  it("sorts most active, latest reply and unanswered", () => {
    const ds = structuredClone(fixtures.discussions);
    ds[0].replies.push({
      id: "r",
      discussionId: ds[0].id,
      authorId: "demo",
      body: "A reply",
      createdAt: "2026-10-08T13:00:00Z",
    });
    expect(sortDiscussions(ds, "Most active")[0].id).toBe(ds[0].id);
    expect(sortDiscussions(ds, "Unanswered").map((d) => d.id)).toEqual([
      ds[1].id,
    ]);
    expect(lastActivity(ds[0])).toBe("2026-10-08T13:00:00Z");
  });
  it("searches grouped source entities", () => {
    const result = searchEntities("Jones");
    expect(result.map((r) => r.type)).toEqual(["Sessions", "Readings"]);
    expect(searchEntities("")).toEqual([]);
  });
});
describe("versioned browser storage", () => {
  it("loads seed once without writing, preserves notes and composite keys", () => {
    const state = initialState();
    state.bookmarks = [
      { entityType: "session", entityId: "56", savedAt: now.toISOString() },
      { entityType: "resource", entityId: "56", savedAt: now.toISOString() },
    ];
    state.privateNotesBySession["56"] = "A private note";
    let serialized = "";
    expect(
      saveState(
        {
          setItem: (key, value) => {
            expect(key).toBe(STORAGE_KEY);
            serialized = value;
          },
        },
        state,
      ),
    ).toBe(null);
    const loaded = loadState({ getItem: () => serialized });
    expect(loaded.state.bookmarks).toHaveLength(2);
    expect(loaded.state.privateNotesBySession["56"]).toBe("A private note");
  });
  it("handles corrupt JSON and unavailable storage without throwing", () => {
    expect(loadState({ getItem: () => "{broken" }).error).toMatch(
      /could not be read/,
    );
    expect(
      loadState({
        getItem: () => {
          throw Error("blocked");
        },
      }).state.demoSignedIn,
    ).toBe(true);
    expect(
      saveState(
        {
          setItem: () => {
            throw Error("quota");
          },
        },
        initialState(),
      ),
    ).toMatch(/unavailable or full/);
  });
  it("rejects incompatible personal state without crashing the app", () => {
    const s = { ...initialState(), profile: { firstName: { invalid: true } } };
    expect(loadState({ getItem: () => JSON.stringify(s) }).error).toMatch(
      /could not be read/,
    );
  });
  it("migrates obsolete fixture completion IDs", () => {
    const s = initialState();
    s.completedResourceIds = ["removed", "globalization"];
    s.completedRequirementIds = ["removed", "req1"];
    expect(
      loadState({ getItem: () => JSON.stringify(s) }).state
        .completedResourceIds,
    ).toEqual(["globalization"]);
    expect(
      loadState({ getItem: () => JSON.stringify(s) }).state
        .completedRequirementIds,
    ).toEqual(["req1"]);
  });
});
