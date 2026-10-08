import type { PersonalState } from "../../shared/types";
import { fixtures } from "./selectors";
export const STORAGE_KEY = "cis-fellowship-demo:v1";
export function initialState(): PersonalState {
  return {
    version: 1,
    completedResourceIds: [],
    attendedSessionIds: [],
    completedRequirementIds: [],
    rsvpBySession: {},
    bookmarks: [],
    privateNotesBySession: {},
    assistingEntityKeys: [],
    dismissedAnnouncementIds: [],
    quickTourDismissed: false,
    profile: {
      firstName: "Demo",
      lastName: "Fellow",
      school: "Example University",
      bio: fixtures.people[0].bio,
      linkedinUrl: "",
      websiteUrl: "",
      photoKey: null,
    },
    discussions: structuredClone(fixtures.discussions),
    photos: [],
    demoSignedIn: true,
  };
}
export function loadState(storage: Pick<Storage, "getItem">): {
  state: PersonalState;
  error: string | null;
} {
  const seed = initialState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { state: seed, error: null };
    const saved = JSON.parse(raw);
    if (
      !saved ||
      saved.version !== 1 ||
      !Array.isArray(saved.completedResourceIds) ||
      !Array.isArray(saved.bookmarks) ||
      !Array.isArray(saved.discussions)
    )
      throw Error("Invalid state");
    const stringArray = (value: unknown) =>
      Array.isArray(value) && value.every((x) => typeof x === "string");
    const record = (value: unknown) =>
      !!value && typeof value === "object" && !Array.isArray(value);
    if (
      !stringArray(saved.completedRequirementIds) ||
      !stringArray(saved.assistingEntityKeys) ||
      !stringArray(saved.dismissedAnnouncementIds) ||
      !record(saved.rsvpBySession) ||
      !record(saved.privateNotesBySession) ||
      !record(saved.profile) ||
      typeof saved.demoSignedIn !== "boolean" ||
      !Array.isArray(saved.photos)
    )
      throw Error("Invalid personal records");
    for (const key of [
      "firstName",
      "lastName",
      "school",
      "bio",
      "linkedinUrl",
      "websiteUrl",
    ])
      if (typeof saved.profile[key] !== "string")
        throw Error("Invalid profile");
    if (
      saved.profile.photoKey !== null &&
      typeof saved.profile.photoKey !== "string"
    )
      throw Error("Invalid photo key");
    if (
      !Object.values(saved.privateNotesBySession).every(
        (v) => typeof v === "string",
      )
    )
      throw Error("Invalid notes");
    if (
      !Object.values(saved.rsvpBySession).every(
        (v) => v === null || v === "going" || v === "unavailable",
      )
    )
      throw Error("Invalid RSVP");
    const state = {
      ...seed,
      ...saved,
      profile: { ...seed.profile, ...saved.profile },
    } as PersonalState;
    state.attendedSessionIds = (
      Array.isArray(state.attendedSessionIds) ? state.attendedSessionIds : []
    ).filter((id) => fixtures.sessions.some((s) => s.id === id));
    state.completedResourceIds = state.completedResourceIds.filter((id) =>
      fixtures.resources.some((r) => r.id === id),
    );
    state.completedRequirementIds = (
      Array.isArray(state.completedRequirementIds)
        ? state.completedRequirementIds
        : []
    ).filter((id) => fixtures.requirements.some((r) => r.id === id));
    state.bookmarks = state.bookmarks.filter(
      (b) =>
        b && typeof b.entityType === "string" && typeof b.entityId === "string",
    );
    state.discussions = state.discussions.filter(
      (d) =>
        d &&
        typeof d.id === "string" &&
        typeof d.title === "string" &&
        typeof d.body === "string" &&
        typeof d.createdAt === "string" &&
        Number.isFinite(Date.parse(d.createdAt)) &&
        Array.isArray(d.replies) &&
        d.replies.every(
          (r) =>
            r &&
            typeof r.body === "string" &&
            typeof r.createdAt === "string" &&
            Number.isFinite(Date.parse(r.createdAt)),
        ),
    );
    state.photos = state.photos.filter(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.blobKey === "string" &&
        typeof p.caption === "string" &&
        Number.isFinite(Date.parse(p.createdAt)),
    );
    return { state, error: null };
  } catch {
    return {
      state: seed,
      error:
        "Saved browser data could not be read. This session uses fresh demo records; existing stored data has not been overwritten.",
    };
  }
}
export function saveState(
  storage: Pick<Storage, "setItem">,
  state: PersonalState,
) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return null;
  } catch {
    return "Browser storage is unavailable or full. Changes work in this session but could not be saved for reload.";
  }
}
