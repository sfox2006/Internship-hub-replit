export type AccountRole = "normal" | "administrator";

export type Account = {
  userId: string;
  role: AccountRole;
};

export type AccountIdentity = {
  name: string;
  email: string;
};
