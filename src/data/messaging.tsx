import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
export type Fellow = {id:string;name:string};
export type Conversation = {id:string;peer_id:string;peer_name:string;last_body:string|null;last_at:string|null;unread:number};
export type Message = {id:string;sender_id:string;body:string;created_at:string};
type Session = {
  configured:boolean;
  user:Fellow|null;
  csrf?:string;
  accessDenied?:boolean;
};
export class MessagingRequestError extends Error {
  constructor(message:string,readonly status:number|null) {
    super(message);
    this.name = 'MessagingRequestError';
  }
}
export function isAuthorizationFailure(error:unknown):error is MessagingRequestError {
  return error instanceof MessagingRequestError && (error.status === 401 || error.status === 403);
}
export async function request<T>(path:string, csrf?:string, body?:unknown):Promise<T> {
  let response:Response;
  try {
    response = await fetch(`/api/${path}`, {method:body === undefined ? 'GET' : 'POST', cache:'no-store',
      headers:body === undefined ? {} : {'Content-Type':'application/json','X-CSRF-Token':csrf || ''},
      body:body === undefined ? undefined : JSON.stringify(body)});
  } catch {
    throw new MessagingRequestError('Connection interrupted. Check your connection and retry.',null);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = response.status >= 500
      ? 'Messaging is temporarily unavailable. Please retry in a moment.'
      : data.error || 'Unable to connect. Please try again.';
    throw new MessagingRequestError(message,response.status);
  }
  return response.status === 204 ? undefined as T : response.json();
}
const Context = createContext<{
  session:Session|null;
  conversations:Conversation[];
  error:string;
  refresh:()=>Promise<void>;
  logout:()=>Promise<void>;
  invalidate:(message?:string)=>void;
} | null>(null);
export function MessagingProvider({children}:{children:ReactNode}) {
  const [session,setSession] = useState<Session|null>(null);
  const [conversations,setConversations] = useState<Conversation[]>([]);
  const [error,setError] = useState('');
  const revision = useRef(0);
  const identity = useRef<string|null>(null);
  function invalidate(message='') {
    ++revision.current;
    identity.current = null;
    setSession(previous => ({
      configured: previous?.configured ?? true,
      user:null,
      accessDenied:true,
    }));
    setConversations([]);
    setError(message);
  }
  async function refresh() {
    const current = ++revision.current;
    try {
      const next = await request<Session>('auth/session');
      if (current !== revision.current) return;
      const nextIdentity = next.user ? `${next.user.id}:${next.csrf || ''}` : null;
      if (identity.current !== nextIdentity) {
        identity.current = nextIdentity;
        setConversations([]);
      }
      if (!next.user) {
        setSession({...next,accessDenied:false});
        setConversations([]);
        setError('');
        return;
      }
      setSession({...next,accessDenied:false});
      const inbox = await request<Conversation[]>('messaging/conversations');
      if (current !== revision.current || identity.current !== nextIdentity) return;
      setConversations(inbox);
      setError('');
    } catch(e) {
      if (current !== revision.current) return;
      if (isAuthorizationFailure(e)) {
        const message = e.status === 401
          ? 'Your hub sign-in ended. Sign in again to continue.'
          : e.message;
        invalidate(message);
      } else {
        setError((e as Error).message || 'Messaging connection interrupted. Retry in a moment.');
      }
    }
  }
  useEffect(() => {
    void refresh();
    const tick = () => { if (document.visibilityState === 'visible') void refresh(); };
    const interval = window.setInterval(tick,5000);
    window.addEventListener('focus',tick);
    document.addEventListener('visibilitychange',tick);
    return () => { clearInterval(interval); window.removeEventListener('focus',tick); document.removeEventListener('visibilitychange',tick); };
  },[]);
  async function logout() {
    const csrf = session?.csrf;
    invalidate();
    await request('auth/logout',csrf,{});
  }
  return <Context.Provider value={{session,conversations,error,refresh,logout,invalidate}}>{children}</Context.Provider>;
}
export function useMessaging() {
  const value = useContext(Context);
  if (!value) throw new Error('MessagingProvider required');
  return value;
}
