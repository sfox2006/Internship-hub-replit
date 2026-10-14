import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
export type Fellow = {id:string;name:string};
export type Conversation = {id:string;peer_id:string;peer_name:string;last_body:string|null;last_at:string|null;unread:number};
export type Message = {id:string;sender_id:string;body:string;created_at:string};
type Session = {configured:boolean;user:Fellow|null;csrf?:string};
export async function request<T>(path:string, csrf?:string, body?:unknown):Promise<T> {
  const response = await fetch(`/api/${path}`, {method:body === undefined ? 'GET' : 'POST', cache:'no-store',
    headers:body === undefined ? {} : {'Content-Type':'application/json','X-CSRF-Token':csrf || ''},
    body:body === undefined ? undefined : JSON.stringify(body)});
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Unable to connect. Please try again.');
  }
  return response.status === 204 ? undefined as T : response.json();
}
const Context = createContext<{
  session:Session|null; conversations:Conversation[]; error:string; refresh:()=>Promise<void>; logout:()=>Promise<void>;
} | null>(null);
export function MessagingProvider({children}:{children:ReactNode}) {
  const [session,setSession] = useState<Session|null>(null);
  const [conversations,setConversations] = useState<Conversation[]>([]);
  const [error,setError] = useState('');
  const revision = useRef(0);
  async function refresh() {
    const current = ++revision.current;
    try {
      const next = await request<Session>('auth/session');
      const inbox = next.user ? await request<Conversation[]>('messaging/conversations') : [];
      if (current !== revision.current) return;
      setSession(next);
      setConversations(inbox);
      setError('');
    } catch(e) { if (current === revision.current) setError((e as Error).message); }
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
    ++revision.current;
    await request('auth/logout',session?.csrf,{});
    ++revision.current;
    setSession({configured:true,user:null}); setConversations([]);
  }
  return <Context.Provider value={{session,conversations,error,refresh,logout}}>{children}</Context.Provider>;
}
export function useMessaging() {
  const value = useContext(Context);
  if (!value) throw new Error('MessagingProvider required');
  return value;
}
