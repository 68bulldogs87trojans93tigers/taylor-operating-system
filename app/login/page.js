'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '../../lib/supabase';

export default function LoginPage(){
 const router=useRouter(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
 useEffect(()=>{getSupabase().auth.getSession().then(({data})=>{if(data.session) router.replace('/dashboard')})},[router]);
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');const result=await getSupabase().auth.signInWithPassword({email,password});setBusy(false);if(result.error)setMessage(result.error.message);else router.replace('/dashboard');}
 return <div className="loginPage"><form className="loginCard" onSubmit={submit}><div className="brand large"><span className="logo">F</span><div><strong>Firefly OS</strong><small>Shared project management</small></div></div><h1>Welcome back</h1><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy}>{busy?'Please wait…':'Sign in'}</button><p className="hint">New team members must use the secure invitation sent by a Firefly OS developer.</p>{message&&<div className="alert">{message}</div>}</form></div>
}
