export type AccountName = {
  firstName: string;
  lastName: string;
};

export function normalizeAccountName(value: string): string | null {
  const normalized = value.trim();
  const length = [...normalized].length;
  if (
    length < 1 ||
    length > 100 ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(normalized)
  )
    return null;
  return normalized;
}

export function withVerifiedAccountName<
  T extends { firstName: string; lastName: string },
>(browserProfile: T, accountName: AccountName): T {
  return {
    ...browserProfile,
    firstName: accountName.firstName,
    lastName: accountName.lastName,
  };
}
