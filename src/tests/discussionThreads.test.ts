import { describe, it, expect } from "vitest";
import { replyTree, addReply } from "../data/discussionThreads";
import type { Discussion, Reply } from "../../shared/types";
const reply = (id: string, parentReplyId?: string | null): Reply => ({
  id,
  parentReplyId,
  discussionId: "t",
  authorId: "demo",
  body: id,
  createdAt: "2026-10-13T10:00:00Z",
});
describe("nested discussion replies", () => {
  it("keeps legacy flat replies and builds ordered multi-level threads", () => {
    const tree = replyTree([
      reply("first"),
      reply("second", null),
      reply("child", "first"),
      reply("grandchild", "child"),
    ]);
    expect(tree.map((n) => n.reply.id)).toEqual(["first", "second"]);
    expect(tree[0].children[0].children[0].reply.id).toBe("grandchild");
  });
  it("repairs missing parents and cycles without hiding comments", () => {
    const roots = replyTree([
      reply("a", "b"),
      reply("b", "a"),
      reply("orphan", "missing"),
      reply("self", "self"),
    ]);
    expect(roots.map((n) => n.reply.id)).toEqual(["a", "b", "orphan", "self"]);
  });
  it("validates text and parent belongs to the same discussion", () => {
    const thread: Discussion = {
      id: "t",
      title: "Topic",
      body: "Original",
      authorId: "demo",
      createdAt: "2026-10-13T10:00:00Z",
      policyAreaId: null,
      sessionId: null,
      replies: [reply("first")],
    };
    expect(() => addReply(thread, "  ", null, "now", "id")).toThrow();
    expect(() =>
      addReply(thread, "text", "other-thread", "now", "id"),
    ).toThrow();
    const next = addReply(
      thread,
      " Child ",
      "first",
      "2026-10-13T11:00:00Z",
      "child",
    );
    expect(next.replies.at(-1)).toMatchObject({
      body: "Child",
      parentReplyId: "first",
    });
    expect(thread.replies).toHaveLength(1);
  });
});
