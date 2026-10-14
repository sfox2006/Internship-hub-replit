export type AccountRole = "normal" | "administrator";

export type Account = {
  userId: string;
  role: AccountRole;
  enrollmentStatus:
    | "joined"
    | "approved"
    | "suspended"
    | "not-approved"
    | "email-unverified"
    | "identity-conflict";
};

export type AccountIdentity = {
  name: string;
  email: string;
};
