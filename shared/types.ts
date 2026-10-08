export type Term = { id: string; name: string; timezone: string };
export type AssistanceConfig = {
  capacity: number | null;
  baseSignups: string[];
  closesAt: string | null;
};
export type Session = {
  id: string;
  termId: string;
  title: string;
  type: string;
  policyAreaId: string | null;
  startAt: string;
  endAt: string;
  location: string | null;
  speakerIds: string[];
  description: string;
  attendanceRequired: boolean;
  reportedLengthMinutes: number | null;
  assistanceConfig: AssistanceConfig | null;
};
export type Resource = {
  id: string;
  title: string;
  type: string;
  authors: string;
  minutes: number | null;
  policyAreaId: string | null;
  description: string;
  externalUrl: string | null;
  localFileUrl: string | null;
  previewKind: string;
};
export type SessionResource = {
  sessionId: string;
  resourceId: string;
  required: boolean;
  order: number;
};
export type Requirement = {
  id: string;
  category: string;
  title: string;
  dueDate: string | null;
  sessionId: string | null;
  description: string;
  submissionUrl: string | null;
};
export type Person = {
  id: string;
  name: string;
  kind: string;
  title: string | null;
  school: string | null;
  placement: string | null;
  termId: string | null;
  bio: string;
  photoUrl: string | null;
  email: string;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  teamIds: string[];
  location: string | null;
  scholarProfileUrl: string | null;
};
export type Team = {
  id: string;
  name: string;
  policyAreaId: string;
  description: string;
  tags: string[];
  memberIds: string[];
  primaryContactId: string | null;
};
export type ContentBlock = {
  type: string;
  text?: string;
  headers?: string[];
  rows?: string[][];
};
export type Article = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  tags: string[];
  blocks: ContentBlock[];
  contactPersonIds: string[];
};
export type Guide = {
  slug: string;
  title: string;
  subtitle: string;
  sections: { id: string; title: string; blocks: ContentBlock[] }[];
  originalFileUrl: string | null;
};
export type Announcement = {
  id: string;
  title: string;
  body: string;
  postedAt: string;
  dueAt: string | null;
  expiresAt: string | null;
  urgent: boolean;
  assistanceConfig: AssistanceConfig | null;
};
export type Reply = {
  id: string;
  discussionId: string;
  authorId: string;
  body: string;
  createdAt: string;
};
export type Discussion = {
  id: string;
  title: string;
  body: string;
  authorId: string;
  createdAt: string;
  policyAreaId: string | null;
  sessionId: string | null;
  replies: Reply[];
};
export type Photo = {
  id: string;
  blobKey: string;
  caption: string;
  authorId: string;
  createdAt: string;
};
export type Bookmark = {
  entityType: string;
  entityId: string;
  savedAt: string;
};
export type Profile = {
  firstName: string;
  lastName: string;
  school: string;
  bio: string;
  linkedinUrl: string;
  websiteUrl: string;
  photoKey: string | null;
};
export type PersonalState = {
  version: 1;
  completedResourceIds: string[];
  completedRequirementIds: string[];
  rsvpBySession: Record<string, "going" | "unavailable" | null>;
  bookmarks: Bookmark[];
  privateNotesBySession: Record<string, string>;
  assistingEntityKeys: string[];
  dismissedAnnouncementIds: string[];
  quickTourDismissed: boolean;
  profile: Profile;
  discussions: Discussion[];
  photos: Photo[];
  demoSignedIn: boolean;
};
export type Fixtures = {
  term: Term;
  policyAreas: string[];
  sessions: Session[];
  resources: Resource[];
  sessionResources: SessionResource[];
  requirements: Requirement[];
  people: Person[];
  teams: Team[];
  articles: Article[];
  guides: Guide[];
  announcements: Announcement[];
  discussions: Discussion[];
};
