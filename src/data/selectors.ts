import raw from "../../shared/fixtures.json";
import type {
  Fixtures,
  PersonalState,
  Session,
  Discussion,
} from "../../shared/types";
import { mondayKey } from "./clock";
export const fixtures = raw as Fixtures;
export const percentage = (done: number, total: number) =>
  total > 0 ? Math.round((done / total) * 100) : 0;
export const requiredIds = () => [
  ...new Set(
    fixtures.sessionResources
      .filter((a) => a.required)
      .map((a) => a.resourceId),
  ),
];
export const readingProgress = (done: string[]) => {
  const ids = requiredIds();
  return {
    done: ids.filter((id) => done.includes(id)).length,
    total: ids.length,
  };
};
export const requirementProgress = (done: string[]) => ({
  done: fixtures.requirements.filter((r) => done.includes(r.id)).length,
  total: fixtures.requirements.length,
});
export const sessionAssignments = (id: string) =>
  fixtures.sessionResources
    .filter((a) => a.sessionId === id)
    .sort((a, b) => a.order - b.order);
export const resourceCounts = (id: string) => {
  const a = sessionAssignments(id);
  return {
    required: a.filter((x) => x.required).length,
    optional: a.filter((x) => !x.required).length,
  };
};
export const isPast = (s: Session, now: Date) => new Date(s.endAt) < now;
export const nextSession = (now: Date) =>
  fixtures.sessions
    .filter((s) => !isPast(s, now))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
export function filterSessions(
  {
    past = false,
    required = false,
    type = "All types",
    area = "All policy areas",
  }: { past?: boolean; required?: boolean; type?: string; area?: string },
  now: Date,
) {
  return fixtures.sessions
    .filter(
      (s) =>
        isPast(s, now) === past &&
        (!required || s.attendanceRequired) &&
        (type === "All types" || s.type === type) &&
        (area === "All policy areas" || s.policyAreaId === area),
    )
    .sort((a, b) =>
      past
        ? b.startAt.localeCompare(a.startAt)
        : a.startAt.localeCompare(b.startAt),
    );
}
export const weekSessions = (key: string) =>
  fixtures.sessions
    .filter((s) => mondayKey(s.startAt) === key)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
export function outstandingPrep(done: string[], now: Date) {
  return fixtures.sessionResources
    .filter((a) => a.required && !done.includes(a.resourceId))
    .map((a) => ({
      ...a,
      session: fixtures.sessions.find((s) => s.id === a.sessionId)!,
      resource: fixtures.resources.find((r) => r.id === a.resourceId)!,
    }))
    .filter((a) => new Date(a.session.startAt) >= now)
    .sort(
      (a, b) =>
        a.session.startAt.localeCompare(b.session.startAt) || a.order - b.order,
    );
}
export const requirementStatus = (
  id: string,
  done: string[],
  today: string,
) => {
  const r = fixtures.requirements.find((r) => r.id === id)!;
  return done.includes(id)
    ? "Done"
    : r.dueDate && r.dueDate < today
      ? "Overdue"
      : "Due";
};
export const lastActivity = (d: Discussion) =>
  [d.createdAt, ...d.replies.map((r) => r.createdAt)].sort().at(-1)!;
export function sortDiscussions(ds: Discussion[], sort: string) {
  return [...ds]
    .filter((d) => sort !== "Unanswered" || !d.replies.length)
    .sort((a, b) =>
      sort === "Most active"
        ? b.replies.length - a.replies.length ||
          lastActivity(b).localeCompare(lastActivity(a))
        : b.createdAt.localeCompare(a.createdAt),
    );
}
export function personWithProfile(
  person: Fixtures["people"][number],
  state: PersonalState,
) {
  return person.id === "demo"
    ? {
        ...person,
        name: `${state.profile.firstName} ${state.profile.lastName}`.trim(),
        school: state.profile.school,
        bio: state.profile.bio,
        linkedinUrl: state.profile.linkedinUrl,
        websiteUrl: state.profile.websiteUrl,
      }
    : person;
}
export type SearchResult = {
  type: string;
  id: string;
  title: string;
  description: string;
  url: string;
};
export function searchEntities(
  query: string,
  state?: PersonalState,
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return [
    ...fixtures.sessions.map((s) => ({
      type: "Sessions",
      id: s.id,
      title: s.title,
      description: s.description,
      url: `/session/${s.id}`,
    })),
    ...fixtures.resources.map((r) => ({
      type: "Readings",
      id: r.id,
      title: r.title,
      description: r.authors + " " + r.description,
      url: `/resource/${r.id}`,
    })),
    ...fixtures.articles.map((a) => ({
      type: "Guides/Articles",
      id: a.slug,
      title: a.title,
      description: a.summary,
      url: `/article/${a.slug}`,
    })),
    ...fixtures.guides.map((g) => ({
      type: "Guides/Articles",
      id: g.slug,
      title: g.title,
      description: g.subtitle,
      url: `/${g.slug}`,
    })),
    ...fixtures.teams.map((t) => ({
      type: "Teams",
      id: t.id,
      title: t.name,
      description: t.description,
      url: `/team/${t.id}`,
    })),
    ...fixtures.people
      .map((p) => (state ? personWithProfile(p, state) : p))
      .map((p) => ({
        type: "People",
        id: p.id,
        title: p.name,
        description: p.bio,
        url: `/person/${p.id}`,
      })),
  ].filter((r) => (r.title + " " + r.description).toLowerCase().includes(q));
}
