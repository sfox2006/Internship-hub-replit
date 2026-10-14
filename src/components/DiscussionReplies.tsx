import { useState } from "react";
import { localFormat } from "../data/clock";
import { replyTree, type ReplyNode } from "../data/discussionThreads";
import type { Reply } from "../../shared/types";
type Props = {
  replies: Reply[];
  author: (id: string) => string;
  onReply: (body: string, parentId: string) => void;
};
function Comment({
  node,
  author,
  onReply,
  depth = 0,
}: Omit<Props, "replies"> & { node: ReplyNode; depth?: number }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  return (
    <article className="thread-comment" data-reply-id={node.reply.id}>
      <div className="row wrap">
        <strong>{author(node.reply.authorId)}</strong>
        <small>
          {localFormat(node.reply.createdAt, "MMM d, h:mm a")} Sydney time
        </small>
      </div>
      <p className="preserve-lines">{node.reply.body}</p>
      <div className="row">
        <button
          className="text-button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          Reply to this comment
        </button>
        {node.children.length > 0 && (
          <button
            className="text-button"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? "Show" : "Hide"} replies ({node.children.length})
          </button>
        )}
      </div>
      {open && (
        <form
          className="comment-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim()) return;
            onReply(body, node.reply.id);
            setBody("");
            setOpen(false);
          }}
        >
          <label>
            Reply to {author(node.reply.authorId)}
            <textarea
              aria-label={`Reply to comment: ${node.reply.body.slice(0, 60)}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
          </label>
          <div className="row">
            <button type="submit" className="primary" disabled={!body.trim()}>
              Post reply
            </button>
            <button type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {!collapsed && node.children.length > 0 && (
        <div className={`thread-children ${depth >= 3 ? "deep-thread" : ""}`}>
          {node.children.map((child) => (
            <Comment
              key={child.reply.id}
              node={child}
              author={author}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </article>
  );
}
export default function DiscussionReplies({ replies, author, onReply }: Props) {
  return (
    <div className="discussion-replies">
      {replyTree(replies).map((node) => (
        <Comment
          key={node.reply.id}
          node={node}
          author={author}
          onReply={onReply}
        />
      ))}
    </div>
  );
}
