'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';

const mainLinks = [
  ['/dashboard','Dashboard'],
  ['/coo','AI COO'],
  ['/tasks','Tasks'],
  ['/businesses','Businesses'],
  ['/team','Team'],
  ['/meetings','Meetings']
];

const businessLinks = [
  ['Firefly Mortgage','Firefly Mortgage'],
  ['Medical','Medical'],
  ['NP Franchise','NP Franchise'],
  ['Construction','Construction'],
  ['Lake House','Lake House'],
  ['Boba Tea','Boba Tea'],
  ['Cross-Business / AI','Cross-Business / AI']
];

export default function AppShell({ children, title, subtitle }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [businessesOpen, setBusinessesOpen] = useState(true);

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
      <div className="brand"><span className="logo">F</span><div><strong>Firefly OS</strong><small>Operating System</small></div></div>
      <nav>
        {mainLinks.map(([href,label]) => {
          const active = pathname === href;
          if (href === '/businesses') {
            return <div key={href} className="navGroup">
              <div className="navGroupRow">
                <Link href={href} className={active?'active':''}>{label}</Link>
                <button type="button" className="navToggle" aria-label="Toggle businesses" onClick={()=>setBusinessesOpen(!businessesOpen)}>{businessesOpen?'▾':'▸'}</button>
              </div>
              {businessesOpen && <div className="subnav">
                {businessLinks.map(([area,name]) => <Link key={area} href={`/businesses?area=${encodeURIComponent(area)}`}>{name}</Link>)}
              </div>}
            </div>;
          }
          return <Link key={href} href={href} className={active?'active':''}>{label}</Link>;
        })}
      </nav>
      <div className="sidebarFoot"><small>{email}</small><button className="ghost" onClick={signOut}>Sign out</button></div>
    </aside>
    <main className="main">
      <header className="pageHeader"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></header>
      {children}
    </main>
  </div>;
}
