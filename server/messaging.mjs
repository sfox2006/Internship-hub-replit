import express from "express";
import { randomUUID } from "node:crypto";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const groupId =
  /^grp_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const messageId = (value) =>
  typeof value === "string" &&
  /^[1-9][0-9]{0,18}$/.test(value) &&
  BigInt(value) <= 9223372036854775807n;
const completeProfile = (profile) =>
  typeof profile?.verifiedEmail === "string" &&
  !!profile.verifiedEmail.trim() &&
  typeof profile.firstName === "string" &&
  !!profile.firstName.trim() &&
  typeof profile.lastName === "string" &&
  !!profile.lastName.trim();

export function messagingRouter(
  store,
  { origin, isValidCsrf, getVerifiedMember = async () => null },
) {
  const router = express.Router();

  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!req.messagingUser || !req.messagingClerkUserId)
      return res.status(401).json({ error: "Verified sign-in required" });
    if (req.method !== "GET") {
      const token = req.get("X-CSRF-Token") || "";
      if (
        req.get("Origin") !== origin ||
        !isValidCsrf(token, req.messagingCsrf)
      )
        return res.status(403).json({ error: "Invalid request origin or token" });
    }
    next();
  });

  async function verifiedMembers(rows) {
    const results = await Promise.all(
      rows.map(async (row) => {
        const profile = await getVerifiedMember(row.clerk_user_id);
        if (!completeProfile(profile)) return null;
        const name = `${profile.firstName.trim()} ${profile.lastName.trim()}`;
        await store.updateUserName(row.id, name);
        return { id: row.id, name };
      }),
    );
    return results.filter(Boolean);
  }

  async function availableMembers(requesterId) {
    return verifiedMembers(await store.users(requesterId));
  }

  router.get("/users", async (req, res) =>
    res.json(await availableMembers(req.messagingUser.id)),
  );

  router.get("/conversations", async (req, res) => {
    const [direct, groups] = await Promise.all([
      store.inbox(req.messagingUser.id),
      store.groupInbox(req.messagingUser.id),
    ]);
    res.json(
      [...direct, ...groups].sort(
        (a, b) =>
          new Date(b.last_at || 0).getTime() -
          new Date(a.last_at || 0).getTime(),
      ),
    );
  });

  router.post("/conversations", async (req, res) => {
    if (!uuid.test(req.body?.peerId))
      return res.status(400).json({ error: "Choose a valid recipient" });
    const candidates = await availableMembers(req.messagingUser.id);
    if (!candidates.some((member) => member.id === req.body.peerId))
      return res.status(404).json({ error: "Recipient unavailable" });
    const conversation = await store.start(
      req.messagingUser.id,
      req.body.peerId,
    );
    if (!conversation)
      return res.status(404).json({ error: "Recipient unavailable" });
    res.status(201).json({ ...conversation, kind: "direct" });
  });

  router.post("/groups", async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const selected = req.body?.memberIds;
    if (!name || [...name].length > 80)
      return res
        .status(400)
        .json({ error: "Group name must be 1–80 characters" });
    if (
      !Array.isArray(selected) ||
      selected.length < 2 ||
      selected.some((id) => typeof id !== "string" || !uuid.test(id)) ||
      new Set(selected).size !== selected.length ||
      selected.includes(req.messagingUser.id)
    )
      return res
        .status(400)
        .json({ error: "Choose at least two different verified members" });
    const candidates = await availableMembers(req.messagingUser.id);
    if (selected.some((id) => !candidates.some((member) => member.id === id)))
      return res.status(404).json({ error: "One or more members are unavailable" });
    const group = await store.createGroup({
      id: `grp_${randomUUID()}`,
      name,
      createdBy: req.messagingUser.id,
      memberIds: [req.messagingUser.id, ...selected],
    });
    if (!group)
      return res.status(404).json({ error: "One or more members are unavailable" });
    res.status(201).json({ ...group, kind: "group" });
  });

  router.get("/groups/:id", async (req, res) => {
    if (!groupId.test(req.params.id))
      return res.status(404).json({ error: "Group not found" });
    const group = await store.groupDetails(
      req.messagingUser.id,
      req.params.id,
    );
    if (!group) return res.status(404).json({ error: "Group not found" });
    const members = await verifiedMembers(group.members);
    res.json({
      id: group.id,
      group_name: group.group_name,
      members,
    });
  });

  router.use("/conversations/:id", async (req, res, next) => {
    if (
      (!uuid.test(req.params.id) && !groupId.test(req.params.id)) ||
      !(await store.participant(req.messagingUser.id, req.params.id))
    )
      return res.status(404).json({ error: "Conversation not found" });
    next();
  });

  router.get("/conversations/:id/messages", async (req, res) => {
    if (req.query.before !== undefined && !messageId(req.query.before))
      return res.status(400).json({ error: "Invalid message cursor" });
    res.json(
      await store.history(
        req.messagingUser.id,
        req.params.id,
        req.query.before,
      ),
    );
  });

  router.post("/conversations/:id/messages", async (req, res) => {
    const body = req.body?.body;
    if (
      typeof body !== "string" ||
      !body.trim() ||
      [...body.trim()].length > 4000
    )
      return res
        .status(400)
        .json({ error: "Enter a message of 1–4000 characters" });
    const message = await store.send(
      req.messagingUser.id,
      req.params.id,
      body.trim(),
    );
    if (!message)
      return res.status(404).json({ error: "Conversation not found" });
    if (groupId.test(req.params.id))
      message.sender_name = req.messagingUser.name;
    res.status(201).json(message);
  });

  router.post("/conversations/:id/read", async (req, res) => {
    if (!messageId(req.body?.through))
      return res.status(400).json({ error: "Invalid message cursor" });
    await store.read(
      req.messagingUser.id,
      req.params.id,
      req.body.through,
    );
    res.sendStatus(204);
  });

  return router;
}
