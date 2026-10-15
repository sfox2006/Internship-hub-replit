export type AccountRole = "normal" | "administrator";

export type Account = {
  userId: string;
  role: AccountRole;
  firstName: string;
  lastName: string;
  verifiedEmail: string | null;
  profileComplete: boolean;
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
  firstName: string;
  lastName: string;
};
