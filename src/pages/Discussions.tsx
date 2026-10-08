import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDistance } from "date-fns";
import {
  fixtures,
  lastActivity,
  sortDiscussions,
  personWithProfile,
} from "../data/selectors";
import { referenceNow, etFormat } from "../data/clock";
import { useDemo } from "../data/demoStore";
import Card from "../components/Card";
import Modal from "../components/Modal";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
export default function Discussions() {
  const { state, update } = useDemo();
  const [params, setParams] = useSearchParams();
  const [composing, setComposing] = useState(params.get("compose") === "1");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [area, setArea] = useState("All policy areas");
  const [composeArea, setComposeArea] = useState("");
  const [session, setSession] = useState(params.get("session") || "");
  const [sort, setSort] = useState("Newest");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  function close() {
    setComposing(false);
    setParams({});
  }
  const discussions = sortDiscussions(
    state.discussions.filter(
      (d) => area === "All policy areas" || d.policyAreaId === area,
    ),
    sort,
  );
  function author(id: string) {
    const p = fixtures.people.find((p) => p.id === id);
    return p ? personWithProfile(p, state).name : "Demo participant";
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMMUNITY</span>
          <h1>Discussion Board</h1>
          <p>Good questions are the start of good conversations.</p>
        </div>
        <button className="primary" onClick={() => setComposing(true)}>
          Start a discussion
        </button>
      </div>
      <Card>
        <div className="row wrap">
          <label className="grow">
            Policy area
            <select
              aria-label="Policy area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              {["All policy areas", ...fixtures.policyAreas].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {["Newest", "Most active", "Unanswered"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>
      <p role="status">{status}</p>
      {discussions.map((d) => (
        <Card key={d.id}>
          <div className="row">
            <Avatar name={author(d.authorId)} id={d.authorId} />
            <div>
              <strong>{author(d.authorId)}</strong>
              <small className="muted">
                {etFormat(d.createdAt, "MMM d, yyyy · h:mm a")} ET
              </small>
            </div>
          </div>
          <h2>{d.title}</h2>
          <p className="preserve-lines">{d.body}</p>
          {d.policyAreaId && <span className="badge">{d.policyAreaId}</span>}
          {d.sessionId && (
            <p>
              <Link to={`/session/${d.sessionId}`}>
                {fixtures.sessions.find((s) => s.id === d.sessionId)?.title}
              </Link>
            </p>
          )}
          <div className="replies">
            {d.replies.map((r) => (
              <div key={r.id}>
                <strong>{author(r.authorId)}</strong>
                <small> · {etFormat(r.createdAt, "MMM d, h:mm a")} ET</small>
                <p className="preserve-lines">{r.body}</p>
              </div>
            ))}
          </div>
          <p className="muted">
            {d.replies.length} replies · Last activity{" "}
            {formatDistance(new Date(lastActivity(d)), referenceNow(), {
              addSuffix: true,
            })}
          </p>
          <form
            className="row reply-form"
            onSubmit={(e) => {
              e.preventDefault();
              const text = reply[d.id]?.trim();
              if (!text) return;
              const ok = update((s) => ({
                ...s,
                discussions: s.discussions.map((thread) =>
                  thread.id === d.id
                    ? {
                        ...thread,
                        replies: [
                          ...thread.replies,
                          {
                            id: crypto.randomUUID(),
                            discussionId: d.id,
                            authorId: "demo",
                            body: text,
                            createdAt: referenceNow().toISOString(),
                          },
                        ],
                      }
                    : thread,
                ),
              }));
              setReply((r) => ({ ...r, [d.id]: "" }));
              setStatus(
                ok
                  ? "Reply saved in this browser."
                  : "Reply added in this session; browser save failed.",
              );
            }}
          >
            <label className="grow">
              Add a reply
              <input
                aria-label={`Reply to ${d.title}`}
                value={reply[d.id] || ""}
                onChange={(e) =>
                  setReply((r) => ({ ...r, [d.id]: e.target.value }))
                }
              />
            </label>
            <button
              type="submit"
              className="primary"
              disabled={!reply[d.id]?.trim()}
            >
              Reply
            </button>
          </form>
        </Card>
      ))}
      {!discussions.length && <EmptyState title="No matching discussions" />}
      {composing && (
        <Modal title="Start a discussion" onClose={close}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim() || !body.trim()) return;
              const ok = update((s) => ({
                ...s,
                discussions: [
                  ...s.discussions,
                  {
                    id: crypto.randomUUID(),
                    title: title.trim(),
                    body: body.trim(),
                    authorId: "demo",
                    createdAt: referenceNow().toISOString(),
                    policyAreaId: composeArea || null,
                    sessionId: session || null,
                    replies: [],
                  },
                ],
              }));
              setTitle("");
              setBody("");
              close();
              setStatus(
                ok
                  ? "Discussion saved in this browser."
                  : "Discussion added in this session; browser save failed.",
              );
            }}
          >
            <label>
              Title
              <input
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Message
              <textarea
                required
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <label>
              Policy area (optional)
              <select
                value={composeArea}
                onChange={(e) => setComposeArea(e.target.value)}
              >
                <option value="">No policy area</option>
                {fixtures.policyAreas.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label>
              Linked session (optional)
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
              >
                <option value="">No linked session</option>
                {fixtures.sessions.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <button type="button" onClick={close}>
                Cancel
              </button>
              <button
                className="primary"
                disabled={!title.trim() || !body.trim()}
                type="submit"
              >
                Post discussion
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
