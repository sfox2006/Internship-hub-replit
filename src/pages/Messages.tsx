import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Send, Users } from "lucide-react";
import {
  fellowLabels,
  isAuthorizationFailure,
  request,
  useMessaging,
  type Conversation,
  type Fellow,
  type GroupDetails,
  type Message,
} from "../data/messaging";
import Avatar from "../components/Avatar";
import "../styles/messages.css";

export default function Messages() {
  const {
    session,
    conversations,
    error: connectionError,
    refresh,
    invalidate,
  } = useMessaging();
  const [params, setParams] = useSearchParams();
  const selected = params.get("conversation");
  const conversation = conversations.find((item) => item.id === selected);
  const [people, setPeople] = useState<Fellow[]>([]);
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [older, setOlder] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const active = useRef(selected);
  active.current = selected;
  const userId = session?.user?.id;
  const identityKey = session?.user
    ? `${session.user.id}:${session.csrf || ""}`
    : null;
  const identity = useRef<string | null>(identityKey);
  identity.current = identityKey;
  const labels = fellowLabels(people);
  const groupLabels = fellowLabels(group?.members || []);
  const isGroup = conversation?.kind === "group" || !!selected?.startsWith("grp_");

  function handleFailure(reason: unknown, expectedIdentity: string | null) {
    if (identity.current !== expectedIdentity) return;
    if (isAuthorizationFailure(reason)) {
      invalidate(reason.message);
      return;
    }
    setError(
      reason instanceof Error
        ? reason.message
        : "Connection interrupted. Check your connection and retry.",
    );
  }

  useEffect(() => {
    if (!userId || !identityKey) {
      setPeople([]);
      setGroup(null);
      setMessages([]);
      setDraft("");
      setBusy(false);
      setLoaded(false);
      setOlder(false);
      return;
    }
    const identityAtStart = identityKey;
    let cancelled = false;
    request<Fellow[]>("messaging/users")
      .then((users) => {
        if (!cancelled && identity.current === identityAtStart) setPeople(users);
      })
      .catch((reason) => {
        if (!cancelled) handleFailure(reason, identityAtStart);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, identityKey, conversations.length]);

  useEffect(() => {
    setGroup(null);
    if (!selected || !userId || !identityKey || !selected.startsWith("grp_"))
      return;
    const identityAtStart = identityKey;
    let cancelled = false;
    request<GroupDetails>(`messaging/groups/${selected}`)
      .then((details) => {
        if (!cancelled && identity.current === identityAtStart)
          setGroup(details);
      })
      .catch((reason) => {
        if (!cancelled) handleFailure(reason, identityAtStart);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, userId, identityKey]);

  useEffect(() => {
    setMessages([]);
    setDraft("");
    setLoaded(false);
    setError("");
    setOlder(false);
    setBusy(false);
    if (!selected || !userId || !identityKey) return;
    const identityAtStart = identityKey;
    let cancelled = false;
    let loading = false;
    async function update() {
      if (loading || document.visibilityState !== "visible") return;
      loading = true;
      try {
        const latest = await request<Message[]>(
          `messaging/conversations/${selected}/messages`,
        );
        if (cancelled || identity.current !== identityAtStart) return;
        setMessages((previous) => {
          const byId = new Map(previous.map((message) => [message.id, message]));
          latest.forEach((message) => byId.set(message.id, message));
          return [...byId.values()].sort((a, b) =>
            BigInt(a.id) < BigInt(b.id) ? -1 : 1,
          );
        });
        setLoaded(true);
        setError("");
        if (latest.length && document.hasFocus()) {
          await request(
            `messaging/conversations/${selected}/read`,
            session?.csrf,
            { through: latest.at(-1)!.id },
          );
          if (!cancelled && identity.current === identityAtStart)
            await refresh();
        }
      } catch (reason) {
        if (!cancelled) handleFailure(reason, identityAtStart);
      } finally {
        loading = false;
      }
    }
    void update();
    const interval = window.setInterval(update, 3000);
    window.addEventListener("focus", update);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", update);
    };
  }, [selected, userId, identityKey, session?.csrf]);

  useEffect(() => {
    if (session && !session.user && selected) setParams({}, { replace: true });
  }, [session?.user?.id, selected, setParams]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [selected, messages.at(-1)?.id]);

  async function start(peerId: string) {
    const identityAtStart = identityKey;
    if (!identityAtStart) return;
    setBusy(true);
    setError("");
    try {
      const result = await request<{ id: string }>(
        "messaging/conversations",
        session?.csrf,
        { peerId },
      );
      if (identity.current !== identityAtStart) return;
      await refresh();
      if (identity.current === identityAtStart)
        setParams({ conversation: result.id });
    } catch (reason) {
      handleFailure(reason, identityAtStart);
    } finally {
      if (identity.current === identityAtStart) setBusy(false);
    }
  }

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    const identityAtStart = identityKey;
    if (!identityAtStart || groupMembers.length < 2) return;
    setBusy(true);
    setError("");
    try {
      const result = await request<{ id: string }>(
        "messaging/groups",
        session?.csrf,
        { name: groupName, memberIds: groupMembers },
      );
      if (identity.current !== identityAtStart) return;
      setGroupName("");
      setGroupMembers([]);
      await refresh();
      if (identity.current === identityAtStart)
        setParams({ conversation: result.id });
    } catch (reason) {
      handleFailure(reason, identityAtStart);
    } finally {
      if (identity.current === identityAtStart) setBusy(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy || !selected) return;
    const target = selected;
    const identityAtStart = identityKey;
    if (!identityAtStart) return;
    setBusy(true);
    setError("");
    try {
      const message = await request<Message>(
        `messaging/conversations/${target}/messages`,
        session?.csrf,
        { body: draft },
      );
      if (active.current === target && identity.current === identityAtStart) {
        setMessages((previous) => [
          ...previous.filter((item) => item.id !== message.id),
          message,
        ]);
        setDraft("");
      }
      if (identity.current === identityAtStart) await refresh();
    } catch (reason) {
      if (active.current === target) handleFailure(reason, identityAtStart);
    } finally {
      if (identity.current === identityAtStart) setBusy(false);
    }
  }

  async function loadOlder() {
    const target = selected;
    const identityAtStart = identityKey;
    if (!target || !identityAtStart || !messages.length) return;
    setBusy(true);
    try {
      const batch = await request<Message[]>(
        `messaging/conversations/${target}/messages?before=${messages[0].id}`,
      );
      if (active.current !== target || identity.current !== identityAtStart)
        return;
      setMessages((previous) =>
        [...new Map([...batch, ...previous].map((message) => [message.id, message])).values()],
      );
      setOlder(batch.length < 100);
    } catch (reason) {
      handleFailure(reason, identityAtStart);
    } finally {
      if (identity.current === identityAtStart) setBusy(false);
    }
  }

  const conversationName = (item: Conversation) =>
    item.kind === "group"
      ? item.group_name || "Private group"
      : labels.get(item.peer_id || "") || item.peer_name || "Fellow";
  const membersText = group?.members
    .map((member) => groupLabels.get(member.id) || member.name)
    .join(", ");

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FELLOWSHIP COMMUNITY</span>
          <h1>Messages</h1>
          <p>Private conversations with approved Fellowship members.</p>
        </div>
      </div>
      {(error || connectionError) && (
        <p className="error" role="alert">
          {error || connectionError}{" "}
          {!session?.accessDenied && (
            <button onClick={() => void refresh()}>Retry connection</button>
          )}
        </p>
      )}
      {!session ? (
        <p role="status">Connecting to messaging…</p>
      ) : !session.user ? (
        <section className="card">
          <MessageCircle size={32} />
          <h2>Messages use your hub sign-in</h2>
          <p>
            {session.accessDenied
              ? "Your verified hub sign-in or approved enrollment is no longer available. Sign in through the hub again or contact the administrator."
              : session.configured
                ? "Messaging is available through the same verified Clerk account you use for the hub."
                : "Private messaging is disabled until its shared database is ready and an administrator activates it."}
          </p>
          <p>There is no separate messaging account or demo access.</p>
          <Link to="/">Back to the hub</Link>
        </section>
      ) : (
        <>
          <div className="message-account">
            <span>
              Signed in through the hub as <strong>{session.user.name}</strong>
              {" · "}Updates automatically
            </span>
          </div>
          <div className={`messenger ${selected ? "has-conversation" : ""}`}>
            <aside className="message-inbox" aria-label="Inbox">
              <h2>
                Inbox{" "}
                <span className="unread-badge">
                  {conversations.reduce((count, item) => count + item.unread, 0)}
                </span>
              </h2>
              <label className="new-message">
                New one-to-one conversation
                <select
                  aria-label="Message a fellow"
                  value=""
                  disabled={busy}
                  onChange={(event) => {
                    if (event.target.value) void start(event.target.value);
                  }}
                >
                  <option value="">Choose a verified member</option>
                  {people.map((person) => (
                    <option value={person.id} key={person.id}>
                      {labels.get(person.id) || person.name}
                    </option>
                  ))}
                </select>
              </label>
              <form className="group-create" onSubmit={createGroup}>
                <h3>
                  <Users size={18} /> Create a private group
                </h3>
                <p className="muted">
                  You are included. Choose at least two other verified members.
                  Membership is fixed after creation.
                </p>
                <label>
                  Group name
                  <input
                    aria-label="Group name"
                    value={groupName}
                    maxLength={80}
                    required
                    onChange={(event) => setGroupName(event.target.value)}
                  />
                </label>
                <fieldset className="group-member-picker" disabled={busy}>
                  <legend>Group members</legend>
                  {people.map((person) => (
                    <label className="check" key={person.id}>
                      <input
                        type="checkbox"
                        checked={groupMembers.includes(person.id)}
                        onChange={(event) =>
                          setGroupMembers((selectedIds) =>
                            event.target.checked
                              ? [...selectedIds, person.id]
                              : selectedIds.filter((id) => id !== person.id),
                          )
                        }
                      />
                      <span>{labels.get(person.id) || person.name}</span>
                    </label>
                  ))}
                  {!people.length && (
                    <p className="muted">Members appear after verified sign-in and completing their first and last name.</p>
                  )}
                </fieldset>
                <button
                  className="primary small"
                  type="submit"
                  disabled={busy || !groupName.trim() || groupMembers.length < 2}
                >
                  Create group
                </button>
              </form>
              {!conversations.length && (
                <p className="muted">No conversations yet.</p>
              )}
              {conversations.map((item) => {
                const name = conversationName(item);
                return (
                  <button
                    className={`inbox-item ${item.id === selected ? "selected" : ""}`}
                    key={item.id}
                    onClick={() => setParams({ conversation: item.id })}
                  >
                    <Avatar name={name} id={item.peer_id || item.id} />
                    <span className="inbox-preview">
                      <strong>{name}</strong>
                      <small>
                        {item.last_body ||
                          (item.kind === "group"
                            ? "Private group"
                            : "Start a conversation")}
                      </small>
                    </span>
                    <span className="inbox-meta">
                      {item.last_at && (
                        <time>
                          {new Date(item.last_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                      )}
                      {item.unread > 0 && (
                        <span
                          className="unread-badge"
                          aria-label={`${item.unread} unread`}
                        >
                          {item.unread}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </aside>
            <section className="message-conversation" aria-label="Conversation">
              {!selected ? (
                <div className="message-placeholder">
                  <MessageCircle size={48} />
                  <h2>A little closer, wherever you are</h2>
                  <p>Select a conversation or start one above.</p>
                </div>
              ) : (
                <>
                  <header className="conversation-header">
                    <button
                      aria-label="Back to inbox"
                      onClick={() => setParams({})}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <Avatar
                      name={
                        conversation
                          ? conversationName(conversation)
                          : "Fellowship members"
                      }
                      id={conversation?.peer_id || selected}
                    />
                    <div className="conversation-title">
                      <strong>
                        {conversation
                          ? conversationName(conversation)
                          : "Conversation"}
                      </strong>
                      <small>
                        {isGroup
                          ? `Private group · ${group?.members.length ?? "…"} members`
                          : "Private · One-to-one"}
                      </small>
                      {isGroup && group && (
                        <small className="group-member-list">
                          Members: {membersText}
                        </small>
                      )}
                    </div>
                  </header>
                  <div
                    className="message-history"
                    role="log"
                    aria-label="Message history"
                    aria-live="polite"
                  >
                    {!loaded && !error && (
                      <p role="status">Loading conversation…</p>
                    )}
                    {messages.length >= 100 && !older && (
                      <button disabled={busy} onClick={() => void loadOlder()}>
                        Load earlier messages
                      </button>
                    )}
                    {loaded && !messages.length && (
                      <p className="message-placeholder">
                        Start the conversation with a hello.
                      </p>
                    )}
                    {messages.map((message) => {
                      const outgoing = message.sender_id === userId;
                      const sender = groupLabels.get(message.sender_id) ||
                        message.sender_name ||
                        "Fellow";
                      return (
                        <div
                          className={`message-bubble ${outgoing ? "outgoing" : "incoming"}`}
                          key={message.id}
                        >
                          {isGroup && !outgoing && (
                            <strong className="message-sender">{sender}</strong>
                          )}
                          <p>{message.body}</p>
                          <time dateTime={message.created_at}>
                            {new Date(message.created_at).toLocaleString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </time>
                        </div>
                      );
                    })}
                    <div ref={bottom} />
                  </div>
                  <form className="message-composer" onSubmit={send}>
                    <label className="sr-only" htmlFor="message-text">
                      Message
                    </label>
                    <textarea
                      id="message-text"
                      placeholder="Type a message…"
                      value={draft}
                      maxLength={4000}
                      disabled={!loaded || busy}
                      rows={2}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          void send(event);
                        }
                      }}
                    />
                    <button
                      className="primary"
                      type="submit"
                      disabled={!loaded || busy || !draft.trim()}
                    >
                      <Send size={18} />
                      <span>Send</span>
                    </button>
                  </form>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
