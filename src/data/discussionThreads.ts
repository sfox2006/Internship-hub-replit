import type { Discussion, Reply } from "../../shared/types";
export type ReplyNode = { reply: Reply; children: ReplyNode[] };
// Legacy flat replies remain top-level. Invalid/orphan/cyclic parents are repaired.
export function replyTree(replies: Reply[]): ReplyNode[] {
  const nodes = new Map<string, ReplyNode>();
  for (const reply of replies)
    if (!nodes.has(reply.id)) nodes.set(reply.id, { reply, children: [] });
  const roots: ReplyNode[] = [];
  for (const node of nodes.values()) {
    let parentId = node.reply.parentReplyId;
    const seen = new Set([node.reply.id]);
    let cursor = parentId;
    let invalid = false;
    while (cursor) {
      if (seen.has(cursor) || !nodes.has(cursor)) {
        invalid = true;
        break;
      }
      seen.add(cursor);
      cursor = nodes.get(cursor)!.reply.parentReplyId;
    }
    if (parentId && !invalid) nodes.get(parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}
export function addReply(
  thread: Discussion,
  body: string,
  parentReplyId: string | null,
  createdAt: string,
  id: string,
): Discussion {
  const text = body.trim();
  if (!text) throw Error("A reply cannot be empty.");
  if (parentReplyId && !thread.replies.some((r) => r.id === parentReplyId))
    throw Error("The reply you are responding to is unavailable.");
  return {
    ...thread,
    replies: [
      ...thread.replies,
      {
        id,
        discussionId: thread.id,
        parentReplyId,
        authorId: "demo",
        body: text,
        createdAt,
      },
    ],
  };
}
