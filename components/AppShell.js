'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';

const links = [
  ['/dashboard','Dashboard'], ['/tasks','Tasks'], ['/mortgage','Mortgage'],
  ['/businesses','Businesses'], ['/team','Team'], ['/meetings','Meetings']
];

export default function AppShell({ children, title, subtitle }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
      else { setEmail(data.session.user.email || ''); setReady(true); }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  async function signOut() {
    await getSupabase().auth.signOut();
    router.replace('/login');
  }

  if (!ready) return <div className="center"><div className="card">Loading workspace…</div></div>;
  return <div className="appShell">
    <aside className="sidebar">
      <div className="brand"><span className="logo">T</span><div><strong>Taylor OS</strong><small>Operating System</small></div></div>
      <nav>{links.map(([href,label]) => <Link key={href} href={href} className={pathname===href?'active':''}>{label}</Link>)}</nav>
      <div className="sidebarFoot"><small>{email}</small><button className="ghost" onClick={signOut}>Sign out</button></div>
    </aside>
    <main className="main">
      <header className="pageHeader"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></header>
      {children}
    </main>
  </div>;
}
