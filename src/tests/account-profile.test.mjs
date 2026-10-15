import { describe, expect, it } from "vitest";
import {
  hasCompleteAccountProfile,
  validateAccountProfile,
} from "../../server/account-profile.mjs";
import { fellowLabels } from "../data/messaging.tsx";
import { withVerifiedAccountName } from "../data/account-profile.ts";

describe("account profile names", () => {
  it("normalizes valid first and last names without inventing either", () => {
    expect(
      validateAccountProfile({ firstName: "  Zoë  ", lastName: "Ng" }),
    ).toEqual({ ok: true, firstName: "Zoë", lastName: "Ng" });
    expect(hasCompleteAccountProfile({ firstName: "", lastName: "Ng" })).toBe(
      false,
    );
  });

  it("uses Clerk names over stale browser placeholders while preserving other profile fields", () => {
    expect(
      withVerifiedAccountName(
        {
          firstName: "Demo",
          lastName: "Fellow",
          school: "Local school",
          bio: "Existing browser-local biography",
        },
        { firstName: "Riley", lastName: "Member" },
      ),
    ).toEqual({
      firstName: "Riley",
      lastName: "Member",
      school: "Local school",
      bio: "Existing browser-local biography",
    });
  });

  it.each([
    [null, "Ng"],
    [" ", "Ng"],
    ["A".repeat(101), "Ng"],
    ["Ada\u0000", "Ng"],
    ["Ada", 42],
  ])("rejects invalid names: %j %j", (firstName, lastName) => {
    expect(validateAccountProfile({ firstName, lastName }).ok).toBe(false);
  });

  it("disambiguates duplicate names without exposing account IDs or email", () => {
    const labels = fellowLabels([
      { id: "uuid-private-1", name: "Alex Fellow" },
      { id: "uuid-private-2", name: "alex fellow" },
      { id: "uuid-private-3", name: "Jordan Fellow" },
    ]);
    expect(labels.get("uuid-private-1")).toBe("Alex Fellow (member 1 of 2)");
    expect(labels.get("uuid-private-2")).toBe("alex fellow (member 2 of 2)");
    expect(labels.get("uuid-private-3")).toBe("Jordan Fellow");
    expect([...labels.values()].join(" ")).not.toMatch(/uuid-private|@/);
  });
});
