import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { isAuthorizationFailure, request, useMessaging, type Fellow, type Message } from '../data/messaging';
import Avatar from '../components/Avatar';
import '../styles/messages.css';
export default function Messages() {
  const {session,conversations,error:connectionError,refresh,invalidate} = useMessaging();
  const [params,setParams] = useSearchParams();
  const selected = params.get('conversation');
  const conversation = conversations.find(c => c.id === selected);
  const [people,setPeople] = useState<Fellow[]>([]);
  const [messages,setMessages] = useState<Message[]>([]);
  const [draft,setDraft] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [loaded,setLoaded] = useState(false);
  const [older,setOlder] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const active = useRef(selected);
  active.current = selected;
  const userId = session?.user?.id;
  const identityKey = session?.user ? `${session.user.id}:${session.csrf || ''}` : null;
  const identity = useRef<string|null>(identityKey);
  identity.current = identityKey;
  function handleFailure(reason:unknown, expectedIdentity: string|null) {
    if (identity.current !== expectedIdentity) return;
    if (isAuthorizationFailure(reason)) {
      invalidate(reason.message);
      return;
    }
    setError(reason instanceof Error ? reason.message : 'Connection interrupted. Check your connection and retry.');
  }
  useEffect(() => {
    if (!userId || !identityKey) {
      setPeople([]); setMessages([]); setDraft(''); setBusy(false); setLoaded(false); setOlder(false);
      return;
    }
    const identityAtStart = identityKey;
    let cancelled = false;
    request<Fellow[]>('messaging/users')
      .then(users => { if (!cancelled && identity.current === identityAtStart) setPeople(users); })
      .catch(e => { if (!cancelled) handleFailure(e,identityAtStart); });
    return () => { cancelled = true; };
  },[userId,identityKey,conversations.length]);
  useEffect(() => {
    setMessages([]); setDraft(''); setLoaded(false); setError(''); setOlder(false); setBusy(false);
    if (!selected || !userId || !identityKey) return;
    const identityAtStart = identityKey;
    let cancelled = false;
    let loading = false;
    async function update() {
      if (loading || document.visibilityState !== 'visible') return;
      loading = true;
      try {
        const latest = await request<Message[]>(`messaging/conversations/${selected}/messages`);
        if (cancelled || identity.current !== identityAtStart) return;
        setMessages(previous => {
          const byId = new Map(previous.map(m => [m.id,m]));
          latest.forEach(m => byId.set(m.id,m));
          return [...byId.values()].sort((a,b) => BigInt(a.id)<BigInt(b.id) ? -1 : 1);
        });
        setLoaded(true); setError('');
        if (latest.length && document.hasFocus()) {
          await request(`messaging/conversations/${selected}/read`,session?.csrf,{through:latest.at(-1)!.id});
          if (!cancelled && identity.current === identityAtStart) await refresh();
        }
      } catch(e) { if (!cancelled) handleFailure(e,identityAtStart); }
      finally { loading = false; }
    }
    void update();
    const interval = window.setInterval(update,3000);
    window.addEventListener('focus',update);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener('focus',update); };
  },[selected,userId,identityKey,session?.csrf]);
  useEffect(() => {
    if (session && !session.user && selected)
      setParams({}, {replace:true});
  },[session?.user?.id,selected,setParams]);
  useEffect(() => { bottom.current?.scrollIntoView({block:'nearest'}); },[selected,messages.at(-1)?.id]);
  async function start(peerId:string) {
    const identityAtStart = identityKey;
    if (!identityAtStart) return;
    setBusy(true); setError('');
    try {
      const c = await request<{id:string}>('messaging/conversations',session?.csrf,{peerId});
      if (identity.current !== identityAtStart) return;
      await refresh();
      if (identity.current === identityAtStart) setParams({conversation:c.id});
    } catch(e) { handleFailure(e,identityAtStart); }
    finally { if (identity.current === identityAtStart) setBusy(false); }
  }
  async function send(event:FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy || !selected) return;
    const target = selected;
    const identityAtStart = identityKey;
    if (!identityAtStart) return;
    setBusy(true); setError('');
    try {
      const message = await request<Message>(`messaging/conversations/${target}/messages`,session?.csrf,{body:draft});
      if (active.current === target && identity.current === identityAtStart) {
        setMessages(previous => [...previous.filter(m => m.id !== message.id),message]); setDraft('');
      }
      if (identity.current === identityAtStart) await refresh();
    } catch(e) { if (active.current === target) handleFailure(e,identityAtStart); }
    finally { if (identity.current === identityAtStart) setBusy(false); }
  }
  async function loadOlder() {
    const target = selected;
    const identityAtStart = identityKey;
    if (!target || !identityAtStart || !messages.length) return;
    setBusy(true);
    try {
      const batch = await request<Message[]>(`messaging/conversations/${target}/messages?before=${messages[0].id}`);
      if (active.current !== target || identity.current !== identityAtStart) return;
      setMessages(previous => [...new Map([...batch,...previous].map(m => [m.id,m])).values()]);
      setOlder(batch.length < 100);
    } catch(e) { handleFailure(e,identityAtStart); }
    finally { if (identity.current === identityAtStart) setBusy(false); }
  }
  return <>
    <div className="page-heading"><div><span className="eyebrow">FELLOWSHIP COMMUNITY</span><h1>Messages</h1><p>One-to-one conversations with your fellow members.</p></div></div>
    {(error || connectionError) && <p className="error" role="alert">{error || connectionError} {!session?.accessDenied && <button onClick={() => void refresh()}>Retry connection</button>}</p>}
    {!session ? <p role="status">Connecting to messaging…</p> : !session.user ? <section className="card">
      <MessageCircle size={32}/><h2>Messages use your hub sign-in</h2>
      <p>{session.accessDenied ? 'Your verified hub sign-in or approved enrollment is no longer available. Sign in through the hub again or contact the administrator.' : session.configured ? 'Messaging is available through the same verified Clerk account you use for the hub.' : 'Private messaging is disabled until its shared database is ready and an administrator activates it.'}</p>
      <p>There is no separate messaging account or demo access.</p><Link to="/">Back to the hub</Link>
    </section> : <>
      <div className="message-account"><span>Signed in through the hub as <strong>{session.user.name}</strong> · Updates automatically</span></div>
      <div className={`messenger ${selected ? 'has-conversation' : ''}`}>
        <aside className="message-inbox" aria-label="Inbox">
          <h2>Inbox <span className="unread-badge">{conversations.reduce((n,c) => n+c.unread,0)}</span></h2>
          <label className="new-message">New conversation<select aria-label="Message a fellow" value="" disabled={busy} onChange={e => { if(e.target.value) void start(e.target.value); }}><option value="">Choose a verified member</option>{people.map(p => <option value={p.id} key={p.id}>{p.name} · {p.id.slice(0,8)}</option>)}</select></label>
          {!people.length && <p className="muted">Members appear after their first verified sign-in.</p>}
          {!conversations.length && <p className="muted">No conversations yet. Choose a member to say hello.</p>}
          {conversations.map(c => <button className={`inbox-item ${c.id === selected ? 'selected' : ''}`} key={c.id} onClick={() => setParams({conversation:c.id})}>
            <Avatar name={c.peer_name} id={c.peer_id}/><span className="inbox-preview"><strong>{c.peer_name}</strong><small>{c.last_body || 'Start a conversation'}</small></span><span className="inbox-meta">{c.last_at && <time>{new Date(c.last_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time>}{c.unread>0 && <span className="unread-badge" aria-label={`${c.unread} unread`}>{c.unread}</span>}</span>
          </button>)}
        </aside>
        <section className="message-conversation" aria-label="Conversation">
          {!selected ? <div className="message-placeholder"><MessageCircle size={48}/><h2>A little closer, wherever you are</h2><p>Select a conversation or start a new one.</p></div> : <>
            <header className="conversation-header"><button aria-label="Back to inbox" onClick={() => setParams({})}><ArrowLeft size={18}/></button><Avatar name={conversation?.peer_name || 'Fellow'} id={conversation?.peer_id || ''}/><div><strong>{conversation?.peer_name || 'Conversation'}</strong><small>Private · One-to-one</small></div></header>
            <div className="message-history" role="log" aria-label="Message history" aria-live="polite">
              {!loaded && !error && <p role="status">Loading conversation…</p>}
              {messages.length >= 100 && !older && <button disabled={busy} onClick={() => void loadOlder()}>Load earlier messages</button>}
              {loaded && !messages.length && <p className="message-placeholder">Start the conversation with a hello.</p>}
              {messages.map(m => <div className={`message-bubble ${m.sender_id === userId ? 'outgoing' : 'incoming'}`} key={m.id}><p>{m.body}</p><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></div>)}
              <div ref={bottom}/>
            </div>
            <form className="message-composer" onSubmit={send}><label className="sr-only" htmlFor="message-text">Message</label><textarea id="message-text" placeholder="Type a message…" value={draft} maxLength={4000} disabled={!loaded || busy} rows={2} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {e.preventDefault(); void send(e);} }}/><button className="primary" type="submit" disabled={!loaded || busy || !draft.trim()}><Send size={18}/><span>Send</span></button></form>
          </>}
        </section>
      </div>
    </>}
  </>;
}
